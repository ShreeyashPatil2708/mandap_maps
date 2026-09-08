// A random id stored in localStorage, unique per browser/device, never tied
// to a real identity — used only to count distinct interested visitors.
const KEY = 'mandapmaps.sessionId';

export function getSessionId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}