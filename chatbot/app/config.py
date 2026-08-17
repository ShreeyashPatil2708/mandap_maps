"""
Central configuration for the Ekdanta RAG chatbot backend.
All values are overridable via environment variables (.env file).
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ---- App ----
    APP_NAME: str = "Ekdanta RAG Chatbot"
    ENV: str = "development"

    # ---- LLM provider selection ----
    # "groq"   -> fast hosted inference (needs GROQ_API_KEY + internet)
    # "ollama" -> local inference (needs `ollama serve` running)
    LLM_PROVIDER: str = "groq"

    # ---- Ollama (local LLM) ----
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"          # any locally pulled model works
    OLLAMA_TIMEOUT: int = 120

    # ---- Groq (hosted LLM) ----
    GROQ_API_KEY: str = ""
    # 70B follows the "don't fabricate / stay on-topic / formatting" rules in the
    # system prompt noticeably better than 8B, and is still fast on Groq.
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_TIMEOUT: int = 30

    # ---- Embeddings ----
    # Multilingual model -> needed for English / Marathi / Hindi support
    EMBEDDING_MODEL: str = "paraphrase-multilingual-MiniLM-L12-v2"
    EMBEDDING_DIM: int = 384

    # ---- Vector store (FAISS) ----
    FAISS_INDEX_PATH: str = "app/data/faiss_index/index.bin"
    FAISS_METADATA_PATH: str = "app/data/faiss_index/metadata.json"

    # ---- Hybrid retrieval weighting ----
    DENSE_WEIGHT: float = 0.65     # FAISS (semantic) contribution
    SPARSE_WEIGHT: float = 0.35    # BM25 (keyword) contribution
    TOP_K: int = 5
    # Relevance gate: if the best semantic (dense) match for a query is below
    # this cosine score, the corpus has nothing on-topic, so we return no context
    # and let the model say it can only help with Ganeshotsav questions. Tuned
    # so real mandal queries (>=~0.4) pass while off-topic ones (<=~0.27) don't.
    MIN_RELEVANCE_SCORE: float = 0.32

    # ---- Postgres (chat history / users) ----
    POSTGRES_URL: str = "postgresql://ekdanta:ekdanta@localhost:5432/ekdanta_db"

    # ---- Redis (session memory + response cache) ----
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 3600
    MEMORY_TURNS: int = 6          # how many past turns to keep per session

    # ---- CORS ----
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ---- Security / abuse limits ----
    # Shared secret required to POST /api/ingest. Empty string in dev keeps the
    # endpoint open; set a value in .env for any non-local deployment.
    INGEST_API_KEY: str = ""
    # Per-client (IP) rate limits, slowapi syntax ("20/minute", "5/minute", ...).
    CHAT_RATE_LIMIT: str = "20/minute"
    INGEST_RATE_LIMIT: str = "5/minute"
    MANDALS_RATE_LIMIT: str = "60/minute"
    # Upper bounds on request payloads (defense against cost/DoS abuse).
    MAX_QUERY_CHARS: int = 2000
    MAX_INGEST_CHARS: int = 50000

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
