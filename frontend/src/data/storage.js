// Crash-proof localStorage access. Storage can throw on read or write (Safari
// private mode, blocked site data, quota exceeded), and an uncaught throw
// during render takes the whole app down, so every access goes through here.

export function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Best-effort: the app keeps working in memory.
  }
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Best-effort.
  }
}

/**
 * Random anonymous id. crypto.randomUUID is missing on older iOS Safari and on
 * non-HTTPS origins (e.g. testing over a LAN IP), so fall back to
 * getRandomValues, which is available everywhere the app runs.
 */
export function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Read a stored id, minting and saving a new one if absent. */
export function getOrCreateId(key) {
  let id = safeGet(key);
  if (!id) {
    id = randomId();
    safeSet(key, id);
  }
  return id;
}

// "Help detect crowds" opt-in flag, shared by the drawer toggle, the location
// pinger and the chatbot's position lookup.
const SHARE_LOCATION_KEY = 'mandapmaps.shareLocation';

export function readShareLocation() {
  return safeGet(SHARE_LOCATION_KEY) === 'true';
}

export function writeShareLocation(enabled) {
  safeSet(SHARE_LOCATION_KEY, String(enabled));
}
