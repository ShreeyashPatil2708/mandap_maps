"""
LLM client layer for Ekdanta.

Supports two backends, selected via settings.LLM_PROVIDER:
  - "groq"   : hosted inference via Groq's OpenAI-compatible API (fast, needs internet + API key)
  - "ollama" : local inference via a running `ollama serve` (free, offline, slower on CPU)

Both are called through the single call_llm() entrypoint so the rest of the
RAG pipeline (rag_pipeline.py) never needs to know which backend is active.
"""
import json
import httpx
from typing import AsyncIterator

from app.config import get_settings

settings = get_settings()

# ---- Shared, long-lived HTTP client ----
# Previously each call created its own `async with httpx.AsyncClient(...)`,
# which pays a fresh TCP + TLS handshake on *every* chat request (~100-300ms
# wasted). One client is created lazily and reused for the life of the
# process; connections are kept alive and pooled by httpx/httpcore.
_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=settings.GROQ_TIMEOUT)
    return _client


async def close_http_client():
    """Call on app shutdown to close pooled connections cleanly."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None

SYSTEM_PROMPT = """You are "Ekdanta", the official AI assistant for Pune's Ganeshotsav
festival mobile app. You help devotees with mandal information, darshan and aarti
timings, queue status, parking, transport, emergency services and festival history.

Rules:
1. Answer ONLY using facts explicitly written in the CONTEXT below — no exceptions.
   Never invent, estimate, or infer mandal names, timings, addresses, historical
   dates/details, rankings or positions (e.g. Visarjan order, Manacha number), or
   recommendations (restaurants, routes, nearby spots) that are not written in
   CONTEXT — even if something similar sounds familiar from general knowledge.
   If a specific detail isn't in CONTEXT, say plainly that you don't have it
   instead of guessing or approximating.
2. CONTEXT may contain information about more than one mandal. Only use
   information about the mandal(s) the user is actually asking about — never
   blend in a fact from a different mandal just because it appeared in CONTEXT.
3. If CONTEXT is empty, do not guess and do not suggest unrelated example
   questions about other mandals. Say plainly that you don't have that
   information, and ask the user to name the specific mandal if they haven't.
4. Reply in the same language the user asked in (English, Marathi, or Hindi).
5. Be concise, warm, and respectful of the devotional context. Get to the answer
   in the first sentence; do not pad with preamble.
6. If the user asks a follow-up ("what about tomorrow?", "and parking there?"),
   use the conversation history to resolve what "there"/"that" refers to.
7. You are an AI assistant and can be wrong. For anything time-sensitive
   (aarti timings, pandal addresses, road closures), remind the user to confirm
   with the mandal or official sources before relying on it.
8. If a user expresses distress, self-harm, or thoughts of harming themselves or
   others, respond with care: gently encourage them to reach out to someone they
   trust or local emergency services, and share India's mental health helpline
   (Tele-MANAS: 14416 / 1800-891-4416). Never dismiss or ignore such messages.

Formatting:
- Write in short, natural sentences, like a helpful person texting back. Prefer
  plain prose over headings.
- Use a simple bullet list ONLY when listing several mandals or several distinct
  facts. Keep it to a few bullets; never nest them.
- Never output the "[Source: ...]" tags, chunk labels, field names, or any other
  scaffolding from the CONTEXT. Rewrite the information in your own words.
- No markdown headings and no tables. Keep answers to a few sentences unless the
  user clearly wants detail.
"""

TRANSLATE_SYSTEM_PROMPT = """You are a translation engine. Translate the user's
message to English. Output ONLY the translated text — no notes, quotes, labels,
or explanation. If the message is already in English, repeat it unchanged."""


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
        "options": {"temperature": 0.15},
    }
    client = get_http_client()
    resp = await client.post(
        f"{settings.OLLAMA_HOST}/api/chat", json=payload, timeout=settings.OLLAMA_TIMEOUT
    )
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
        "temperature": 0.15,
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    client = get_http_client()
    resp = await client.post(
        "https://api.groq.com/openai/v1/chat/completions",
        json=payload,
        headers=headers,
        timeout=settings.GROQ_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


async def call_llm(messages: list[dict]) -> str:
    """Single entrypoint used by rag_pipeline.py, routes to whichever
    provider is configured in settings.LLM_PROVIDER."""
    if settings.LLM_PROVIDER == "groq":
        return await call_groq(messages)
    elif settings.LLM_PROVIDER == "ollama":
        return await call_ollama(messages)
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER={settings.LLM_PROVIDER!r}. Use 'groq' or 'ollama'."
        )


async def stream_groq(messages: list[dict]) -> AsyncIterator[str]:
    """Yields answer text incrementally as Groq generates it, so the
    frontend can show tokens as they arrive instead of waiting for the
    full response. Only implemented for Groq (Ollama streaming can be
    added the same way later if you switch providers back)."""
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to your .env file "
            "(get a free key at https://console.groq.com/keys)."
        )

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": 0.15,
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    client = get_http_client()
    async with client.stream(
        "POST",
        "https://api.groq.com/openai/v1/chat/completions",
        json=payload,
        headers=headers,
        timeout=settings.GROQ_TIMEOUT,
    ) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
            if not line or not line.startswith("data:"):
                continue
            data_str = line[len("data:"):].strip()
            if data_str == "[DONE]":
                break
            try:
                chunk = json.loads(data_str)
            except json.JSONDecodeError:
                continue
            delta = chunk.get("choices", [{}])[0].get("delta", {})
            token = delta.get("content")
            if token:
                yield token


async def stream_llm(messages: list[dict]) -> AsyncIterator[str]:
    """Streaming entrypoint, mirrors call_llm(). Only Groq supports
    streaming here; Ollama falls back to one big chunk."""
    if settings.LLM_PROVIDER == "groq":
        async for token in stream_groq(messages):
            yield token
    elif settings.LLM_PROVIDER == "ollama":
        yield await call_ollama(messages)
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER={settings.LLM_PROVIDER!r}. Use 'groq' or 'ollama'."
        )


async def translate_to_english(text: str) -> str:
    """Translates a Marathi/Hindi query to English before it's embedded
    for retrieval. The mandal dataset is written in English, and the
    multilingual embedding model still retrieves noticeably worse for
    Devanagari-script queries than for their English equivalent (e.g. an
    English aarti-timing question correctly returns 5:45 AM, while the
    same question in Marathi returns nothing). Translating the query
    into the dataset's language before embedding closes that gap.

    Fails open: if Groq is unavailable or the call errors, the original
    text is returned unchanged and retrieval just runs on it as before —
    a translation failure should never break the chat.
    """
    if settings.LLM_PROVIDER != "groq" or not settings.GROQ_API_KEY:
        return text
    try:
        messages = [
            {"role": "system", "content": TRANSLATE_SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ]
        translated = await call_groq(messages)
        return translated.strip() or text
    except Exception:
        return text
