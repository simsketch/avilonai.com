"""Pipecat bot pipeline using LiveKit transport + Simli avatar.

This bot uses LiveKit for WebRTC transport (instead of Daily) which avoids
the SDK conflict between Daily and Simli (both use different WebRTC implementations).
"""

import asyncio
import os
import certifi
from loguru import logger

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
from pipecat.transports.livekit.transport import LiveKitParams, LiveKitTransport
from pipecat.transcriptions.language import Language
from pipecat.frames.frames import TTSSpeakFrame

from config import Config, SYSTEM_PROMPT, INITIAL_GREETING
from services.crisis_detector import CrisisDetectorProcessor
from services.transcription_sender import TranscriptionSenderProcessor


async def run_livekit_bot(
    livekit_url: str,
    livekit_token: str,
    room_name: str,
    session_id: str = None,
    face_id: str = None,
):
    """
    Run the Pipecat bot using LiveKit transport + Simli avatar.

    Args:
        livekit_url: LiveKit server URL (e.g., wss://your-app.livekit.cloud)
        livekit_token: LiveKit JWT token for authentication
        room_name: LiveKit room name
        session_id: Optional session ID for tracking
        face_id: Simli face ID (from uploaded photo)
    """
    logger.info(f"Starting LiveKit bot for room: {room_name}")

    # Use provided face_id or default
    simli_face_id = face_id or Config.SIMLI_FACE_ID
    logger.info(f"Using Simli face_id: {simli_face_id}")

    # Import and initialize Simli
    # Since we're using LiveKit transport, Simli (which uses LiveKit internally) won't conflict
    from pipecat.services.simli.video import SimliVideoService
    simli_service = SimliVideoService(
        api_key=Config.SIMLI_API_KEY,
        face_id=simli_face_id,
        params=SimliVideoService.InputParams(enable_logging=True),
    )
    logger.info("Simli video service initialized successfully")

    # Create LiveKit transport params
    livekit_params = LiveKitParams(
        audio_out_enabled=True,
        audio_out_sample_rate=24000,
        audio_in_enabled=True,
        audio_in_sample_rate=16000,
        vad_analyzer=SileroVADAnalyzer(),
        video_out_enabled=True,
        video_out_width=512,
        video_out_height=512,
    )

    transport = LiveKitTransport(
        url=livekit_url,
        token=livekit_token,
        room_name=room_name,
        params=livekit_params,
    )

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

    # Create crisis detector
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
    user_transcription_sender = TranscriptionSenderProcessor(name="UserCaptions")
    bot_transcription_sender = TranscriptionSenderProcessor(name="BotCaptions")

    # Build the pipeline
    # Flow: Transport -> STT -> Crisis Detector -> User Captions -> LLM Context -> LLM -> Bot Captions -> TTS -> Simli -> Transport
    pipeline = Pipeline([
        transport.input(),
        stt,
        crisis_detector,
        user_transcription_sender,
        context_aggregator.user(),
        llm,
        bot_transcription_sender,
        tts,
        simli_service,
        transport.output(),
        context_aggregator.assistant(),
    ])

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
    async def on_first_participant_joined(transport, participant_id):
        """Send initial greeting when user joins."""
        logger.info(f"Participant joined: {participant_id}")

        # Wait for Simli connection
        logger.info("Waiting for Simli connection to be ready...")
        await asyncio.sleep(3)
        logger.info("Simli delay complete, starting greeting")

        # Send greeting
        messages.append({"role": "assistant", "content": INITIAL_GREETING})
        await task.queue_frames([TTSSpeakFrame(text=INITIAL_GREETING)])

    @transport.event_handler("on_participant_disconnected")
    async def on_participant_disconnected(transport, participant_id):
        """Handle participant leaving."""
        logger.info(f"Participant left: {participant_id}")
        await task.cancel()

    @transport.event_handler("on_disconnected")
    async def on_disconnected(transport):
        """Handle disconnection."""
        logger.info("Disconnected from LiveKit room")
        await task.cancel()

    # Run the pipeline
    runner = PipelineRunner()
    await runner.run(task)

    logger.info("LiveKit bot session ended")


async def main():
    """Test the bot locally."""
    import sys

    if len(sys.argv) < 4:
        print("Usage: python bot_livekit.py <livekit_url> <token> <room_name> [face_id]")
        sys.exit(1)

    livekit_url = sys.argv[1]
    token = sys.argv[2]
    room_name = sys.argv[3]
    face_id = sys.argv[4] if len(sys.argv) > 4 else None

    await run_livekit_bot(livekit_url, token, room_name, face_id=face_id)


if __name__ == "__main__":
    asyncio.run(main())
