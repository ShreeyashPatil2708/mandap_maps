// Talks to the Python RAG chatbot service (FastAPI, see chatbot/ in the repo).
// Same-origin in dev and prod: /api/chat is proxied to the chatbot service by
// Vite locally (see vite.config.js) and by the CDN/gateway in prod, so the
// browser never needs a separate base URL or CORS.
const API_BASE = import.meta.env.VITE_API_URL || '';

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
 * Send a user message to the chatbot and return the reply text.
 * @param {string} message - the user's question.
 * @param {string|null} ganpatiContext - current Ganpati id for context (unused by
 *   the API today; the service grounds answers via retrieval). Kept for when the
 *   backend accepts an explicit context hint.
 * @returns {Promise<string>} the assistant's answer.
 */
export async function callChatbotAPI(message, ganpatiContext) {
  void ganpatiContext;
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
