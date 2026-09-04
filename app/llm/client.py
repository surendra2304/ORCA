import os
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)

async def call_llm(prompt: str, expect_json: bool = False) -> str:
    """
    Calls the LLM with the given prompt.
    Tries Gemini first, falls back to Groq.
    """
    if expect_json:
        prompt += "\n\nIMPORTANT: Return ONLY valid JSON, with no markdown formatting or extra text."

    gemini_key = os.getenv("GEMINI_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")

    if gemini_key:
        try:
            logger.info("Attempting LLM call with Gemini...")
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-pro", # A good default for complex planning
                google_api_key=gemini_key,
                temperature=0,
            )
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            logger.info("Gemini call successful.")
            return response.content
        except Exception as e:
            logger.warning(f"Gemini call failed: {e}. Falling back to Groq...")
    else:
        logger.warning("GEMINI_API_KEY not found. Attempting to use Groq...")

    if groq_key:
        try:
            logger.info("Attempting LLM call with Groq...")
            llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                groq_api_key=groq_key,
                temperature=0,
            )
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            logger.info("Groq call successful.")
            return response.content
        except Exception as e:
            logger.error(f"Groq call failed: {e}")
            raise Exception("All LLM providers failed.") from e
    
    raise Exception("No valid API keys found for LLM providers.")
