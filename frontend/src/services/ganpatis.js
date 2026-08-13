// Base URL for the API. Empty in dev (Vite proxies /api to the backend) and in
// prod when the frontend is served behind the same CloudFront domain as /api.
const API_BASE = import.meta.env.VITE_API_URL || '';

/** Fetch the full Ganpati list from the backend. */
export async function fetchGanpatis() {
  const res = await fetch(`${API_BASE}/api/ganpatis`);
  if (!res.ok) throw new Error(`Failed to load Ganpatis (${res.status})`);
  return res.json();
}
