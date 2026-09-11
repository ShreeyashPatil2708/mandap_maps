// Talks to the Python RAG chatbot service (FastAPI, see chatbot/ in the repo).
// Same-origin in dev and prod: /api/chat is proxied to the chatbot service by
// Vite locally (see vite.config.js) and by CloudFront in prod, so the browser
// never needs a separate base URL or CORS.
import { getOrCreateId, readShareLocation, safeGet, safeRemove } from '../data/storage.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

// The chatbot streams answer text as plain chunks, then appends one final
// chunk of structured metadata (location card / suggested-action chips /
// darshan plan) behind this private marker. Must match
// chatbot/app/core/rag_pipeline.py's _STREAM_META_MARKER exactly.
const META_MARKER = '\u0000META\u0000';

// Give up on a reply that hasn't finished within this long, so a stalled
// connection never leaves the chat stuck on "Thinking...".
const REQUEST_TIMEOUT_MS = 60_000;

const UNREACHABLE_MSG =
  "Sorry, I couldn't reach the assistant right now. Please try again in a moment.";
const RATE_LIMITED_MSG = "You're sending messages quickly. Please wait a minute and try again.";
const BUSY_MSG = 'The assistant is busy right now. Please try again in a moment.';

function messageForStatus(status) {
  if (status === 429) return RATE_LIMITED_MSG;
  if (status === 503) return BUSY_MSG;
  return UNREACHABLE_MSG;
}

// One stable session id per browser so the service can keep short conversational
// memory (follow-ups like "and parking there?"). The on-screen thread
// persists too (see AskSheet.jsx), so reusing the id keeps backend context
// aligned with what the user still sees.
const SESSION_KEY = 'mm_chat_session_id';

function getSessionId() {
  return getOrCreateId(SESSION_KEY);
}

/**
 * Forget the current chat session: ask the service to drop its short-term
 * memory for it (best effort), then rotate to a fresh id minted lazily on the
 * next message. Used by the "Clear chat" control so wiping the on-screen
 * thread and resetting backend context stay in sync.
 */
export function resetSessionId() {
  const id = safeGet(SESSION_KEY);
  safeRemove(SESSION_KEY);
  if (id) {
    fetch(`${API_BASE}/api/chat/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }
}

/**
 * Returns { lat, lng } if the user has already opted in to location sharing
 * (the same "Help detect crowds" toggle used by useLocationSharing.js) AND
 * the browser already has a recent cached fix, or null otherwise.
 *
 * This deliberately does NOT trigger a fresh GPS request or a permission
 * prompt of its own: maximumAge is set very high (accept an old cached fix)
 * and timeout is set very low (give up almost immediately if nothing is
 * cached), so asking the chatbot a question never waits on, or asks for,
 * location the user hasn't already agreed to share.
 */
function getLastKnownPosition() {
  if (!readShareLocation() || !navigator.geolocation) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null), // no cached fix, denied, or unavailable: proceed without it
      { maximumAge: 10 * 60_000, timeout: 200 }
    );
  });
}

/**
 * An AbortSignal that fires when either the caller's signal aborts or the
 * request timeout elapses. Returns { signal, cancelTimeout }.
 */
function withTimeout(callerSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return { signal: controller.signal, cancelTimeout: () => clearTimeout(timer) };
}

/**
 * Stream a user message to the chatbot, calling back with incremental text
 * as it arrives and finally with structured metadata once the answer is
 * complete. Falls back gracefully (single onText call, no metadata) if the
 * browser can't stream a fetch body or the request fails outright.
 *
 * If `options.signal` aborts (the user closed the sheet or cleared the chat),
 * the request is cancelled and neither callback is called again.
 *
 * @param {string} message - the user's question.
 * @param {(textSoFar: string) => void} onText - called with the full answer
 *   text accumulated so far, every time a new chunk arrives.
 * @param {(meta: {location?: object|null, suggested_actions?: object[], plan?: object, cached?: boolean}) => void} onMeta
 *   - called once, after streaming finishes, with the structured metadata.
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function streamChatbotMessage(message, onText, onMeta, { signal } = {}) {
  const { signal: requestSignal, cancelTimeout } = withTimeout(signal);
  // Answer text shown so far, so a mid-stream failure keeps what already
  // arrived instead of replacing it with the error message.
  let visible = '';
  try {
    const position = await getLastKnownPosition();
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        query: message,
        language: 'auto',
        ...(position && { lat: position.lat, lng: position.lng }),
      }),
      signal: requestSignal,
    });
    if (!res.ok || !res.body) {
      if (signal?.aborted) return;
      onText(messageForStatus(res.status));
      onMeta({});
      return;
    }

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
        visible = markerIdx === -1 ? raw : raw.slice(0, markerIdx);
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
    // The caller cancelled on purpose: stay silent.
    if (signal?.aborted) return;
    onText(visible ? `${visible}\n\n${UNREACHABLE_MSG}` : UNREACHABLE_MSG);
    onMeta({});
  } finally {
    cancelTimeout();
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
  const { signal, cancelTimeout } = withTimeout();
  try {
    const position = await getLastKnownPosition();
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        query: message,
        language: 'auto',
        ...(position && { lat: position.lat, lng: position.lng }),
      }),
      signal,
    });
    if (!res.ok) return messageForStatus(res.status);
    const data = await res.json();
    return data.answer || 'Sorry, I could not find an answer to that.';
  } catch {
    return UNREACHABLE_MSG;
  } finally {
    cancelTimeout();
  }
}
