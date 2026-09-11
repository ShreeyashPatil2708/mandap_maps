import { getOrCreateId } from './storage.js';

// A random id stored in localStorage, unique per browser/device, never tied
// to a real identity. Used only to count distinct interested visitors.
const KEY = 'mandapmaps.sessionId';

export function getSessionId() {
  return getOrCreateId(KEY);
}
