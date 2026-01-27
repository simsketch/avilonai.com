"""OpenRouter LLM wrapper for Pipecat using OpenAI-compatible interface."""

from pipecat.services.openai import OpenAILLMService
from config import Config


def create_llm_service() -> OpenAILLMService:
    """
    Create an OpenRouter-based LLM service using OpenAI-compatible API.

    Uses the same model as the main Avilon app: deepseek-r1-distill-llama-70b
    """
    return OpenAILLMService(
        api_key=Config.OPENROUTER_API_KEY,
        base_url=Config.OPENROUTER_BASE_URL,
        model=Config.LLM_MODEL,
        params={
            "temperature": 0.7,
            "max_tokens": 300,  # Keep responses concise for voice
            "extra_headers": {
                "HTTP-Referer": "https://avilon.ai",
                "X-Title": "Avilon Therapy Bot - Pipecat",
            },
        },
    )
