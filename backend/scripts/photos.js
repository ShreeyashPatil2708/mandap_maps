/**
 * Pandal photos: data/photos/<id>.<ext> -> responsive WebP -> S3 -> site.
 *
 *   npm run photos              process + write frontend/src/data/photos.js
 *   npm run photos -- --upload  same, then sync the WebP files to the photos bucket
 *
 * <id> is the pandal's number on the site (mandapmaps.in/?g=<id>). Ids are
 * resolved to pandal names against the live API, so a typo fails here instead
 * of showing the wrong photo. Each photo becomes up to three WebP widths with
 * all metadata (EXIF, GPS) stripped, named <id>.<hash>.<width>.webp. The hash
 * covers the source bytes and the encode settings, so a replaced photo gets a
 * new URL and the year-long immutable cache stays safe.
 *
 * Optional data/photos/credits.json: { "6": "Photo: Name, CC BY-SA 4.0" }.
 *
 * Env overrides: PHOTOS_API_URL, PHOTOS_BASE_URL, PHOTOS_BUCKET, AWS_REGION.
 * The originals live in the private, gitignored data/ folder; only the
 * generated URL map is committed.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir, platform } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import * as prettier from 'prettier';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_DIR = join(ROOT, 'data', 'photos');
const OUT_DIR = join(SRC_DIR, '.out');
const CREDITS_FILE = join(SRC_DIR, 'credits.json');
const MAP_FILE = join(ROOT, 'frontend', 'src', 'data', 'photos.js');

const API_URL = process.env.PHOTOS_API_URL || 'https://mandapmaps.in/api/ganpatis';
const BASE_URL = (process.env.PHOTOS_BASE_URL || 'https://mandapmaps.in/photos').replace(/\/$/, '');
const REGION = process.env.AWS_REGION || 'ap-south-1';

// Card thumbnails, phone detail view, and high-density detail view (the
// content column is at most 480px wide).
const WIDTHS = [400, 800, 1200];
const WEBP = { quality: 78, effort: 5 };
const FILE_RE = /^(\d+)\.(jpe?g|png|webp|avif|heic|heif)$/i;

function fail(msg) {
  console.error(`\nError: ${msg}`);
  process.exit(1);
}

/** Source photos keyed by id. Skips folders, dotfiles and anything unnamed. */
async function readSources() {
  if (!existsSync(SRC_DIR)) fail(`no photos folder at ${relative(ROOT, SRC_DIR)}`);
  const entries = await readdir(SRC_DIR, { withFileTypes: true });
  const byId = new Map();
  for (const e of entries) {
    if (!e.isFile() || e.name.startsWith('.') || e.name === 'credits.json') continue;
    const m = FILE_RE.exec(e.name);
    if (!m) {
      console.warn(`Skipping ${e.name}: name it <id>.jpg, e.g. 6.jpg for ?g=6`);
      continue;
    }
    const id = Number(m[1]);
    if (byId.has(id)) fail(`two photos for pandal ${id}: ${byId.get(id)} and ${e.name}`);
    byId.set(id, e.name);
  }
  return byId;
}

async function readCredits() {
  if (!existsSync(CREDITS_FILE)) return {};
  let credits;
  try {
    credits = JSON.parse(await readFile(CREDITS_FILE, 'utf-8'));
  } catch (err) {
    fail(`credits.json is not valid JSON (${err.message})`);
  }
  for (const [id, text] of Object.entries(credits)) {
    if (typeof text !== 'string') fail(`credits.json: value for "${id}" must be a string`);
  }
  return credits;
}

async function fetchPandals() {
  let res;
  try {
    res = await fetch(API_URL);
  } catch (err) {
    fail(`could not reach ${API_URL} (${err.message})`);
  }
  if (!res.ok) fail(`${API_URL} returned ${res.status}`);
  const list = await res.json();
  return new Map(list.map((g) => [g.id, g.name]));
}

/**
 * Decode a photo into a sharp pipeline. Prebuilt sharp can't read HEVC HEIC
 * (iPhone photos); on macOS those are converted to JPEG with sips first.
 */
