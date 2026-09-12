/**
 * Data review: find the pandal records worth a human check.
 *
 *   npm run data:review
 *
 * Writes two worklists to data/review/ (gitignored, like the rest of data/):
 *
 *   coordinates-to-check.csv   pins whose location looks wrong, worst first
 *   addresses-to-confirm.csv   addresses still carrying a "TO CONFIRM" note
 *
 * It changes nothing. Every row is a suggestion for a person to verify, because
 * the source of truth for where a mandal is cannot be guessed: an address or a
 * pin that is confidently wrong sends someone down the wrong lane at night.
 *
 * Why the coordinates need this at all: precision across the dataset ranges from
 * 2 decimal places (about 1.1 km) to 6, two mandals share one coordinate, and
 * spot checks land in the wrong peth. Reverse geocoding each point tells us what
 * is actually there, which is compared against the record's own address.
 *
 * Geocoding uses OpenStreetMap Nominatim, whose usage policy allows one request
 * per second with an identifying User-Agent. Results are cached, so a re-run
 * after fixing a few records costs nothing.
 *
 * Env overrides: REVIEW_API_URL, REVIEW_OUT_DIR.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The display helper the site itself uses, so "confirmed" here means the same
// thing it means on the page.
import { stripEditorialNotes } from '../../frontend/src/data/helpers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = process.env.REVIEW_OUT_DIR || join(ROOT, 'data', 'review');
const CACHE_FILE = join(OUT_DIR, '.geocode-cache.json');
const API_URL = process.env.REVIEW_API_URL || 'https://mandapmaps.in/api/ganpatis';

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'MandapMapsDataReview/1.0 (+https://mandapmaps.in)';
const REQUEST_GAP_MS = 1100; // Nominatim: at most one request per second.

// Named temples and mandals across greater Pune, used to suggest a coordinate
// for records whose pin looks wrong. One query per run, then cached.
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const OSM_CACHE_FILE = join(OUT_DIR, '.osm-features.json');
const OVERPASS_QUERY = `
  [out:json][timeout:120];
  (
    nwr["amenity"="place_of_worship"](18.35,73.60,18.80,74.10);
    nwr["name"~"Ganpati|Ganapati|Ganesh|Ganesha|Mandal|Talim|Jogeshwari|Mandir",i](18.35,73.60,18.80,74.10);
  );
  out center tags;`;

// Wikidata covers temples OpenStreetMap misses, and disagrees with it usefully:
// for Tulshibaug, OSM offers the Ram Mandir next door while Wikidata has the
// Ganapati temple itself. Two independent sources agreeing is the best evidence
// available without going to a paid geocoder.
const WIKIDATA = 'https://query.wikidata.org/sparql';
const WIKIDATA_CACHE_FILE = join(OUT_DIR, '.wikidata-features.json');
const WIKIDATA_QUERY = `
  SELECT ?item ?itemLabel ?coord WHERE {
    SERVICE wikibase:around {
      ?item wdt:P625 ?coord .
      bd:serviceParam wikibase:center "Point(73.8567 18.5204)"^^geo:wktLiteral .
      bd:serviceParam wikibase:radius "45" .
    }
    ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel)="en")
    FILTER(CONTAINS(LCASE(?itemLabel),"ganpati") || CONTAINS(LCASE(?itemLabel),"ganesh") ||
           CONTAINS(LCASE(?itemLabel),"mandir") || CONTAINS(LCASE(?itemLabel),"temple") ||
           CONTAINS(LCASE(?itemLabel),"mandal"))
  }`;

// A suggestion further than this from the current pin is more likely a
// same-named place elsewhere than a correction.
const CANDIDATE_MAX_KM = 1;

// Two sources this close together are describing the same building.
const CORROBORATION_M = 150;

// Precision below this many decimal places is roughly 100 m or worse, too coarse
// to put a pin on the right building.
const MIN_DECIMALS = 4;

const PLACEHOLDER = /TO CONFIRM|TO UPDATE|TBD/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Decimal places in a coordinate, as written. */
function decimals(value) {
  const text = String(value);
  return text.includes('.') ? text.split('.')[1].length : 0;
}

/** The 6-digit PIN in a free-text address, or null. */
function pinOf(address) {
  return (address || '').match(/\b4\d{5}\b/)?.[0] ?? null;
}

/** Words worth comparing between two place names ("Kasba Peth" -> ["kasba"]). */
function significantWords(text) {
  const filler = new Set(['peth', 'road', 'pune', 'near', 'area', 'nagar', 'chowk']);
  return (text || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 4 && !filler.has(word));
}

