"""Transcription sender processor for real-time captions."""

from pipecat.frames.frames import (
    Frame,
    TranscriptionFrame,
    InterimTranscriptionFrame,
    TextFrame,
    TTSStartedFrame,
    TTSStoppedFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.transports.daily.transport import DailyOutputTransportMessageFrame
from loguru import logger


class TranscriptionSenderProcessor(FrameProcessor):
    """
    Captures transcription and LLM text frames and sends them
    via Daily transport's app-message for real-time captions.

    Uses DailyOutputTransportMessageFrame to send messages through the pipeline.
    """

    def __init__(self, name: str = "TranscriptionSender", **kwargs):
        super().__init__(**kwargs)
        self._name = name
        self._current_bot_text = ""
        self._is_speaking = False
        logger.info(f"{self._name}: Initialized")

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Log all frames for debugging
        frame_type = type(frame).__name__

        # Capture user speech transcription (from Deepgram STT)
        if isinstance(frame, TranscriptionFrame):
            if frame.text.strip():
                logger.info(f"{self._name}: User final transcription: '{frame.text}'")
                await self._send_caption("user", frame.text, is_final=True)

        elif isinstance(frame, InterimTranscriptionFrame):
            if frame.text.strip():
                logger.debug(f"{self._name}: User interim: '{frame.text}'")
                await self._send_caption("user", frame.text, is_final=False)

        # Capture bot text (from LLM output going to TTS)
        elif isinstance(frame, TextFrame):
            logger.info(f"{self._name}: Bot text chunk: '{frame.text}'")
            # Accumulate bot text
            self._current_bot_text += frame.text
            await self._send_caption("bot", self._current_bot_text, is_final=False)

        elif isinstance(frame, TTSStartedFrame):
            self._is_speaking = True
            logger.debug(f"{self._name}: TTS started")
            await self._send_speaking_state(True)

        elif isinstance(frame, TTSStoppedFrame):
            self._is_speaking = False
            logger.debug(f"{self._name}: TTS stopped")
            # Send final bot caption
            if self._current_bot_text.strip():
                logger.info(f"{self._name}: Bot final caption: '{self._current_bot_text}'")
                await self._send_caption("bot", self._current_bot_text, is_final=True)
            self._current_bot_text = ""
            await self._send_speaking_state(False)

        # Pass the frame through
        await self.push_frame(frame, direction)

    async def _send_caption(self, speaker: str, text: str, is_final: bool):
        """Send caption via Daily app-message frame."""
        try:
            message = {
                "type": "caption",
                "speaker": speaker,
                "text": text,
                "is_final": is_final,
            }
            frame = DailyOutputTransportMessageFrame(message=message)
            logger.info(f"{self._name}: Pushing caption frame downstream - {speaker}: '{text[:50]}...' (final={is_final})")
            await self.push_frame(frame, FrameDirection.DOWNSTREAM)
            logger.info(f"{self._name}: Caption frame pushed successfully")
        except Exception as e:
            logger.error(f"{self._name}: Failed to send caption: {e}", exc_info=True)

    async def _send_speaking_state(self, is_speaking: bool):
        """Send speaking state via Daily app-message frame."""
        try:
            frame = DailyOutputTransportMessageFrame(
                message={
                    "type": "speaking_state",
                    "is_speaking": is_speaking,
                }
            )
            await self.push_frame(frame)
        except Exception as e:
            logger.error(f"{self._name}: Failed to send speaking state: {e}")
