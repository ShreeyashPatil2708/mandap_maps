"""
LLM client layer for Ekdanta.

Supports two backends, selected via settings.LLM_PROVIDER:
  - "groq"   : hosted inference via Groq's OpenAI-compatible API (fast, needs internet + API key)
  - "ollama" : local inference via a running `ollama serve` (free, offline, slower on CPU)

Both are called through the single call_llm() entrypoint so the rest of the
RAG pipeline (rag_pipeline.py) never needs to know which backend is active.
"""
import httpx
from app.config import get_settings

settings = get_settings()

SYSTEM_PROMPT = """You are "Ekdanta", the official AI assistant for Pune's Ganeshotsav
festival mobile app. You help devotees with mandal information, darshan and aarti
timings, queue status, parking, transport, emergency services and festival history.

Rules:
1. Answer ONLY using the CONTEXT provided below. If the context does not contain
   the answer, say so honestly and suggest what the user could ask instead —
   never invent mandal names, timings, or addresses.
2. Reply in the same language the user asked in (English, Marathi, or Hindi).
3. Be concise, warm, and respectful of the devotional context.
4. If the user asks a follow-up ("what about tomorrow?", "and parking there?"),
   use the conversation history to resolve what "there"/"that" refers to.
"""


def build_prompt(query: str, context_chunks: list[dict], history: list[dict]) -> list[dict]:
    context_text = "\n\n".join(
        f"[Source: {c.get('title', c.get('doc_id', 'unknown'))}]\n{c['text']}"
        for c in context_chunks
    ) or "No relevant context found."

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in history:
        messages.append({"role": "user", "content": turn["user"]})
        messages.append({"role": "assistant", "content": turn["assistant"]})

    messages.append(
        {
            "role": "user",
            "content": f"CONTEXT:\n{context_text}\n\nQUESTION: {query}",
        }
    )
    return messages


async def call_ollama(messages: list[dict]) -> str:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.3},
    }
    async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
        resp = await client.post(f"{settings.OLLAMA_HOST}/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["message"]["content"]


async def call_groq(messages: list[dict]) -> str:
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to your .env file "
            "(get a free key at https://console.groq.com/keys)."
        )

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": 0.3,
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=settings.GROQ_TIMEOUT) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def call_llm(messages: list[dict]) -> str:
    """Single entrypoint used by rag_pipeline.py — routes to whichever
    provider is configured in settings.LLM_PROVIDER."""
    if settings.LLM_PROVIDER == "groq":
        return await call_groq(messages)
    elif settings.LLM_PROVIDER == "ollama":
        return await call_ollama(messages)
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER={settings.LLM_PROVIDER!r}. Use 'groq' or 'ollama'."
        )
