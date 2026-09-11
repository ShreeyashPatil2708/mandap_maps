import { getSessionId } from '../data/session.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Submit a crowd report: level is 1 (Low), 2 (Medium), or 3 (High). */
export async function reportCrowd(ganpatiId, level) {
  const res = await fetch(`${API_BASE}/api/ganpatis/${ganpatiId}/crowd-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, sessionId: getSessionId() }),
  });
  if (!res.ok) throw new Error(`Failed to report crowd (${res.status})`);
  return res.json();
}

/** Fetch crowd levels for every Ganpati: { [ganpatiId]: { level, label, reportCount } } */
export async function fetchAllCrowdLevels() {
  const res = await fetch(`${API_BASE}/api/crowd`);
  if (!res.ok) throw new Error(`Failed to load crowd data (${res.status})`);
  return res.json();
}