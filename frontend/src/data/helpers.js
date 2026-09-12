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
  const point = (s) =>
    s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : (s.address ?? s.name);
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

// Working notes the maintainers left inside brackets in free-text fields, as
// opposed to the many brackets that hold something a visitor wants ("(Kumthekar
// Road)", "(approx. 30 km from Pune)", "(103 steps from the base)"). A bracket
// can mix the two, e.g. "(exact address - TO CONFIRM; near Nimbalkar Talim)",
// so notes are matched per segment rather than by discarding whole brackets.
const EDITORIAL_NOTE =
  /\bTO CONFIRM\b|\bTO UPDATE\b|\bTBD\b|confirm with|ask locals|^(?:exact|specific)\b[^,]*\b(?:address|mandal)\b/i;

/**
 * Free text with the maintainers' notes removed, for anything a visitor reads.
 * "Aundh, Pune 411007 (specific mandal address, TO CONFIRM)" becomes
 * "Aundh, Pune 411007", while "577, NC Kelkar Marg (Kumthekar Road), Narayan
 * Peth" keeps its bracket. Bracket segments are split on a spaced dash or a
 * semicolon, so hyphenated words ("south-east corner") stay intact.
 */
export function stripEditorialNotes(text) {
  return (text || '')
    .replace(/\s*\(([^)]*)\)/g, (_whole, inner) => {
      const kept = inner
        .split(/\s+[-–—]\s+|\s*;\s*/)
        .map((part) => part.trim())
        .filter((part) => part && !EDITORIAL_NOTE.test(part));
      return kept.length ? ` (${kept.join(', ')})` : '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[,\s]+$/, '');
}

/**
 * URL-safe slug for a pandal's English name ("Kasba Ganpati" -> "kasba-ganpati").
 * This is the pandal's address on the site, so it has to stay stable: the API
 * never lets `name_english` be edited (see EDITABLE in ganpatiRepo.js), and the
 * prerender build fails if two names ever collapse to the same slug. Numeric ids
 * are untouched and still identify a pandal everywhere else (photos, crowd
 * reports, the route list).
 */
export function slugify(name) {
  return (name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

// The area chips on Explore and the "Browse by area" tiles on the homepage are
// built from the same counts, so both screens always offer the same areas.
// Areas with only one pandal are left out; they are reachable through search.
const AREA_CHIP_MIN = 2;

export function areaFilters(ganpatis) {
  const counts = {};
  for (const g of ganpatis) {
    if (g.areaCategory) counts[g.areaCategory] = (counts[g.areaCategory] || 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, n]) => n >= AREA_CHIP_MIN)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, label: key, count }));
}

export function buildFilters(ganpatis) {
  return [
    { key: 'all', label: 'All' },
    { key: 'manache5', label: 'Manache 5' },
    ...areaFilters(ganpatis),
  ];
}
