/**
 * Content push: send reviewed text updates for existing pandals to the live site.
 *
 *   npm run content:push              preview only: what would change, nothing sent
 *   npm run content:push -- --apply   back up the live values, then send the changes
 *
 * Reads data/content-updates.json (private, gitignored like the rest of data/):
 *
 *   { "updates": [ { "name_english": "...", "fields": { "history_english": "..." },
 *                    "sources": ["https://..."], "notes": "..." } ] }
 *
 * Each record is matched to the live site by its exact English name and updated
 * through the API's admin-only PATCH /api/ganpatis/:id, which clears that
 * record's cache itself. Nothing else is touched: no deploy, no migration, no
 * schema change. Only text fields the endpoint accepts are allowed, and names,
 * tier, addresses and pins are refused on purpose.
 *
 * The admin secret comes from ADMIN_SECRET, or else from AWS Secrets Manager
 * (the API's own database secret), using your AWS credentials. It is never
 * printed.
 *
 * Before sending, the live values being replaced are written to
 * data/content-backup-<timestamp>.json, so any change can be put back by
 * turning that backup into an update file and pushing it.
 *
 * Env overrides: CONTENT_API_URL, CONTENT_SECRET_ID, AWS_REGION.
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const UPDATES_FILE = join(ROOT, 'data', 'content-updates.json');

const API_URL = (process.env.CONTENT_API_URL || 'https://mandapmaps.in/api/ganpatis').replace(
  /\/$/,
  ''
);
const SECRET_ID = process.env.CONTENT_SECRET_ID || 'mandapmaps/database';
const REGION = process.env.AWS_REGION || 'ap-south-1';
const APPLY = process.argv.includes('--apply');

// Text columns this script may change, and the key each one has in the API's
// response (backend/src/repositories/ganpatiRepo.js toApi), for the preview.
// A subset of the endpoint's EDITABLE list: names, pins, addresses and timings
// are deliberately out of reach. `area` is allowed because its first
// comma-separated part is the Explore filter chip, so a wrong neighbourhood
// puts a pandal under the wrong chip.
const FIELDS = {
  area: 'area',
  history_english: 'history',
  history_marathi: 'historyMarathi',
  significance_short: 'significance',
  idol_description: 'idol',
  year_established: 'est',
  special_events: 'specialEvents',
  did_you_know: 'didYouKnow',
};

function fail(msg) {
  console.error(`\nError: ${msg}`);
  process.exit(1);
}

function short(value, max = 90) {
  const text = String(value ?? '(empty)').replace(/\s+/g, ' ');
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function readUpdates() {
  if (!existsSync(UPDATES_FILE)) fail(`no update file at ${relative(ROOT, UPDATES_FILE)}`);
  let doc;
  try {
    doc = JSON.parse(await readFile(UPDATES_FILE, 'utf-8'));
  } catch (err) {
    fail(`${relative(ROOT, UPDATES_FILE)} is not valid JSON (${err.message})`);
  }
  const updates = doc?.updates;
  if (!Array.isArray(updates) || updates.length === 0) fail('the file has no "updates" list');

  const seen = new Set();
  for (const u of updates) {
    if (!u?.name_english) fail('an update is missing "name_english"');
    if (seen.has(u.name_english)) fail(`"${u.name_english}" appears twice`);
    seen.add(u.name_english);
    const keys = Object.keys(u.fields || {});
    if (keys.length === 0) fail(`"${u.name_english}" has no fields`);
    const refused = keys.filter((k) => !(k in FIELDS));
    if (refused.length) fail(`"${u.name_english}": fields not allowed: ${refused.join(', ')}`);
  }
  return updates;
}

async function readLive() {
  let res;
  try {
    res = await fetch(API_URL);
  } catch (err) {
    fail(`could not reach ${API_URL} (${err.message})`);
  }
  if (!res.ok) fail(`${API_URL} returned ${res.status}`);
  const list = await res.json();
  return new Map(list.map((g) => [g.name, g]));
}

async function adminSecret() {
  if (process.env.ADMIN_SECRET) return process.env.ADMIN_SECRET;
  try {
    const client = new SecretsManagerClient({ region: REGION });
    const res = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
    const secret = JSON.parse(res.SecretString || '{}').ADMIN_SECRET;
    if (!secret) fail(`${SECRET_ID} has no ADMIN_SECRET`);
    return secret;
  } catch (err) {
    fail(`could not read the admin secret from ${SECRET_ID} (${err.message}); set ADMIN_SECRET`);
  }
}

async function main() {
  const updates = await readUpdates();
  const live = await readLive();

  // Work out exactly what would change, record by record.
  const plan = [];
  const missing = [];
  for (const u of updates) {
    const current = live.get(u.name_english);
    if (!current) {
      missing.push(u.name_english);
      continue;
    }
    const changed = Object.entries(u.fields).filter(
      ([column, value]) => (current[FIELDS[column]] ?? null) !== value
    );
    if (changed.length) plan.push({ u, current, changed });
  }

  for (const { u, current, changed } of plan) {
    console.log(`\n${u.name_english} (id ${current.id})`);
    for (const [column, value] of changed) {
      console.log(`  ${column}`);
      console.log(`    was: ${short(current[FIELDS[column]])}`);
      console.log(`    new: ${short(value)}`);
    }
  }

  console.log(
    `\n${plan.length} records to update, ${updates.length - plan.length - missing.length} already current.`
  );
  if (missing.length) {
    console.log(`Not on the live site under that name (skipped): ${missing.join('; ')}`);
  }

  if (!APPLY) {
    console.log('\nPreview only. Run with --apply to send these changes.');
    return;
  }
  if (plan.length === 0) return;

  const secret = await adminSecret();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = join(ROOT, 'data', `content-backup-${stamp}.json`);
  const backup = {
    updates: plan.map(({ u, current, changed }) => ({
      name_english: u.name_english,
      fields: Object.fromEntries(
        changed.map(([column]) => [column, current[FIELDS[column]] ?? null])
      ),
    })),
  };
  await writeFile(backupFile, `${JSON.stringify(backup, null, 2)}\n`);
  console.log(`\nBacked up the current live values to ${relative(ROOT, backupFile)}`);

  for (const { u, current, changed } of plan) {
    const res = await fetch(`${API_URL}/${current.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify(Object.fromEntries(changed)),
    });
    if (!res.ok) {
      fail(
        `${u.name_english}: the API returned ${res.status}; stopped here, earlier records were sent`
      );
    }
    console.log(`Updated ${u.name_english}`);
  }
  console.log(`\nDone: ${plan.length} records updated.`);
}

await main();
