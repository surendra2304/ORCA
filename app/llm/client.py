import asyncio
import json
import logging
import re
from typing import Any, Dict, Tuple, Union
import warnings

from google import genai
from google.genai import types
from groq import AsyncGroq

from app.config import settings

warnings.filterwarnings("ignore", category=UserWarning, module="google.genai")
logger = logging.getLogger(__name__)
logging.getLogger("google.genai").setLevel(logging.ERROR)


# Chosen active Groq chat model: openai/gpt-oss-20b
# Verified active on Groq Cloud supporting high-throughput production chat completions.
ACTIVE_GROQ_MODEL = "openai/gpt-oss-20b"


class LLMAvailabilityError(Exception):
    """Raised when both primary and fallback LLM providers fail or are unavailable."""
    pass


class LLMParseError(Exception):
    """Raised when LLM response cannot be parsed into valid JSON."""
    pass


_gemini_cooldowns: Dict[str, float] = {}


async def _call_gemini(
    prompt: str,
    system: str | None = None,
    max_tokens: int = 1024,
    api_key: str | None = None,
    json_mode: bool = False,
) -> str:
    """Invokes Gemini using the official google-genai SDK."""
    import time
    global _gemini_cooldowns
    target_key = api_key or settings.GEMINI_API_KEY
    if not target_key or not target_key.strip():
        raise ValueError("Gemini API key is not configured or empty")

    cooldown_until = _gemini_cooldowns.get(target_key, 0.0)
    if time.time() < cooldown_until:
        raise ValueError(f"Gemini key ending in {target_key[-6:]} is in rate-limit cooldown (429 RESOURCE_EXHAUSTED)")

    client = genai.Client(
        api_key=target_key,
        http_options=types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=1, http_status_codes=[])),
    )
    config = types.GenerateContentConfig(
        system_instruction=system if system else None,
        max_output_tokens=max_tokens,
        response_mime_type="application/json" if json_mode else None,
        http_options=types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=1, http_status_codes=[])),
    )

    gemini_models = ["gemini-3.6-flash", settings.MODEL_GEMINI]
    seen = set()
    last_err = None
    for model_name in gemini_models:
        if model_name in seen:
            continue
        seen.add(model_name)
        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                ),
                timeout=min(settings.LLM_TIMEOUT_S, 6.0),
            )
            text = getattr(response, "text", None)
            if text and text.strip():
                return text.strip()
        except Exception as e:
            last_err = e
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                raise e
            logger.debug("Gemini model %s failed (%s), trying next...", model_name, e)
            continue

    raise ValueError(f"All Gemini candidate models failed: {last_err}")


async def _call_groq(
    prompt: str,
    system: str | None = None,
    max_tokens: int = 1024,
    json_mode: bool = False,
) -> str:
    """Invokes Groq fallback using the official groq SDK with automatic model cascade."""
    if not settings.groq_configured:
        raise ValueError("GROQ_API_KEY is not configured or empty")

    client = AsyncGroq(api_key=settings.GROQ_API_KEY, timeout=min(settings.LLM_TIMEOUT_S, 8.0))
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    candidate_models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
    seen_models = set()
    last_err = None

    for model_name in candidate_models:
        if model_name in seen_models:
            continue
        seen_models.add(model_name)
        effective_max = min(max_tokens, 1024)
        kwargs = {
            "model": model_name,
            "messages": messages,
            "max_tokens": effective_max,
        }
        if "qwen" in model_name or "oss" in model_name:
            kwargs["reasoning_format"] = "hidden"
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        try:
            response = await client.chat.completions.create(**kwargs)
            if response.choices:
                msg = response.choices[0].message
                text = (msg.content or "").strip()
                if not text and getattr(msg, "reasoning", None):
                    text = (msg.reasoning or "").strip()
                if text:
                    return text
        except Exception as err:
            last_err = err
            logger.debug("Groq model %s failed (%s), trying next...", model_name, err)
            continue

    raise ValueError(f"All Groq candidate models failed: {last_err}")



async def call_llm(
    prompt: str,
    system: str | None = None,
    max_tokens: int = 2048,
    return_provider: bool = False,
    json_mode: bool = False,
) -> Union[str, Tuple[str, str]]:
    """
    Calls the primary LLM (Gemini), falling back to fallback Gemini if configured,
    and then Groq on any exception.
    
    Logs which provider answered: "llm provider=gemini", "llm provider=gemini-fallback", or "llm provider=groq".
    Raises LLMAvailabilityError if all fail.
    
    If return_provider is True, returns a tuple of (response_text, provider_name).
    Otherwise returns response_text.
    """
    import time
    global _gemini_cooldowns
    gemini_errors = []

    # 1. Primary Gemini
    if settings.gemini_configured:
        if time.time() >= _gemini_cooldowns.get(settings.GEMINI_API_KEY, 0.0):
            try:
                text = await _call_gemini(prompt=prompt, system=system, max_tokens=max_tokens, api_key=settings.GEMINI_API_KEY, json_mode=json_mode)
                logger.info("llm provider=gemini")
                return (text, "gemini") if return_provider else text
            except Exception as e:
                gemini_errors.append(str(e))
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "503" in str(e) or "UNAVAILABLE" in str(e):
                    _gemini_cooldowns[settings.GEMINI_API_KEY] = time.time() + 600.0
                logger.debug("Primary Gemini call failed: %s", e)

    # 2. Fallback Gemini
    if settings.gemini_fallback_configured:
        if time.time() >= _gemini_cooldowns.get(settings.GEMINI_FALLBACK_KEY, 0.0):
            try:
                text = await _call_gemini(prompt=prompt, system=system, max_tokens=max_tokens, api_key=settings.GEMINI_FALLBACK_KEY, json_mode=json_mode)
                logger.info("llm provider=gemini-fallback")
                return (text, "gemini-fallback") if return_provider else text
            except Exception as e:
                gemini_errors.append(f"fallback: {e}")
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "503" in str(e) or "UNAVAILABLE" in str(e):
                    _gemini_cooldowns[settings.GEMINI_FALLBACK_KEY] = time.time() + 600.0
                logger.debug("Fallback Gemini call failed: %s", e)

    # 3. Groq Fallback
    try:
        text = await _call_groq(prompt=prompt, system=system, max_tokens=max_tokens, json_mode=json_mode)
        logger.info("llm provider=groq")
        return (text, "groq") if return_provider else text
    except Exception as groq_error:
        logger.error("Groq fallback failed (reason: %s).", str(groq_error))
        raise LLMAvailabilityError(
            f"All LLM providers failed. Gemini errors: {gemini_errors}; Groq error: {groq_error}"
        ) from groq_error



async def call_llm_json(
    prompt: str,
    system: str | None = None,
    return_provider: bool = False,
    max_tokens: int = 500,
) -> Union[dict, Tuple[dict, str]]:
    """
    Calls call_llm and robustly parses the output into a dictionary.
    
    Strips markdown code fences and isolates text from the first '{' to the last '}'.
    On parse failure, raises LLMParseError with the raw text truncated to 500 chars.
    """
    if return_provider:
        raw_text, provider = await call_llm(prompt=prompt, system=system, max_tokens=max_tokens, return_provider=True, json_mode=True)
    else:
        raw_text = await call_llm(prompt=prompt, system=system, max_tokens=max_tokens, return_provider=False, json_mode=True)
        provider = None

    # Strip <think>...</think> reasoning blocks if present
    cleaned = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
    if "<think>" in cleaned:
        cleaned = re.sub(r"<think>.*?(?=\{)", "", cleaned, flags=re.DOTALL).strip()

    # Strip markdown code fences if present
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
