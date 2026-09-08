// Talks to the Python RAG chatbot service (FastAPI, see chatbot/ in the repo).
// Same-origin in dev and prod: /api/chat is proxied to the chatbot service by
// Vite locally (see vite.config.js) and by the CDN/gateway in prod, so the
// browser never needs a separate base URL or CORS.
const API_BASE = import.meta.env.VITE_API_URL || '';

// The chatbot streams answer text as plain chunks, then appends one final
// chunk of structured metadata (location card / suggested-action chips /
// darshan plan) behind this private marker. Must match
// chatbot/app/core/rag_pipeline.py's _STREAM_META_MARKER exactly.
const META_MARKER = '\u0000META\u0000';

// One stable session id per browser so the service can keep short conversational
// memory (follow-ups like "and parking there?"). AskSheet resets the on-screen
// thread each open, but reusing the id lets the backend resolve context.
function getSessionId() {
  const KEY = 'mm_chat_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Stream a user message to the chatbot, calling back with incremental text
 * as it arrives and finally with structured metadata once the answer is
 * complete. Falls back gracefully (single onText call, no metadata) if the
 * browser can't stream a fetch body or the request fails outright.
 *
 * @param {string} message - the user's question.
 * @param {(textSoFar: string) => void} onText - called with the full answer
 *   text accumulated so far, every time a new chunk arrives.
 * @param {(meta: {location?: object|null, suggested_actions?: object[], plan?: object, cached?: boolean}) => void} onMeta
 *   - called once, after streaming finishes, with the structured metadata.
 */
export async function streamChatbotMessage(message, onText, onMeta) {
  try {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        query: message,
        language: 'auto',
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Chat request failed (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let raw = '';
    let done = false;

    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        raw += decoder.decode(chunk.value, { stream: true });
        const markerIdx = raw.indexOf(META_MARKER);
        const visible = markerIdx === -1 ? raw : raw.slice(0, markerIdx);
        onText(visible);
      }
    }

    const markerIdx = raw.indexOf(META_MARKER);
    if (markerIdx === -1) {
      onMeta({});
      return;
    }
    onText(raw.slice(0, markerIdx));
    try {
      onMeta(JSON.parse(raw.slice(markerIdx + META_MARKER.length)));
    } catch {
      onMeta({});
    }
  } catch {
    onText("Sorry, I couldn't reach the assistant right now. Please try again in a moment.");
    onMeta({});
  }
}

/**
 * Non-streaming fallback, kept for any caller that just wants a plain
 * string answer (e.g. a future non-chat integration) without wiring up
 * the streaming callbacks above.
 * @param {string} message - the user's question.
 * @returns {Promise<string>} the assistant's answer.
 */
export async function callChatbotAPI(message) {
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        query: message,
        language: 'auto',
      }),
    });
    if (!res.ok) throw new Error(`Chat request failed (${res.status})`);
    const data = await res.json();
    return data.answer || 'Sorry, I could not find an answer to that.';
  } catch {
    return "Sorry, I couldn't reach the assistant right now. Please try again in a moment.";
  }
}
