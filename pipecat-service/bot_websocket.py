"""WebSocket-based audio processing for Simli frontend avatars.

This bot processes audio via WebSocket without using Daily or LiveKit.
The Simli avatar rendering happens entirely in the browser using simli-client.

Flow:
1. Frontend captures user audio, sends via WebSocket
2. Backend: Deepgram STT → LLM → Cartesia TTS
3. Backend sends TTS audio back via WebSocket
4. Frontend feeds audio to Simli JS client for avatar rendering
"""

import asyncio
import base64
import os
import certifi
from typing import Optional
from loguru import logger

# Fix SSL certificate issue on macOS
os.environ['SSL_CERT_FILE'] = certifi.where()

from deepgram import LiveOptions
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (
    AudioRawFrame,
    Frame,
    InputAudioRawFrame,
    TextFrame,
    TranscriptionFrame,
    TTSAudioRawFrame,
    TTSSpeakFrame,
    TTSStoppedFrame,
    StartFrame,
    EndFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transcriptions.language import Language

from config import Config, SYSTEM_PROMPT, INITIAL_GREETING


class AudioInputProcessor(FrameProcessor):
    """Receives audio from external source and injects into pipeline."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._audio_queue = asyncio.Queue()

    async def queue_audio(self, audio_data: bytes, sample_rate: int = 16000, channels: int = 1):
        """Queue audio data to be processed by the pipeline."""
        frame = InputAudioRawFrame(
            audio=audio_data,
            sample_rate=sample_rate,
            num_channels=channels,
        )
        await self._audio_queue.put(frame)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)

    async def run_input_loop(self, task: PipelineTask):
        """Continuously read from audio queue and inject frames."""
        while True:
            try:
                frame = await asyncio.wait_for(self._audio_queue.get(), timeout=0.1)
                await task.queue_frame(frame)
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Audio input error: {e}")
                break


class AudioOutputCapture(FrameProcessor):
    """Captures TTS audio frames and sends them via callback."""

    def __init__(self, on_audio: callable, **kwargs):
        super().__init__(**kwargs)
        self._on_audio = on_audio

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, TTSAudioRawFrame):
            # Send audio to callback
            await self._on_audio({
                "type": "audio",
                "data": base64.b64encode(frame.audio).decode(),
                "sample_rate": frame.sample_rate,
                "channels": frame.num_channels,
            })

        elif isinstance(frame, TextFrame):
            # Send text for captions
            await self._on_audio({
                "type": "text",
                "text": frame.text,
            })

        elif isinstance(frame, TranscriptionFrame):
            # Send user transcription
            await self._on_audio({
                "type": "transcription",
                "text": frame.text,
                "is_final": True,
            })

        elif isinstance(frame, TTSStoppedFrame):
            # Signal end of bot response
            await self._on_audio({
                "type": "bot_response_end",
            })

        await self.push_frame(frame, direction)


async def handle_websocket_session(websocket, session_id: str = None, face_id: str = None):
    """Handle a WebSocket session for audio processing."""

    logger.info(f"Starting WebSocket session: {session_id}, face_id: {face_id}")

    # Callback to send messages via WebSocket
    async def send_message(message: dict):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {e}")

    # Create STT service (Deepgram)
    live_options = LiveOptions(
        model="nova-2",
        language=Language.EN_US,
        smart_format=True,
        punctuate=True,
        interim_results=True,
        vad_events=False,
    )

    stt = DeepgramSTTService(
        api_key=Config.DEEPGRAM_API_KEY,
        live_options=live_options,
    )

    # Create LLM service (OpenRouter)
    llm = OpenAILLMService(
        api_key=Config.OPENROUTER_API_KEY,
        base_url=Config.OPENROUTER_BASE_URL,
        model=Config.LLM_MODEL,
    )

    # Create TTS service (Cartesia)
    tts = CartesiaTTSService(
        api_key=Config.CARTESIA_API_KEY,
        voice_id=Config.CARTESIA_VOICE_ID,
    )

    # Create audio input/output processors
    audio_input = AudioInputProcessor()
    audio_output = AudioOutputCapture(on_audio=send_message)

    # Create conversation context
    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
    ]

    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)

    # Build the pipeline
    pipeline = Pipeline([
        stt,
        context_aggregator.user(),
        llm,
        tts,
        audio_output,
        context_aggregator.assistant(),
    ])

    # Create pipeline task
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    # Send ready message with face_id for frontend to use
    await send_message({
        "type": "ready",
        "face_id": face_id or Config.SIMLI_FACE_ID,
    })

    # Start the pipeline
    runner = PipelineRunner()
    pipeline_task = asyncio.create_task(runner.run(task))

    # Start audio input loop
    input_task = asyncio.create_task(audio_input.run_input_loop(task))

    # Wait for pipeline to start
    await asyncio.sleep(0.5)

    # Send initial greeting
    messages.append({"role": "assistant", "content": INITIAL_GREETING})

    # Send greeting text
    await send_message({
        "type": "greeting",
        "text": INITIAL_GREETING,
    })

    # Generate TTS for greeting
    await task.queue_frame(TTSSpeakFrame(text=INITIAL_GREETING))

    try:
        # Process incoming WebSocket messages
        async for message in websocket.iter_json():
            msg_type = message.get("type")

            if msg_type == "audio":
                # Decode and queue audio frame
                audio_data = base64.b64decode(message["data"])
                sample_rate = message.get("sample_rate", 16000)
                channels = message.get("channels", 1)

                await audio_input.queue_audio(audio_data, sample_rate, channels)

            elif msg_type == "stop":
                logger.info("Received stop message")
                break

            elif msg_type == "interrupt":
                # Handle user interruption
                await task.queue_frame(UserStartedSpeakingFrame())

    except Exception as e:
        logger.error(f"WebSocket error: {e}")

    finally:
        # Cleanup
        input_task.cancel()
        await task.cancel()
        pipeline_task.cancel()
        try:
            await input_task
        except asyncio.CancelledError:
            pass
        try:
            await pipeline_task
        except asyncio.CancelledError:
            pass

    logger.info(f"WebSocket session ended: {session_id}")
