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
