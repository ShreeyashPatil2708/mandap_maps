/**
 * Prerender every route to static HTML, plus sitemap.xml and robots.txt.
 *
 * Runs as the last step of `npm run build` (see package.json), after the client
 * build and the SSR build. Without it the site ships an empty <div id="root">:
 * search engines would have to run JavaScript and wait on an API call to see
 * any content, and every URL would share one title and description.
 *
 * Data comes from the live API, which is public:
 *
 *   PRERENDER_API_URL=https://mandapmaps.in   fetch <url>/api/ganpatis
 *   PRERENDER_DATA_FILE=/path/to.json         read a saved API response instead
 *   PRERENDER_STRICT=1                        no data is a build failure
 *
 * Strict mode is on in CD, so a deploy can never quietly drop the pandal pages.
 * Without it (a plain local build), missing data only warns and leaves the
 * client-rendered shell in place.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(FRONTEND, 'dist');
const SSR_DIST = join(FRONTEND, 'dist-ssr');

const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;
const APP_MARKER = '<!--app-html-->';

const STRICT = process.env.PRERENDER_STRICT === '1';
const API_URL = process.env.PRERENDER_API_URL;
const DATA_FILE = process.env.PRERENDER_DATA_FILE;

// Screens that are not a pandal. `route` is the visitor's own list and 404 is an
// error page, so both are rendered (they still need a title) but neither is
// offered to search engines: seo.js marks them noindex and they stay out of the
// sitemap below.
const STATIC_PAGES = [
  { page: 'home', file: 'index.html', inSitemap: true },
  { page: 'explore', file: 'explore/index.html', inSitemap: true },
  { page: 'privacy', file: 'privacy/index.html', inSitemap: true },
  { page: 'route', file: 'route/index.html', inSitemap: false },
  { page: 'notfound', file: '404.html', inSitemap: false },
];

function fail(message, error) {
  console.error(`prerender: ${message}`);
  if (error) console.error(error);
  process.exit(1);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The Ganpati list, or null when no source is configured. */
async function loadGanpatis() {
  if (DATA_FILE) return JSON.parse(await readFile(DATA_FILE, 'utf8'));
  if (!API_URL) return null;
  const url = `${API_URL.replace(/\/$/, '')}/api/ganpatis`;

  // One retry: a deploy should not fail on a single blip from the edge or a
  // cold API instance.
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`${url} responded ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 2) throw error;
      console.warn(`prerender: ${error.message}, retrying in 5s`);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}

/**
 * Refuse to build pages from data that would produce broken or colliding URLs.
 * A duplicate slug would silently hide one pandal behind another.
 */
function validate(ganpatis, ganpatiPath) {
  if (!Array.isArray(ganpatis) || ganpatis.length === 0) {
    fail('the Ganpati data is empty or not a list');
  }
  const seen = new Map();
  for (const g of ganpatis) {
    if (!g || typeof g.name !== 'string' || !g.name.trim() || !Number.isInteger(g.id)) {
      fail(`a record is missing an id or name: ${JSON.stringify(g)?.slice(0, 120)}`);
    }
    const path = ganpatiPath(g);
    if (path === '/ganpati/') fail(`"${g.name}" has no usable slug`);
    if (seen.has(path)) fail(`"${g.name}" and "${seen.get(path)}" both map to ${path}`);
    seen.set(path, g.name);
  }
}

/**
 * The head for one page: title, the meta tags from seo.js (search, Open Graph
 * and Twitter), the canonical link, and any JSON-LD. Everything written here
 * carries data-mm-seo so the client can replace exactly this set when the
 * visitor navigates (see hooks/useDocumentHead.js).
 */
function headFor(seo, metaTags, jsonLd) {
  const lines = [`<title>${escapeHtml(seo.title)}</title>`];

  for (const tag of metaTags) {
    const identifier = tag.property
      ? `property="${escapeHtml(tag.property)}"`
      : `name="${escapeHtml(tag.name)}"`;
    lines.push(`<meta ${identifier} content="${escapeHtml(tag.content)}" data-mm-seo />`);
  }

  lines.push(`<link rel="canonical" href="${escapeHtml(seo.canonical)}" data-mm-seo />`);

  for (const node of jsonLd) {
    // A JSON-LD block is data, never executed, so it only has to be safe to sit
    // inside <script>: escaping "<" prevents a value closing the tag early.
    const json = JSON.stringify(node).replace(/</g, '\\u003c');
    lines.push(`<script type="application/ld+json" data-mm-seo>${json}</script>`);
  }

  return lines.join('\n    ');
}

async function writeFileIn(relativePath, contents) {
  const target = join(DIST, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

function sitemap(paths, absoluteUrl) {
  const urls = paths
    .map((path) => `  <url>\n    <loc>${escapeHtml(absoluteUrl(path))}</loc>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// Cloudflare prepends its own managed block (which blocks AI training crawlers)
// to whatever we serve here. /api/ is disallowed because the JSON endpoints are
// data, not pages: the same content is already in the prerendered HTML.
function robots(siteUrl) {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

async function main() {
  const template = await readFile(join(DIST, 'index.html'), 'utf8').catch((error) =>
    fail('dist/index.html is missing; run the client build first', error)
  );
  if (!SEO_BLOCK.test(template) || !template.includes(APP_MARKER)) {
    fail('index.html has lost its <!--seo:start--> / <!--app-html--> markers');
  }

  let ganpatis;
  try {
    ganpatis = await loadGanpatis();
  } catch (error) {
    if (STRICT) fail('could not load the Ganpati data', error);
    console.warn(`prerender: skipped, could not load the Ganpati data (${error.message})`);
    return;
  }

  if (!ganpatis) {
    if (STRICT) fail('no data source: set PRERENDER_API_URL or PRERENDER_DATA_FILE');
    console.warn('prerender: skipped, set PRERENDER_API_URL or PRERENDER_DATA_FILE to enable');
    return;
  }

  const { render, seoFor, metaTags, jsonLdFor, ganpatiPath, absoluteUrl, SITE_URL } = await import(
    pathToFileURL(join(SSR_DIST, 'entry-server.js')).href
  );

  validate(ganpatis, ganpatiPath);

  const build = (page, seo, ganpati) =>
    template
      .replace(SEO_BLOCK, headFor(seo, metaTags(seo), jsonLdFor({ page, ganpati })))
      .replace(APP_MARKER, render(seo.path, ganpatis));

  const sitemapPaths = [];

  for (const { page, file, inSitemap } of STATIC_PAGES) {
    const seo = seoFor({ page });
    await writeFileIn(file, build(page, seo));
    if (inSitemap) sitemapPaths.push(seo.path);
  }

  for (const ganpati of ganpatis) {
    const seo = seoFor({ page: 'detail', ganpati });
    await writeFileIn(`${seo.path.slice(1)}/index.html`, build('detail', seo, ganpati));
    sitemapPaths.push(seo.path);
  }

  await writeFileIn('sitemap.xml', sitemap(sitemapPaths, absoluteUrl));
  await writeFileIn('robots.txt', robots(SITE_URL));
  await rm(SSR_DIST, { recursive: true, force: true });

  console.log(
    `prerender: ${STATIC_PAGES.length} static pages, ${ganpatis.length} pandal pages, ` +
      `${sitemapPaths.length} sitemap URLs`
  );
}

await main();
