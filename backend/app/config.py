from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # PostgreSQL — all tables live in maritime_db
    documents_database_url: str = "postgresql+asyncpg://maritime:maritime@localhost:7000/maritime_db"

    # Neo4j Desktop — MariTime instance
    neo4j_url: str      = "bolt://localhost:7687"
    neo4j_user: str     = "neo4j"
    neo4j_password: str = "Maritime@2026"

    # Ollama
    ollama_url: str   = "http://localhost:11434"
    ollama_model: str = "mistral"

    upload_dir: str        = "./uploads"
    max_file_size_mb: int  = 50

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
