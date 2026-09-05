from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application configuration for ORCA.
    Reads environment variables from .env file or environment.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    MODEL_GEMINI: str = "gemini-2.5-flash"
    # Chosen active Groq chat model: llama-3.3-70b-versatile
    MODEL_GROQ: str = "llama-3.3-70b-versatile"
    MOCK_MODE: bool = True
    LLM_TIMEOUT_S: float = 30.0
    APP_NAME: str = "ORCA"
    VERSION: str = "0.1.0"

    @property
    def gemini_configured(self) -> bool:
        """Returns True if GEMINI_API_KEY is non-empty."""
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip())

    @property
    def groq_configured(self) -> bool:
        """Returns True if GROQ_API_KEY is non-empty."""
        return bool(self.GROQ_API_KEY and self.GROQ_API_KEY.strip())


# Exported singleton instance
settings = Settings()
