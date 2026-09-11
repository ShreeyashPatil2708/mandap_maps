// UI helpers that used to live alongside the hardcoded dataset. These are
// presentation logic, not data, so they stay in the frontend. The Ganpati
// records themselves now come from the API (see context/GanpatisContext.jsx).

const ORDINALS = ['st', 'nd', 'rd', 'th', 'th'];

/** "1st Manacha", "2nd Manacha", … or '' for non-manache pandals. */
export function manachaBadge(manacha) {
  if (!manacha) return '';
  return `${manacha}${ORDINALS[manacha - 1]} Manacha`;
}

/** Great-circle distance in km between two {lat,lng} points (haversine). */
export function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Short human distance: "800 m" under 1 km, else "1.2 km". */
export function formatDistance(km) {
  if (km == null) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/**
 * Google Maps directions URL (no API key needed) through `stops`, in order;
 * the last stop is the destination. Each point prefers exact coordinates and
 * falls back to the address, then the name.
 *
 * By default no origin is set, so Maps starts from the user's current location
 * and every stop but the last becomes a waypoint. With `originFromFirst`, the
 * first stop is sent as an explicit origin instead (the chat's darshan plan
 * does this: its first stop is the plan's start point).
 */
export function directionsUrl(stops, { originFromFirst = false, travelmode } = {}) {
  const point = (s) => (s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : s.address ?? s.name);
  const destination = encodeURIComponent(point(stops[stops.length - 1]));
  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  if (travelmode) url += `&travelmode=${travelmode}`;
  const useOrigin = originFromFirst && stops.length > 1;
  if (useOrigin) url += `&origin=${encodeURIComponent(point(stops[0]))}`;
  const waypoints = stops
    .slice(useOrigin ? 1 : 0, -1)
    .map((s) => encodeURIComponent(point(s)))
    .join('|');
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

/**
 * Returns `url` only if it is an absolute http(s) URL, else null. Guards links
 * and images built from API data against javascript: / data: URLs.
 */
export function safeHttpUrl(url) {
  if (typeof url !== 'string') return null;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}
