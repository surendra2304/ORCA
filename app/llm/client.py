import asyncio
import json
import logging
import re
from typing import Any, Tuple, Union

from google import genai
from google.genai import types
from groq import AsyncGroq

from app.config import settings

logger = logging.getLogger(__name__)

# Chosen active Groq chat model: openai/gpt-oss-120b
# Verified active on Groq Cloud supporting high-throughput production chat completions.
ACTIVE_GROQ_MODEL = "openai/gpt-oss-120b"


class LLMAvailabilityError(Exception):
    """Raised when both primary and fallback LLM providers fail or are unavailable."""
    pass


class LLMParseError(Exception):
    """Raised when LLM response cannot be parsed into valid JSON."""
    pass


async def _call_gemini(prompt: str, system: str | None = None, max_tokens: int = 1024) -> str:
    """Invokes Gemini using the official google-genai SDK."""
    if not settings.gemini_configured:
        raise ValueError("GEMINI_API_KEY is not configured or empty")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    config = types.GenerateContentConfig(
        system_instruction=system if system else None,
        max_output_tokens=max_tokens,
    )

    response = await asyncio.wait_for(
        client.aio.models.generate_content(
            model=settings.MODEL_GEMINI,
            contents=prompt,
            config=config,
        ),
        timeout=settings.LLM_TIMEOUT_S,
    )

    text = getattr(response, "text", None)
    if not text or not text.strip():
        raise ValueError("Gemini returned an empty response")
    return text.strip()


async def _call_groq(prompt: str, system: str | None = None, max_tokens: int = 1024) -> str:
    """Invokes Groq fallback using the official groq SDK."""
    if not settings.groq_configured:
        raise ValueError("GROQ_API_KEY is not configured or empty")

    client = AsyncGroq(api_key=settings.GROQ_API_KEY, timeout=settings.LLM_TIMEOUT_S)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = await client.chat.completions.create(
        model=settings.MODEL_GROQ,
        messages=messages,
        max_tokens=max_tokens,
    )

    if not response.choices or not response.choices[0].message.content:
        raise ValueError("Groq returned an empty response")

    text = response.choices[0].message.content
    if not text.strip():
        raise ValueError("Groq returned an empty content string")
    return text.strip()


async def call_llm(
    prompt: str,
    system: str | None = None,
    max_tokens: int = 1024,
    return_provider: bool = False,
) -> Union[str, Tuple[str, str]]:
    """
    Calls the primary LLM (Gemini), falling back to Groq on any exception.
    
    Logs which provider answered: "llm provider=gemini" or "llm provider=groq".
    Raises LLMAvailabilityError if both fail.
    
    If return_provider is True, returns a tuple of (response_text, provider_name).
    Otherwise returns response_text.
    """
    gemini_error = None
    try:
        text = await _call_gemini(prompt=prompt, system=system, max_tokens=max_tokens)
        logger.info("llm provider=gemini")
        return (text, "gemini") if return_provider else text
    except Exception as e:
        gemini_error = e
        logger.warning("Gemini call failed (reason: %s). Falling back to Groq...", str(e))

    try:
        text = await _call_groq(prompt=prompt, system=system, max_tokens=max_tokens)
        logger.info("llm provider=groq")
        return (text, "groq") if return_provider else text
    except Exception as groq_error:
        logger.error("Groq fallback failed (reason: %s).", str(groq_error))
        raise LLMAvailabilityError(
            f"All LLM providers failed. Gemini error: {gemini_error}; Groq error: {groq_error}"
        ) from groq_error


async def call_llm_json(
    prompt: str,
    system: str | None = None,
    return_provider: bool = False,
) -> Union[dict, Tuple[dict, str]]:
    """
    Calls call_llm and robustly parses the output into a dictionary.
    
    Strips markdown code fences and isolates text from the first '{' to the last '}'.
    On parse failure, raises LLMParseError with the raw text truncated to 500 chars.
    """
    if return_provider:
        raw_text, provider = await call_llm(prompt=prompt, system=system, return_provider=True)
    else:
        raw_text = await call_llm(prompt=prompt, system=system, return_provider=False)
        provider = None

    # Strip markdown code fences if present
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    # Locate first '{' and last '}'
    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")

    if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
        json_candidate = cleaned[start_idx : end_idx + 1]
    else:
        json_candidate = cleaned

    try:
        parsed = json.loads(json_candidate)
        if not isinstance(parsed, dict):
            raise ValueError(f"Parsed JSON is not a dict (got {type(parsed).__name__})")
        return (parsed, provider) if return_provider else parsed
    except Exception as e:
        truncated = (raw_text[:500] + "...") if len(raw_text) > 500 else raw_text
        raise LLMParseError(f"Failed to parse LLM response as JSON: {e}. Raw text: {truncated}") from e
