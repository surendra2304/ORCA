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
    GEMINI_FALLBACK_KEY: str = ""
    GROQ_API_KEY: str = ""
    MODEL_GEMINI: str = "gemini-flash-latest"
    MODEL_GROQ: str = "openai/gpt-oss-20b"
    MOCK_MODE: bool = False
    LLM_TIMEOUT_S: float = 15.0
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
    IMD_CAP_FEED_URL: str = ""        # set when IMD CAP feed URL is confirmed
    IMD_API_KEY: str = ""             # if the IMD API path needs a key
    INCOIS_ALERTS_BASE_URL: str = ""  # set when INCOIS registration approves
    INCOIS_ERDDAP_BASE_URL: str = ""       # unset = provider not configured
    INCOIS_ERDDAP_SST_DATASET: str = ""    # dataset id, e.g. an OCM-SST griddap id
    INCOIS_ERDDAP_CHL_DATASET: str = ""
    SST_DIFF_WARN_C: float = 1.5           # data-quality note threshold (NOT a safety threshold; lives in config)
    REFLECTION_LLM_CRITIC: bool = False   # Bounded reflection: optional LLM critic (deterministic R-rules always active)
    # Route Advisory Scoring Constants (ADVISORY SCORING only; NOT safety thresholds)
    ROUTE_MAX_SAMPLES: int = 25              # corridor sample points cap
    ROUTE_CORRIDOR_HALF_WIDTH_KM: float = 15.0 # corridor perpendicular offset
    ROUTE_WAVE_PENALTY_PER_M: float = 2.0     # cost multiplier per meter of wave
    ROUTE_WIND_PENALTY_PER_KT: float = 0.05   # cost multiplier per knot of wind
    ROUTE_RESTRICTED_PENALTY: float = 1000.0  # near-infinite; effectively bans restricted zones
    ROUTE_PRIMARY_REROUTE_PENALTY: float = 50.0 # applied to primary path cells when finding alternative
    HAZARD_ADVISORY_DIR: str = "data/hazard_advisories"
    GEO_DATA_DIR: str = "data/geo"
    MEMORY_TURNS: int = 10
    RUNS_DIR: str = "runs"
    SESSIONS_DIR: str = "sessions"
    APP_NAME: str = "ORCA"
    VERSION: str = "0.1.0"

    # ADVISORY ZONE-INDEX weights for zone COMPARISON only. NOT safety thresholds. Vessel verdicts come ONLY from the rule engine (rules/safety_rules.yaml).
    DASHBOARD_CACHE_TTL_S: int = 600
    TIMESERIES_DEFAULT_DAYS: int = 30       # cap 92 (open-meteo limit)
    ZONE_INDEX_FORMULA_VERSION: str = "zi-1.0"
    ZONE_INDEX_WAVE_W: float = 16.0         # cost per meter of wave height
    ZONE_INDEX_WAVE_MAX: float = 40.0       # component cap
    ZONE_INDEX_WIND_W: float = 1.5          # cost per knot
    ZONE_INDEX_WIND_MAX: float = 30.0
    ZONE_INDEX_ALERT_MODERATE: float = 15.0
    ZONE_INDEX_ALERT_HIGH: float = 30.0
    ZONE_INDEX_RESTRICTED_SCORE: float = 0.0
    DISASTERS_FILE: str = "data/disasters/cyclones.json"

    @property
    def gemini_configured(self) -> bool:
        """Returns True if GEMINI_API_KEY is non-empty."""
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip())

    @property
    def gemini_fallback_configured(self) -> bool:
        """Returns True if GEMINI_FALLBACK_KEY is non-empty."""
        return bool(self.GEMINI_FALLBACK_KEY and self.GEMINI_FALLBACK_KEY.strip())

    @property
    def groq_configured(self) -> bool:
        """Returns True if GROQ_API_KEY is non-empty."""
        return bool(self.GROQ_API_KEY and self.GROQ_API_KEY.strip())



# Exported singleton instance
settings = Settings()

# Module-level exports
ZONE_INDEX_FORMULA_VERSION = settings.ZONE_INDEX_FORMULA_VERSION
ZONE_INDEX_WAVE_W = settings.ZONE_INDEX_WAVE_W
ZONE_INDEX_WAVE_MAX = settings.ZONE_INDEX_WAVE_MAX
ZONE_INDEX_WIND_W = settings.ZONE_INDEX_WIND_W
ZONE_INDEX_WIND_MAX = settings.ZONE_INDEX_WIND_MAX
ZONE_INDEX_ALERT_MODERATE = settings.ZONE_INDEX_ALERT_MODERATE
ZONE_INDEX_ALERT_HIGH = settings.ZONE_INDEX_ALERT_HIGH
ZONE_INDEX_RESTRICTED_SCORE = settings.ZONE_INDEX_RESTRICTED_SCORE
DASHBOARD_CACHE_TTL_S = settings.DASHBOARD_CACHE_TTL_S
TIMESERIES_DEFAULT_DAYS = settings.TIMESERIES_DEFAULT_DAYS
DISASTERS_FILE = settings.DISASTERS_FILE