async function loadImage(file) {
  const path = join(SRC_DIR, file);
  const buf = await readFile(path);
  try {
    await sharp(buf).metadata();
    await sharp(buf).resize(8).toBuffer(); // metadata alone doesn't prove it decodes
    return buf;
  } catch (err) {
    if (platform() !== 'darwin') fail(`cannot decode ${file} (${err.message}); export it as JPG`);
    const dir = await mkdtemp(join(tmpdir(), 'mm-photo-'));
    try {
      const out = join(dir, 'photo.jpg');
      const r = spawnSync('sips', ['-s', 'format', 'jpeg', path, '--out', out], {
        stdio: 'ignore',
      });
      if (r.status !== 0) fail(`cannot decode ${file}; export it as JPG`);
      return await readFile(out);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

/** Write the WebP variants for one photo; returns its URL base and widths. */
async function processPhoto(id, file) {
  const buf = await loadImage(file);
  const hash = createHash('sha256')
    .update(buf)
    .update(JSON.stringify({ WIDTHS, WEBP }))
    .digest('hex')
    .slice(0, 8);

  // Width after EXIF auto-rotation; never upscale, and drop duplicate widths
  // when the original is smaller than a target.
  const { autoOrient } = await sharp(buf).metadata();
  const widths = [...new Set(WIDTHS.map((w) => Math.min(w, autoOrient.width)))];

  const stem = `${id}.${hash}`;
  for (const w of widths) {
    const out = join(OUT_DIR, `${stem}.${w}.webp`);
    if (existsSync(out)) continue; // same hash = same bytes; keeps s3 sync a no-op
    // sharp drops all metadata (EXIF, GPS, ICC) unless told to keep it.
    await sharp(buf).rotate().resize({ width: w }).webp(WEBP).toFile(out);
  }
  return { src: `${BASE_URL}/${stem}`, widths };
}

async function writeMap(entries) {
  const body = Object.fromEntries(
    entries.map(({ name, id, src, widths, credit }) => [
      name,
      credit ? { id, src, widths, credit } : { id, src, widths },
    ])
  );
  const code = `// Generated by \`npm run photos\` (backend/scripts/photos.js). Do not edit by hand:
// add or replace photos in data/photos/ and re-run the script.
//
// Keyed by pandal name, the stable natural key (\`id\` is the ?g= number on the
// site). Each photo is served as \`\${src}.\${width}.webp\` for every listed width.
const photos = ${JSON.stringify(body, null, 2)};

export default photos;
`;
  // House rule: no em-dashes anywhere in the codebase (they can arrive via a
  // pandal name or a pasted credit line).
  if (code.includes(String.fromCharCode(0x2014)))
    fail('a pandal name or credit contains an em-dash; use a comma');
  const config = await prettier.resolveConfig(MAP_FILE);
  await writeFile(MAP_FILE, await prettier.format(code, { ...config, filepath: MAP_FILE }));
}

function resolveBucket() {
  if (process.env.PHOTOS_BUCKET) return process.env.PHOTOS_BUCKET;
  const r = spawnSync('terraform', ['-chdir=infra', 'output', '-raw', 'photos_bucket'], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  const name = r.status === 0 ? r.stdout.trim() : '';
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name)) {
    fail('could not read the photos bucket from terraform output; set PHOTOS_BUCKET');
  }
  return name;
}

function upload() {
  const bucket = resolveBucket();
  console.log(`\nUploading to s3://${bucket}/photos/ ...`);
  // No --delete: old variants stay until removed deliberately (the bucket is
  // versioned anyway), so a stale cached page never points at a missing file.
  const r = spawnSync(
    'aws',
    [
      's3',
      'sync',
      OUT_DIR,
      `s3://${bucket}/photos/`,
      '--region',
      REGION,
      '--exclude',
      '*',
      '--include',
      '*.webp',
      '--content-type',
      'image/webp',
      '--cache-control',
      'public,max-age=31536000,immutable',
      '--only-show-errors',
    ],
    { stdio: 'inherit' }
  );
  if (r.status !== 0) fail('aws s3 sync failed (are you logged in to the right AWS account?)');
  console.log('Upload done.');
}

async function main() {
  const doUpload = process.argv.includes('--upload');

  const sources = await readSources();
  if (sources.size === 0) fail(`no photos in ${relative(ROOT, SRC_DIR)}`);
  const credits = await readCredits();
  const pandals = await fetchPandals();

  const unknown = [...sources.keys()].filter((id) => !pandals.has(id));
  if (unknown.length) fail(`no pandal with id ${unknown.join(', ')} (check ?g= on the site)`);
  for (const id of Object.keys(credits)) {
    if (!sources.has(Number(id))) console.warn(`credits.json: no photo for id ${id}, ignored`);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const entries = [];
  for (const [id, file] of [...sources].sort((a, b) => a[0] - b[0])) {
    const { src, widths } = await processPhoto(id, file);
    entries.push({ id, name: pandals.get(id), file, src, widths, credit: credits[id] });
  }

  await writeMap(entries);

  console.log('\n id  | file        | pandal');
  console.log('-----+-------------+------------------------------------------');
  for (const e of entries) {
    const credit = e.credit ? `  (${e.credit})` : '';
    console.log(` ${String(e.id).padEnd(3)} | ${e.file.padEnd(11)} | ${e.name}${credit}`);
  }
  console.log(`\n${entries.length} photo(s). Wrote ${relative(ROOT, MAP_FILE)}.`);

  if (doUpload) upload();
  else console.log('Check the table, then run `npm run photos -- --upload` to publish.');
}

main().catch((err) => fail(err.stack || err.message));
