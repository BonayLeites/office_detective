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
    openai_model: str = Field(default="gpt-4o")
    embedding_model: str = Field(default="text-embedding-3-small")
    embedding_dimension: int = Field(default=1536)

    # CORS
    cors_origins_str: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        alias="CORS_ORIGINS",
    )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origins(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins_str.split(",")]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
