"""Pipecat bot pipeline for real-time conversational AI therapy."""

import asyncio
import os
import certifi
from loguru import logger
from typing import Literal

# Fix SSL certificate issue on macOS
os.environ['SSL_CERT_FILE'] = certifi.where()

from deepgram import LiveOptions
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.daily.transport import DailyParams, DailyTransport
from pipecat.transcriptions.language import Language
from pipecat.frames.frames import (
    TTSSpeakFrame,
    TTSAudioRawFrame,
    OutputImageRawFrame,
    Frame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from config import Config, SYSTEM_PROMPT, INITIAL_GREETING


class DebugFrameLogger(FrameProcessor):
    """Debug processor to log specific frame types passing through."""

    def __init__(self, name: str = "DebugLogger", **kwargs):
        super().__init__(**kwargs)
        self._name = name
        self._audio_frame_count = 0
        self._video_frame_count = 0
        self._other_frame_count = 0

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Log TTS audio frames
        if isinstance(frame, TTSAudioRawFrame):
            self._audio_frame_count += 1
            if self._audio_frame_count <= 5 or self._audio_frame_count % 50 == 0:
                logger.info(
                    f"{self._name}: TTSAudioRawFrame #{self._audio_frame_count} - "
                    f"sample_rate={frame.sample_rate}, "
                    f"channels={frame.num_channels}, "
                    f"bytes={len(frame.audio)}"
                )

        # Log video frames
        elif isinstance(frame, OutputImageRawFrame):
            self._video_frame_count += 1
            if self._video_frame_count <= 5 or self._video_frame_count % 30 == 0:
                logger.info(
                    f"{self._name}: OutputImageRawFrame #{self._video_frame_count} - "
                    f"size={frame.size}, format={frame.format}"
                )

        # Log other important frame types
        else:
            frame_type = type(frame).__name__
            # Only log interesting frames, skip common internal frames
            if frame_type in ['TTSSpeakFrame', 'TextFrame', 'StartFrame', 'EndFrame',
                              'TTSStartedFrame', 'TTSStoppedFrame', 'ErrorFrame']:
                logger.info(f"{self._name}: {frame_type} - direction={direction}")

        await self.push_frame(frame, direction)
from services.crisis_detector import CrisisDetectorProcessor
from services.transcription_sender import TranscriptionSenderProcessor

# Avatar type alias
AvatarType = Literal["simli", "sprite", "rpm"]


async def run_bot(
    room_url: str,
    token: str,
    session_id: str = None,
    avatar_type: AvatarType = "sprite"
):
    """
    Run the Pipecat bot in a Daily.co room.

    Args:
        room_url: Daily.co room URL
        token: Daily.co room token
        session_id: Optional session ID for tracking
        avatar_type: "simli" for photorealistic, "sprite" for client-side, "rpm" for Ready Player Me
    """
    logger.info(f"Starting bot for room: {room_url} with avatar: {avatar_type}")

    # Import Simli if needed
    simli_service = None
    if avatar_type == "simli":
        try:
            from pipecat.services.simli.video import SimliVideoService
            logger.info(f"Initializing Simli with face_id: {Config.SIMLI_FACE_ID}")
            # Use keyword arguments as required by Pipecat 0.0.100
            # Enable logging to debug video generation
            simli_service = SimliVideoService(
                api_key=Config.SIMLI_API_KEY,
                face_id=Config.SIMLI_FACE_ID,
                params=SimliVideoService.InputParams(enable_logging=True),
            )
            logger.info("Simli video service initialized successfully")
        except ImportError as e:
            logger.error(f"Failed to import Simli: {e}")
            avatar_type = "sprite"  # Fallback
        except Exception as e:
            logger.error(f"Failed to initialize Simli: {e}")
            avatar_type = "sprite"  # Fallback

    # Create Daily.co transport params
    daily_params = {
        "audio_out_enabled": True,
        "audio_out_sample_rate": 24000,
        "audio_in_enabled": True,
        "audio_in_sample_rate": 16000,
        "vad_enabled": True,
        "vad_analyzer": SileroVADAnalyzer(),
        "vad_audio_passthrough": True,
        "transcription_enabled": False,  # We use Deepgram directly
    }

    # Add video params only for Simli
    if avatar_type == "simli":
        daily_params["video_out_enabled"] = True
        daily_params["video_out_is_live"] = True  # Critical for live video streaming!
        daily_params["video_out_width"] = 512
        daily_params["video_out_height"] = 512

    transport = DailyTransport(
        room_url,
        token,
        "Avilon",  # Bot display name
        DailyParams(**daily_params),
    )

    # Create STT service (Deepgram) using LiveOptions
    live_options = LiveOptions(
        model="nova-2",
        language=Language.EN_US,
        smart_format=True,
        punctuate=True,
        interim_results=True,
        vad_events=False,  # Use pipeline VAD instead
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

    # Create crisis detector processor
    crisis_detector = CrisisDetectorProcessor(
        on_crisis_detected=lambda text, keywords: logger.warning(
            f"Crisis detected in session {session_id}: {keywords}"
        )
    )

    # Create conversation context
    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
    ]

    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)

    # Create transcription senders for captions
    # One for user transcriptions (after STT), one for bot text (after LLM)
    user_transcription_sender = TranscriptionSenderProcessor(name="UserCaptions")
    bot_transcription_sender = TranscriptionSenderProcessor(name="BotCaptions")

    # Build the pipeline based on avatar type
    # Flow: Transport -> STT -> Crisis Detector -> User Captions -> LLM Context -> LLM -> Bot Captions -> TTS -> [Simli?] -> Transport
    pipeline_processors = [
        transport.input(),
        stt,
        crisis_detector,
        user_transcription_sender,  # Captures user speech transcriptions
        context_aggregator.user(),
        llm,
        bot_transcription_sender,  # Captures bot LLM text output
        tts,
    ]

    # Add Simli video processing for photorealistic avatar
    if simli_service:
        # Add debug logger BEFORE Simli to see TTS audio frames
        pre_simli_logger = DebugFrameLogger(name="PreSimli")
        pipeline_processors.append(pre_simli_logger)
        pipeline_processors.append(simli_service)
        # Add debug logger AFTER Simli to see video frames
        post_simli_logger = DebugFrameLogger(name="PostSimli")
        pipeline_processors.append(post_simli_logger)
        logger.info("Added Simli to pipeline with debug loggers")

    pipeline_processors.extend([
        transport.output(),
        context_aggregator.assistant(),
    ])

    pipeline = Pipeline(pipeline_processors)

    # Create and run the pipeline task
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport, participant):
        """Send initial greeting when user joins."""
        logger.info(f"Participant joined: {participant['id']}")

        # Wait for Simli WebSocket connection to be established
        # Simli needs time to connect before receiving audio frames
        if simli_service:
            logger.info("Waiting for Simli connection to be ready...")
            await asyncio.sleep(3)  # Give Simli time to establish WebSocket
            logger.info("Simli delay complete, starting greeting")

        # Trigger initial greeting through TTS
        # Add greeting to context for conversation history
        messages.append({"role": "assistant", "content": INITIAL_GREETING})
        # Queue the greeting to be spoken
        logger.info(f"Queuing greeting TTSSpeakFrame: '{INITIAL_GREETING[:50]}...'")
        try:
            await task.queue_frames([TTSSpeakFrame(text=INITIAL_GREETING)])
            logger.info("TTSSpeakFrame queued successfully")
        except Exception as e:
            logger.error(f"Failed to queue TTSSpeakFrame: {e}", exc_info=True)

    @transport.event_handler("on_participant_left")
    async def on_participant_left(transport, participant, reason):
        """Handle participant leaving."""
        logger.info(f"Participant left: {participant['id']}, reason: {reason}")
        await task.cancel()

    @transport.event_handler("on_call_state_updated")
    async def on_call_state_updated(transport, state):
        """Handle call state changes."""
        logger.info(f"Call state updated: {state}")
        if state == "left":
            await task.cancel()

    # Run the pipeline
    runner = PipelineRunner()
    await runner.run(task)

    logger.info("Bot session ended")


async def main():
    """Test the bot locally (for development)."""
    import sys

    if len(sys.argv) < 3:
        print("Usage: python bot.py <room_url> <token>")
        sys.exit(1)

    room_url = sys.argv[1]
    token = sys.argv[2]

    await run_bot(room_url, token)


if __name__ == "__main__":
    asyncio.run(main())
