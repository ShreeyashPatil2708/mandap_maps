import { query } from '../config/db.js';

// Columns selected for the API. Ordered roughly as the UI consumes them.
const SELECT = `
  SELECT id, name_english, name_marathi, manacha_number, tier, category, area,
         year_established, history_english, history_marathi, significance_short,
         idol_description, mandir_address, pandal_address, latitude, longitude,
         morning_aarti, evening_aarti, special_events, tags, metro, food,
         photo_url, google_maps_url, is_manacha
  FROM ganpatis
`;

const num = (v) => (v === null || v === undefined ? null : Number(v));

/**
 * Collapse a free-text area into a canonical neighbourhood used for the Explore
 * filter chips. Takes the leading segment, drops "near " prefixes, bracketed
 * notes and a trailing " area", so "Near Laxmi Road, Budhwar Peth area" and
 * "Laxmi Road / Budhwar Peth area" both become "Laxmi Road".
 */
function normalizeArea(area) {
  let s = (area || '').split(',')[0].split('/')[0].trim();
  s = s.replace(/^near\s+/i, '');
  s = s.replace(/\s*\([^)]*\)/g, '');
  s = s.replace(/\s+area$/i, '');
  return s.trim();
}

/**
 * Map a DB row (snake_case, Postgres types) to the camelCase shape the
 * frontend renders. jsonb (metro/food) and text[] (tags) arrive already
 * parsed by node-postgres; NUMERIC lat/lng arrive as strings.
 */
function toApi(row) {
  return {
    id: row.id,
    name: row.name_english,
    nameMarathi: row.name_marathi,
    area: row.area,
    // Canonical neighbourhood for the Explore filter chips.
    areaCategory: normalizeArea(row.area),
    manacha: row.manacha_number,
    tier: row.tier,
    category: row.category,
    est: row.year_established,
    history: row.history_english,
    historyMarathi: row.history_marathi,
    significance: row.significance_short,
    idol: row.idol_description,
    address: row.mandir_address || row.pandal_address || `${row.name_english}, ${row.area}`,
    lat: num(row.latitude),
    lng: num(row.longitude),
    morningAarti: row.morning_aarti,
    eveningAarti: row.evening_aarti,
    specialEvents: row.special_events,
    tags: row.tags || [],
    metro: row.metro || [],
    food: row.food || [],
    parking: null, // not yet in the dataset; the UI shows a placeholder
    photoUrl: row.photo_url,
    googleMapsUrl: row.google_maps_url,
  };
}

/** All Ganpatis, ordered Manache first (by rank), then by tier and name. */
export async function getAllGanpatis() {
  const { rows } = await query(
    `${SELECT} ORDER BY (manacha_number IS NULL), manacha_number, tier, name_english`
  );
  return rows.map(toApi);
}

/** A single Ganpati by id, or null if not found. */
export async function getGanpatiById(id) {
  const { rows } = await query(`${SELECT} WHERE id = $1`, [id]);
  return rows.length ? toApi(rows[0]) : null;
}
