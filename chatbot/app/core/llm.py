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
1. Answer ONLY using the CONTEXT provided below. Never invent mandal names,
   timings, or addresses. If the CONTEXT is empty or does not contain the answer,
   do not guess: briefly say you can only help with Pune Ganeshotsav and its
   mandals, and give one or two example questions the user could ask instead.
2. Reply in the same language the user asked in (English, Marathi, or Hindi).
3. Be concise, warm, and respectful of the devotional context. Get to the answer
   in the first sentence; do not pad with preamble.
4. If the user asks a follow-up ("what about tomorrow?", "and parking there?"),
   use the conversation history to resolve what "there"/"that" refers to.
5. You are an AI assistant and can be wrong. For anything time-sensitive
   (aarti timings, pandal addresses, road closures), remind the user to confirm
   with the mandal or official sources before relying on it.
6. If a user expresses distress, self-harm, or thoughts of harming themselves or
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