// Words shared by many mandal names, useless for telling two of them apart.
const GENERIC_NAME_WORDS = new Set([
  'ganpati',
  'ganapati',
  'ganesh',
  'ganesha',
  'mandal',
  'temple',
  'mandir',
  'trust',
  'sarvajanik',
  'mitra',
  'tarun',
  'utsav',
  'seva',
  'talim',
  // Place-name suffixes that turn up all over Pune ("Manik Baug", "Vishrambag
  // Wada"), so they cannot identify a particular mandal either.
  'baug',
  'bagh',
  'wada',
]);

/**
 * The words that actually identify one mandal, dropping anything generic or
 * shared with a neighbourhood name (a pin in Ganesh Peth should not look like a
 * hit for every mandal with "Ganesh" in its name).
 */
function identifyingWords(name, areaWords) {
  const words = significantWords(name).filter((word) => !GENERIC_NAME_WORDS.has(word));
  const distinctive = words.filter((word) => !areaWords.has(word));
  // Some mandals are named for nothing but their neighbourhood ("Tulshibaug
  // Ganpati", "Kasba Ganpati"). Dropping the area word would leave nothing to
  // match on, so fall back to it; the suggestion still gets a human's eye.
  return distinctive.length ? distinctive : words;
}

/** Metres between two points, for judging how far a suggestion moves a pin. */
function metresBetween(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(a)));
}

async function cached(file, fetcher) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    const value = await fetcher();
    await writeFile(file, JSON.stringify(value));
    return value;
  }
}

