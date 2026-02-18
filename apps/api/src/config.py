"""Application configuration using Pydantic Settings."""

from functools import lru_cache

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_env: str = Field(default="development")
    app_debug: bool = Field(default=True)
    app_secret_key: str = Field(default="change-me-in-production")

    # JWT Authentication
    jwt_secret_key: str = Field(default="change-me-in-production-min-32-chars")
    jwt_algorithm: str = Field(default="HS256")
    jwt_access_token_expire_minutes: int = Field(default=1440)  # 24 hours

    # Frontend URL (for CORS and redirects)
    frontend_url: str = Field(default="http://localhost:3000")

    # PostgreSQL
    postgres_user: str = Field(default="detective")
    postgres_password: str = Field(default="detective_secret")
    postgres_db: str = Field(default="office_detective")
    postgres_host: str = Field(default="localhost")
    postgres_port: int = Field(default=5432)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        """Construct async database URL."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # Neo4j
    neo4j_uri: str = Field(default="bolt://localhost:7687")
    neo4j_user: str = Field(default="neo4j")
    neo4j_password: str = Field(default="detective_graph")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379")

    # LLM
    llm_provider: str = Field(default="openai")
    openai_api_key: str = Field(default="")
    openai_api_base: str | None = Field(default=None)
    openai_model: str = Field(default="gpt-4o")
    deepseek_api_key: str = Field(default="")
    deepseek_api_base: str = Field(default="https://api.deepseek.com")
    deepseek_model: str = Field(default="deepseek-chat")
    llm_fallback_provider: str = Field(default="")
    llm_request_timeout_seconds: float = Field(default=40.0)
    llm_max_retries: int = Field(default=2)

    # Embeddings (OpenAI-compatible endpoint)
    embedding_api_key: str = Field(default="")
    embedding_api_base: str | None = Field(default=None)
    embedding_model: str = Field(default="text-embedding-3-small")
    embedding_dimension: int = Field(default=1536)

    # API throttling
    chat_rate_limit_requests: int = Field(default=20)
    chat_rate_limit_window_seconds: int = Field(default=60)
    hint_rate_limit_requests: int = Field(default=10)
    hint_rate_limit_window_seconds: int = Field(default=60)

    # CORS
    cors_origins_str: str = Field(
        default=(
            "http://localhost:3000,http://127.0.0.1:3000,"
            "http://localhost:3001,http://127.0.0.1:3001"
        ),
        alias="CORS_ORIGINS",
    )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origins(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins_str.split(",")]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def llm_api_key(self) -> str:
        """Resolve API key for configured LLM provider."""
        return self.provider_api_key()

    @computed_field  # type: ignore[prop-decorator]
    @property
    def llm_api_base(self) -> str | None:
        """Resolve API base for configured LLM provider."""
        return self.provider_api_base()

    @computed_field  # type: ignore[prop-decorator]
    @property
    def llm_model_name(self) -> str:
        """Resolve model name for configured LLM provider."""
        return self.provider_model_name()

    @computed_field  # type: ignore[prop-decorator]
    @property
    def resolved_embedding_api_key(self) -> str:
        """Resolve embedding API key with OpenAI fallback."""
        if self.embedding_api_key:
            return self.embedding_api_key.strip()
        return self.openai_api_key.strip()

    @computed_field  # type: ignore[prop-decorator]
    @property
    def resolved_embedding_api_base(self) -> str | None:
        """Resolve embedding API base with OpenAI fallback."""
        if self.embedding_api_base:
            return self.embedding_api_base.strip() or None
        base = self.openai_api_base.strip() if self.openai_api_base else ""
        return base or None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.app_env == "production"

    def normalized_provider(self, provider: str | None = None) -> str:
        """Normalize provider name with safe fallback."""
        normalized = (provider or self.llm_provider).strip().lower()
        return normalized if normalized in {"openai", "deepseek"} else "openai"

    def provider_api_key(self, provider: str | None = None) -> str:
        """Resolve API key for a specific provider."""
        selected = self.normalized_provider(provider)
        if selected == "deepseek":
            return self.deepseek_api_key.strip()
        return self.openai_api_key.strip()

    def provider_api_base(self, provider: str | None = None) -> str | None:
        """Resolve API base for a specific provider."""
        selected = self.normalized_provider(provider)
        if selected == "deepseek":
            return self.deepseek_api_base.strip() or "https://api.deepseek.com"
        base = self.openai_api_base.strip() if self.openai_api_base else ""
        return base or None

    def provider_model_name(self, provider: str | None = None) -> str:
        """Resolve model name for a specific provider."""
        selected = self.normalized_provider(provider)
        if selected == "deepseek":
            return self.deepseek_model.strip() or "deepseek-chat"
        return self.openai_model.strip() or "gpt-4o"

    def provider_is_configured(self, provider: str | None = None) -> bool:
        """Check whether a provider has a configured API key."""
        return bool(self.provider_api_key(provider))


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
