import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import chat, ingest, mandals
from app.config import get_settings
from app.core import memory
from app.core.limiter import limiter
from app.core.llm import close_http_client

logging.basicConfig(level=logging.INFO)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENV != "development" and not settings.INGEST_API_KEY:
        raise RuntimeError("INGEST_API_KEY must be set in non-development environments")
    # Startup: establish the async Redis connection once (see core/memory.py).
    await memory.init_redis()
    yield
    # Shutdown: close the shared httpx client's pooled connections cleanly
    # (see core/llm.py get_http_client()).
    await close_http_client()


app = FastAPI(
    title=settings.APP_NAME,
    description="Hybrid RAG chatbot for Pune Ganeshotsav (Ekdanta) — powered by FAISS + BM25 + Groq/Ollama.",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting (per client IP). Endpoints opt in via @limiter.limit(...).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(ingest.router)
app.include_router(mandals.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