/** Named temples from Wikidata, within 45 km of Pune. */
async function wikidataFeatures() {
  const url = `${WIKIDATA}?query=${encodeURIComponent(WIKIDATA_QUERY)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`Wikidata responded ${response.status}`);
  const body = await response.json();

  return body.results.bindings
    .map((row) => {
      const point = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(row.coord.value);
      return point
        ? {
            name: row.itemLabel.value,
            lat: Number(point[2]),
            lng: Number(point[1]),
            url: row.item.value.replace('http://www.wikidata.org/entity/', 'https://www.wikidata.org/wiki/'),
            source: 'Wikidata',
          }
        : null;
    })
    .filter(Boolean);
}

/** Named temples and mandals from OpenStreetMap, fetched once and cached. */
async function fetchOsmFeatures() {

  const response = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'text/plain' },
    body: OVERPASS_QUERY,
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`Overpass responded ${response.status}`);
  const body = await response.json();

  return (body.elements || [])
    .filter((element) => element.tags?.name)
    .map((element) => ({
      name: element.tags.name,
      lat: element.lat ?? element.center?.lat,
      lng: element.lon ?? element.center?.lon,
      url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      source: 'OpenStreetMap',
      worship:
        element.tags.amenity === 'place_of_worship' ||
        /mandir|temple|ganpati|ganesh/i.test(element.tags.name),
    }))
    .filter((feature) => feature.lat != null && feature.worship);
}

/** Both reference sources, merged into one candidate pool. */
async function referenceTemples() {
  const [osm, wikidata] = await Promise.all([
    cached(OSM_CACHE_FILE, fetchOsmFeatures),
    cached(WIKIDATA_CACHE_FILE, wikidataFeatures),
  ]);
  return [...osm, ...wikidata];
}

/**
 * The reference temple that looks like this record, or null.
 *
 * Every distinctive word of the shorter name has to appear in the other, which
 * is a deliberately loose bar: this is a shortlist for a person, not an answer.
 * Checking one run by hand, 9 of 16 OpenStreetMap suggestions were the right
 * mandal and the rest were a gym, a school, a Ram temple and a different mandal
 * from this very list. So each row is labelled with how much to trust it, and
 * nothing is ever applied automatically.
 */
function suggestPlace(g, features, areaWords) {
  const ours = identifyingWords(g.name, areaWords);
  if (!ours.length) return null;

  const candidates = [];
  for (const feature of features) {
    const theirs = identifyingWords(feature.name, areaWords);
    if (!theirs.length) continue;
    const shared = ours.filter((word) => theirs.includes(word));
    if (shared.length < Math.min(ours.length, theirs.length)) continue;

    const metres = metresBetween(g.lat, g.lng, feature.lat, feature.lng);
    if (metres <= CANDIDATE_MAX_KM * 1000) {
      candidates.push({ feature, metres, exactName: ours.length === theirs.length });
    }
  }
  if (!candidates.length) return null;

  candidates.sort((a, b) => a.metres - b.metres);
  const best = candidates[0];
  const corroborated = candidates.some(
    (other) =>
      other.feature.source !== best.feature.source &&
      metresBetween(best.feature.lat, best.feature.lng, other.feature.lat, other.feature.lng) <=
        CORROBORATION_M
  );

  return {
    ...best,
    confidence: corroborated
      ? 'two sources agree'
      : best.exactName
        ? 'names match'
        : 'check carefully',
  };
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/** What OpenStreetMap says is at a point. Cached, and never fatal. */
async function reverseGeocode(lat, lng, cache) {
  const key = `${lat},${lng}`;
  if (cache[key]) return cache[key];

  const url = `${NOMINATIM}?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Nominatim responded ${response.status}`);
    const body = await response.json();
    const address = body.address || {};
    cache[key] = {
      place: body.display_name || '',
      locality:
        address.suburb ||
        address.neighbourhood ||
        address.city_district ||
        address.village ||
        address.town ||
        '',
      road: address.road || '',
      postcode: address.postcode || '',
    };
  } catch (error) {
    cache[key] = { place: `lookup failed: ${error.message}`, locality: '', road: '', postcode: '' };
  }
  await sleep(REQUEST_GAP_MS);
  return cache[key];
}

/**
 * Why this pin looks suspect, and how strongly.
 *
 * The strongest signals are a pin that sits on a different mandal in this very
 * dataset, and a neighbourhood that disagrees with the record's own area. A PIN
 * code mismatch is weighted lower on purpose: OpenStreetMap reports 411001 for
 * much of the old city, so it disagrees with correct records too.
 */
function assess(g, osm, duplicates, otherMandals) {
  const flags = [];
  let score = 0;
  const actual = `${osm.locality} ${osm.road} ${osm.place}`.toLowerCase();
  // Only the first part of the display name is the thing standing at the pin;
  // the rest is the street and city around it, where another mandal's name
  // means nothing ("Chimaji Appa Peshwe Path" is just a road). And when that
  // first part IS the street, there is no building to compare against, so the
  // check is skipped rather than matching roads like "Guruji Marg".
  const nearest = osm.place.split(',')[0];
  const atThePin =
    nearest.toLowerCase() === (osm.road || '').toLowerCase() ? '' : nearest.toLowerCase();

  for (const [word, name] of otherMandals) {
    if (name !== g.name && atThePin.includes(word)) {
      flags.push(`pin sits on ${name}`);
      score += 3;
      break;
    }
  }

  const expected = significantWords(g.areaCategory || g.area);
  if (expected.length && !expected.some((word) => actual.includes(word))) {
    flags.push(`area "${g.areaCategory || g.area}" not found at pin`);
    score += 3;
  }

  const recordPin = pinOf(g.address);
  if (recordPin && osm.postcode && recordPin !== osm.postcode) {
    flags.push(`PIN ${recordPin} vs ${osm.postcode}`);
    score += 2;
  }

  const worst = Math.min(decimals(g.lat), decimals(g.lng));
  if (worst < MIN_DECIMALS) {
    flags.push(`only ${worst} decimal places`);
    score += 1;
  }

  if (duplicates.has(`${g.lat},${g.lng}`)) {
    flags.push('coordinate shared with another mandal');
    score += 1;
  }

  if (osm.place.startsWith('lookup failed')) {
    flags.push('geocoding failed, check by hand');
    score += 1;
  }

  return { flags, score };
}

function csv(rows) {
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `${rows.map((row) => row.map(escape).join(',')).join('\n')}\n`;
}

async function main() {
  const response = await fetch(API_URL, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${API_URL} responded ${response.status}`);
  const ganpatis = await response.json();

  await mkdir(OUT_DIR, { recursive: true });
  const cache = await loadCache();

  // Addresses first: no network needed.
  const unconfirmed = ganpatis.filter((g) => PLACEHOLDER.test(g.address || ''));
  await writeFile(
    join(OUT_DIR, 'addresses-to-confirm.csv'),
    csv([
      ['name', 'area', 'address_in_data', 'shown_to_visitors', 'confirmed_address', 'open_in_maps'],
      ...unconfirmed.map((g) => [
        g.name,
        g.area,
        g.address,
        stripEditorialNotes(g.address),
        '',
        `https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}`,
      ]),
    ])
  );

  const seen = new Map();
  for (const g of ganpatis) {
    const key = `${g.lat},${g.lng}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const duplicates = new Set([...seen].filter(([, count]) => count > 1).map(([key]) => key));

  const pending = ganpatis.filter((g) => g.lat != null && g.lng != null);
  const uncached = pending.filter((g) => !cache[`${g.lat},${g.lng}`]).length;
  console.log(
    `Reviewing ${pending.length} coordinates (${uncached} to look up, about ${Math.ceil(
      (uncached * REQUEST_GAP_MS) / 1000
    )}s)...`
  );

  // Distinctive name words, so a pin landing on another mandal is recognised.
  const areaWords = new Set(ganpatis.flatMap((g) => significantWords(g.areaCategory || g.area)));
  const otherMandals = ganpatis.flatMap((g) =>
    identifyingWords(g.name, areaWords).map((word) => [word, g.name])
  );

  const reviewed = [];
  for (const g of pending) {
    const osm = await reverseGeocode(g.lat, g.lng, cache);
    const { flags, score } = assess(g, osm, duplicates, otherMandals);
    if (score > 0) reviewed.push({ g, osm, flags, score });
  }
  reviewed.sort((a, b) => b.score - a.score || a.g.name.localeCompare(b.g.name));

  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  await writeFile(
    join(OUT_DIR, 'coordinates-to-check.csv'),
    csv([
      [
        'score',
        'name',
        'area_in_data',
        'latitude',
        'longitude',
        'what_is_actually_at_this_pin',
        'problems',
        'corrected_latitude',
        'corrected_longitude',
        'open_in_maps',
      ],
      ...reviewed.map(({ g, osm, flags, score }) => [
        score,
        g.name,
        g.areaCategory || g.area,
        g.lat,
        g.lng,
        osm.place,
        flags.join('; '),
        '',
        '',
        `https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}`,
      ]),
    ])
  );

  // Candidate coordinates from OpenStreetMap and Wikidata, for every record:
  // a pin can be wrong without tripping any of the flags above.
  let suggestions = [];
  try {
    const features = await referenceTemples();
    suggestions = ganpatis
      .filter((g) => g.lat != null && g.lng != null)
      .map((g) => ({ g, match: suggestPlace(g, features, areaWords) }))
      .filter(({ match }) => match);
    await writeFile(
      join(OUT_DIR, 'coordinates-suggested.csv'),
      csv([
        [
          'confidence',
          'name',
          'current_latitude',
          'current_longitude',
          'source',
          'source_name_for_this_place',
          'suggested_latitude',
          'suggested_longitude',
          'pin_moves_metres',
          'source_link',
          'you_checked_it',
        ],
        ...suggestions
          .sort((a, b) => b.match.metres - a.match.metres)
          .map(({ g, match }) => [
            match.confidence,
            g.name,
            g.lat,
            g.lng,
            match.feature.source,
            match.feature.name,
            match.feature.lat,
            match.feature.lng,
            match.metres,
            match.feature.url,
            '',
          ]),
      ])
    );
  } catch (error) {
    console.warn(`OpenStreetMap suggestions skipped: ${error.message}`);
  }

  const serious = reviewed.filter((row) => row.score >= 3);
  console.log(`\nWrote to ${OUT_DIR}:`);
  console.log(`  addresses-to-confirm.csv   ${unconfirmed.length} addresses`);
  console.log(
    `  coordinates-to-check.csv   ${reviewed.length} pins flagged, ${serious.length} of them likely in the wrong place`
  );
  if (suggestions.length) {
    const agreed = suggestions.filter((s) => s.match.confidence === 'two sources agree').length;
    const named = suggestions.filter((s) => s.match.confidence === 'names match').length;
    console.log(
      `  coordinates-suggested.csv  ${suggestions.length} candidates (${agreed} corroborated by both sources, ${named} on a name match)`
    );
  }
  console.log('\nWorst pins:');
  for (const { g, osm, flags, score } of reviewed.slice(0, 8)) {
    console.log(`  [${score}] ${g.name}: ${flags.join('; ')}`);
    console.log(`        pin is at: ${osm.place.slice(0, 80)}`);
  }
  console.log('\nA PIN code mismatch on its own is weak evidence: OpenStreetMap reports 411001');
  console.log('for much of the old city. Trust the "pin sits on" and area flags first.');
  console.log('\nNothing was changed. Fill in the blank columns, then update the spreadsheet.');
}

main().catch((error) => {
  console.error('Data review failed:', error);
  process.exitCode = 1;
});
