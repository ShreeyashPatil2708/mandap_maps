import { getSessionId } from '../data/session.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Submit a crowd report: level is 1 (Low), 2 (Medium), or 3 (High).
 * Resolves to { ok, crowd } where `crowd` is the mandal's fresh level. Rejects
 * with an Error carrying `.status` (429 = reported this mandal recently).
 */
export async function reportCrowd(ganpatiId, level) {
  const res = await fetch(`${API_BASE}/api/ganpatis/${ganpatiId}/crowd-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, sessionId: getSessionId() }),
  });
  if (!res.ok) {
    const err = new Error(`Failed to report crowd (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Fetch crowd levels for every Ganpati: { [ganpatiId]: { level, label, source, reportCount } } */
export async function fetchAllCrowdLevels() {
  const res = await fetch(`${API_BASE}/api/crowd`);
  if (!res.ok) throw new Error(`Failed to load crowd data (${res.status})`);
  return res.json();
}
