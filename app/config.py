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
    # Chosen active Groq chat model: openai/gpt-oss-120b
    MODEL_GROQ: str = "openai/gpt-oss-120b"
    MOCK_MODE: bool = True
    LLM_TIMEOUT_S: float = 30.0
    HTTP_TIMEOUT_S: float = 10.0
    HTTP_RETRIES: int = 1
    CACHE_TTL_S: int = 900
    STALE_MAX_AGE_S: int = 21600
    GEOCODE_TTL_S: int = 86400
    LIGHTNING_MODERATE_JKG: float = 1.0
    LIGHTNING_HIGH_JKG: float = 20.0
    INCOIS_API_KEY: str = ""
    INCOIS_PFZ_BASE_URL: str = ""
    PFZ_ADVISORY_DIR: str = "data/pfz_advisories"
    GEO_DATA_DIR: str = "data/geo"
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
