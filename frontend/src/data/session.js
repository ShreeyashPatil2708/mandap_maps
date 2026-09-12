import { getOrCreateId } from './storage.js';

// A random id stored in localStorage, unique per browser/device, never tied
// to a real identity. Used only to hold one crowd report per device per mandal
// to its cooldown, so a single person cannot set a mandal's level on repeat.
const KEY = 'mandapmaps.sessionId';

export function getSessionId() {
  return getOrCreateId(KEY);
}
