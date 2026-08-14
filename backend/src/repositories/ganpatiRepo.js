import { query } from '../config/db.js';

// Columns selected for the API. Ordered roughly as the UI consumes them.
const SELECT = `
  SELECT id, name_english, name_marathi, manacha_number, tier, category, area,
         year_established, history_english, history_marathi, significance_short,
         idol_description, mandir_address, pandal_address, latitude, longitude,
         morning_aarti, evening_aarti, special_events, tags, did_you_know,
         metro, food, photo_url, google_maps_url, is_manacha, data_verified
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
    didYouKnow: row.did_you_know,
    metro: row.metro || [],
    food: row.food || [],
    parking: null, // not yet in the dataset; the UI shows a placeholder
    photoUrl: row.photo_url,
    googleMapsUrl: row.google_maps_url,
    dataVerified: row.data_verified,
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

// Columns an admin may PATCH. Structural/identity fields (name_english, tier,
// manacha_number, is_manacha) are intentionally excluded to protect the natural
// key and the manacha constraints. jsonb columns are sent as JSON text.
const EDITABLE = new Set([
  'name_marathi',
  'category',
  'area',
  'year_established',
  'history_english',
  'history_marathi',
  'significance_short',
  'idol_description',
  'mandir_address',
  'pandal_address',
  'latitude',
  'longitude',
  'morning_aarti',
  'evening_aarti',
  'special_events',
  'tags',
  'did_you_know',
  'metro',
  'food',
  'photo_url',
  'google_maps_url',
  'data_verified',
]);
const JSONB_COLUMNS = new Set(['metro', 'food']);

/**
 * Patch an existing Ganpati. `patch` keys are snake_case column names; only
 * those in EDITABLE are applied, everything else is ignored. Returns the updated
 * record (mapped to the API shape), null if the id does not exist, or throws a
 * tagged error if no valid fields were supplied.
 */
export async function updateGanpati(id, patch) {
  const cols = Object.keys(patch || {}).filter((c) => EDITABLE.has(c));
  if (cols.length === 0) {
    const err = new Error('no editable fields provided');
    err.code = 'NO_FIELDS';
    throw err;
  }

  const set = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
  const values = cols.map((c) =>
    JSONB_COLUMNS.has(c) ? JSON.stringify(patch[c] ?? []) : patch[c]
  );

  const { rows } = await query(
    `UPDATE ganpatis SET ${set} WHERE id = $1 RETURNING id`,
    [id, ...values]
  );
  if (rows.length === 0) return null;
  return getGanpatiById(id);
}
