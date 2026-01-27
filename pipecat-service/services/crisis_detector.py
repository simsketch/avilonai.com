"""Crisis detection processor for Pipecat pipeline."""

from pipecat.frames.frames import Frame, TextFrame, LLMMessagesFrame
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection


# Crisis keywords that trigger immediate intervention
CRISIS_KEYWORDS = [
    "suicide",
    "suicidal",
    "kill myself",
    "kill my self",
    "end my life",
    "end it all",
    "want to die",
    "better off dead",
    "no reason to live",
    "self harm",
    "self-harm",
    "hurt myself",
    "hurt my self",
]

CRISIS_RESOURCES = """I'm very concerned about what you've shared. Your safety is the top priority right now.

If you're in immediate danger, please reach out to crisis support:

1. Call 988 - Suicide & Crisis Lifeline (US) - Available 24/7
2. Text "HELLO" to 741741 - Crisis Text Line
3. Go to your nearest emergency room
4. International Crisis Lines: findahelpline.com

You are not alone. Help is available, and people care about you.

I'm here to support you, but I'm not equipped to handle crisis situations. Please reach out to one of these resources. They have trained professionals who can provide the help you need right now."""


def detect_crisis(text: str) -> tuple[bool, list[str]]:
    """
    Detect if text contains crisis keywords.

    Returns:
        Tuple of (is_crisis, detected_keywords)
    """
    lower_text = text.lower()
    detected = []

    for keyword in CRISIS_KEYWORDS:
        if keyword in lower_text:
            detected.append(keyword)

    return len(detected) > 0, detected


class CrisisDetectorProcessor(FrameProcessor):
    """
    Processor that monitors user input for crisis keywords.
    If detected, it can inject crisis resources into the conversation.
    """

    def __init__(self, on_crisis_detected=None):
        super().__init__()
        self._on_crisis_detected = on_crisis_detected
        self._last_crisis_response_time = 0
        self._crisis_cooldown = 60  # seconds between crisis responses

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        """Process frames and detect crisis keywords in user messages."""
        await super().process_frame(frame, direction)

        # Only check incoming user messages (TextFrames going upstream)
        if isinstance(frame, TextFrame) and direction == FrameDirection.UPSTREAM:
            is_crisis, keywords = detect_crisis(frame.text)

            if is_crisis:
                import time
                current_time = time.time()

                # Avoid spamming crisis response
                if current_time - self._last_crisis_response_time > self._crisis_cooldown:
                    self._last_crisis_response_time = current_time

                    # Call optional callback
                    if self._on_crisis_detected:
                        await self._on_crisis_detected(frame.text, keywords)

                    # Log the crisis detection
                    print(f"[CRISIS] Detected keywords: {keywords}")

        # Always pass the frame through
        await self.push_frame(frame, direction)


class CrisisResponseInjector(FrameProcessor):
    """
    Processor that can inject crisis resources into the LLM context
    when crisis is detected.
    """

    def __init__(self):
        super().__init__()
        self._inject_crisis_context = False

    def trigger_crisis_response(self):
        """Flag to inject crisis context on next LLM message."""
        self._inject_crisis_context = True

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        """Process frames and inject crisis context if needed."""
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMMessagesFrame) and self._inject_crisis_context:
            # Add crisis context to the messages
            crisis_message = {
                "role": "system",
                "content": f"IMPORTANT: The user has expressed concerning thoughts. Respond with empathy and include these crisis resources: {CRISIS_RESOURCES}"
            }

            # Insert crisis context before the last user message
            messages = list(frame.messages)
            if messages:
                messages.insert(-1, crisis_message)
                frame = LLMMessagesFrame(messages)

            self._inject_crisis_context = False

        await self.push_frame(frame, direction)
