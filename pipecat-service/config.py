"""Configuration management for Pipecat service."""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuration settings loaded from environment variables."""

    # Daily.co WebRTC
    DAILY_API_KEY: str = os.getenv("DAILY_API_KEY", "")
    DAILY_API_URL: str = "https://api.daily.co/v1"

    # Deepgram STT
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")

    # OpenRouter LLM
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    LLM_MODEL: str = os.getenv("LLM_MODEL", "deepseek/deepseek-r1-distill-llama-70b")

    # Cartesia TTS
    CARTESIA_API_KEY: str = os.getenv("CARTESIA_API_KEY", "")
    # Calm, soothing female voice suitable for therapy
    CARTESIA_VOICE_ID: str = os.getenv(
        "CARTESIA_VOICE_ID", "79a125e8-cd45-4c13-8a67-188112f4dd22"  # "Sophia" voice
    )

    # Simli photorealistic avatar
    SIMLI_API_KEY: str = os.getenv("SIMLI_API_KEY", "")
    SIMLI_FACE_ID: str = os.getenv(
        "SIMLI_FACE_ID", ""  # User must provide their custom face ID
    )

    # Server config
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8080"))

    @classmethod
    def validate(cls, avatar_type: str = "sprite") -> list[str]:
        """Validate required configuration. Returns list of missing keys.

        Args:
            avatar_type: "simli" for photorealistic, "sprite" for client-side rendering
        """
        missing = []
        if not cls.DAILY_API_KEY:
            missing.append("DAILY_API_KEY")
        if not cls.DEEPGRAM_API_KEY:
            missing.append("DEEPGRAM_API_KEY")
        if not cls.OPENROUTER_API_KEY:
            missing.append("OPENROUTER_API_KEY")
        if not cls.CARTESIA_API_KEY:
            missing.append("CARTESIA_API_KEY")

        # Simli required for photorealistic avatar
        if avatar_type == "simli":
            if not cls.SIMLI_API_KEY:
                missing.append("SIMLI_API_KEY")
            if not cls.SIMLI_FACE_ID:
                missing.append("SIMLI_FACE_ID")

        return missing


# System prompt for the AI therapist
SYSTEM_PROMPT = """You are Avilon, a supportive AI therapy assistant trained in basic cognitive behavioral therapy (CBT) techniques.

Your approach:
- Be warm, empathetic, and non-judgmental
- Use active listening and reflective responses
- Apply evidence-based CBT techniques:
  * Thought challenging (identifying and reframing negative thoughts)
  * Behavioral activation (encouraging healthy activities)
  * Mindfulness and grounding exercises
  * Problem-solving strategies
- Keep responses concise (2-3 sentences for natural conversation flow)
- Never diagnose conditions or prescribe medication
- If asked about medication or diagnosis, explain you're not qualified and recommend seeing a licensed professional
- Focus on the present moment and actionable steps
- Validate emotions while encouraging healthy coping strategies

Important safety protocols:
- If someone expresses thoughts of self-harm or suicide, immediately provide crisis resources
- Always prioritize user safety over conversation flow
- Recognize your limitations as an AI and recommend professional help when appropriate

This is a real-time voice conversation. Keep responses natural and conversational.
Remember: You are a supportive companion, not a replacement for professional mental health care."""

# Initial greeting for the bot
INITIAL_GREETING = "Hi, I'm Avilon, your supportive AI companion. I'm here to listen and help you explore your thoughts and feelings. How are you doing today?"
