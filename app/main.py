from fastapi import FastAPI
import uvicorn

from app.config import settings

app = FastAPI(title="ORCA API", version=settings.VERSION)


@app.get("/health")
async def health_check():
    """
    Health check endpoint returning application status and LLM configuration flags.
    Never exposes raw API keys.
    """
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "mock_mode": settings.MOCK_MODE,
        "gemini_configured": settings.gemini_configured,
        "groq_configured": settings.groq_configured,
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
