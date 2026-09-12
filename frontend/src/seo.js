// Per-route search metadata, shared by the build-time prerender
// (scripts/prerender.mjs) and the client (hooks/useDocumentHead.js), so a page
// says the same thing whether a crawler reads the static HTML or a visitor
// navigates to it in the app. Pure data: no React, no browser APIs.
import { ganpatiPath, PATHS } from './router.js';
import { largestPhotoUrl } from './data/photo.js';
import { stripEditorialNotes } from './data/helpers.js';

export const SITE_NAME = 'MandapMaps';

// The one canonical origin. mandapmaps.in and www.mandapmaps.in both serve the
// site, so every page points search engines at this host to keep the duplicate
// out of the index (CloudFront also redirects www here).
export const SITE_URL = 'https://mandapmaps.in';

const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1';
const NO_INDEX = 'noindex, follow';

/** Absolute URL for a site path, for canonical tags and the sitemap. */
export function absoluteUrl(path) {
  return path === PATHS.home ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/**
 * Cut `text` to at most `max` characters on a word boundary, so a description
 * never ends mid-word. Returns '' for empty input.
 */
function clamp(text, max = 155) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}...`;
}

/** "Kasba Peth" rather than "Kasba Peth, Pune", for titles. */
function shortArea(g) {
  return g.areaCategory || (g.area || '').split(',')[0].trim();
}

/** A pandal's description: what it is, then why it matters, then the timings. */
function ganpatiDescription(g) {
  const opening = `${g.name} in ${shortArea(g)}, Pune.`;
  const significance = (g.significance || '').trim();
  if (significance) return clamp(`${opening} ${significance}`);
  const timings = [g.morningAarti, g.eveningAarti].filter(Boolean).join(', ');
  const tail = timings
    ? `Aarti timings (${timings}), history, nearest metro and directions for Ganeshotsav 2026.`
    : 'Aarti timings, history, nearest metro and directions for Ganeshotsav 2026.';
  return clamp(`${opening} ${tail}`);
}

const STATIC_SEO = {
  home: {
    path: PATHS.home,
    title: 'MandapMaps: Pune Ganpati Pandals & Darshan Guide 2026',
    description:
      "Find Pune's Ganpati pandals for Ganeshotsav 2026: the Manache 5, aarti timings, history, live crowd levels and darshan routes you can walk.",
  },
  explore: {
    path: PATHS.explore,
    title: 'All Pune Ganpati Pandals: Map, Areas & Manache 5 | MandapMaps',
    description:
      'Browse every Pune Ganpati pandal, filter by area, tier or tag, see them on a map, and check how busy each mandal is right now.',
  },
  route: {
    path: PATHS.route,
    title: 'My Darshan Route | MandapMaps',
    description: 'The darshan route you have planned across Pune this Ganeshotsav.',
    robots: NO_INDEX,
  },
  privacy: {
    path: PATHS.privacy,
    title: 'Privacy | MandapMaps',
    description:
      'How MandapMaps handles your data: no accounts, anonymous crowd sharing deleted after 30 minutes, and nothing sold or shared with advertisers.',
  },
  notfound: {
    path: '/404',
    title: 'Page not found | MandapMaps',
    description: 'This page does not exist. Browse Pune’s Ganpati pandals instead.',
    robots: NO_INDEX,
  },
};

/**
 * Title, description, canonical URL and robots rule for one screen.
 * `ganpati` is required for the 'detail' page and ignored otherwise.
 */
export function seoFor({ page, ganpati }) {
  if (page === 'detail' && ganpati) {
    const path = ganpatiPath(ganpati);
    const image = largestPhotoUrl(ganpati);
    return {
      path,
      canonical: absoluteUrl(path),
      title: `${ganpati.name}, ${shortArea(ganpati)}: Aarti Timings & History | ${SITE_NAME}`,
      description: ganpatiDescription(ganpati),
      robots: DEFAULT_ROBOTS,
      image,
      imageAlt: image ? ganpati.name : null,
    };
  }

  const entry = STATIC_SEO[page] || STATIC_SEO.notfound;
  return {
    path: entry.path,
    canonical: absoluteUrl(entry.path),
    title: entry.title,
    description: entry.description,
    robots: entry.robots || DEFAULT_ROBOTS,
    image: null,
    imageAlt: null,
  };
}

/**
 * Every meta tag a page needs, in one list, so the prerendered HTML and the
 * client-side update cannot drift apart. Open Graph identifies itself with
 * `property`, Twitter with `name`.
 *
 * Pandals with no photo (99 of 107 today) get no image tag at all: a shared
 * link then previews as title, description and domain, which is the honest
 * result. Inventing a stand-in image is worse than showing none.
 */
export function metaTags(seo) {
  const tags = [
    { name: 'description', content: seo.description },
    { name: 'robots', content: seo.robots },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: 'en_IN' },
    { property: 'og:title', content: seo.title },
    { property: 'og:description', content: seo.description },
    { property: 'og:url', content: seo.canonical },
    { name: 'twitter:card', content: seo.image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: seo.title },
    { name: 'twitter:description', content: seo.description },
  ];

  if (seo.image) {
    tags.push({ property: 'og:image', content: seo.image });
    tags.push({ property: 'og:image:alt', content: seo.imageAlt });
    tags.push({ name: 'twitter:image', content: seo.image });
  }

  return tags;
}

/** Drop keys with no value, so nothing is published as null or empty. */
function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

// Editorial notes the dataset leaves in free-text fields. They are fine on the
// page, but must never be published as though they were the real value.
const PLACEHOLDER = /TO CONFIRM|TO UPDATE|TBD/i;

/**
 * A pandal's address, fit to publish: the same text the page shows, with the
 * maintainers' notes removed (66 of the 107 carry one). Returns null if a note
 * survives, rather than claiming a placeholder is an address.
 */
function streetAddress(g) {
  const cleaned = stripEditorialNotes(g.address);
  return cleaned && !PLACEHOLDER.test(cleaned) ? cleaned : null;
}

/**
 * The town an address names, taken from the words before the PIN code. The data
 * mixes real localities with descriptors ("Pune District", "South Pune"), so
 * anything Pune-ish is published as Pune and Pimpri-Chinchwad keeps its own
 * name. Covers all 107 records today: 92 Pune, 15 Pimpri-Chinchwad.
 */
function locality(address) {
  const match = /([A-Za-z][A-Za-z .'-]*?)\s*,?\s*4\d{5}/.exec(address || '');
  if (!match) return 'Pune';
  const town = match[1].trim().split(',').pop().trim();
  if (!town) return 'Pune';
  return town !== 'Pimpri-Chinchwad' && town.includes('Pune') ? 'Pune' : town;
}

/**
 * One pandal as a place. Only what the page itself shows or the record actually
 * holds: no opening hours (the aarti times are prose, not machine-readable) and
 * no founding date unless `est` starts with a plain year, which it does for 7 of
 * the 107 records; the rest read like "Temple: 15th century; Public
 * Ganeshotsav: 1893".
 */
function ganpatiPlace(g) {
  const url = absoluteUrl(ganpatiPath(g));
  const street = streetAddress(g);
  const postalCode = street?.match(/\b4\d{5}\b/)?.[0];
  const foundingDate = /^\s*(1\d{3}|20[0-2]\d)\b/.exec(g.est || '')?.[1];
  const hasCoords = g.lat != null && g.lng != null;

  return compact({
    '@context': 'https://schema.org',
    '@type': ['HinduTemple', 'TouristAttraction'],
    name: g.name,
    alternateName: g.nameMarathi,
    url,
    description: (g.significance || '').trim(),
    image: largestPhotoUrl(g),
    address: street
      ? compact({
          '@type': 'PostalAddress',
          streetAddress: street,
          postalCode,
          addressLocality: locality(street),
          addressRegion: 'Maharashtra',
          addressCountry: 'IN',
        })
      : null,
    geo: hasCoords ? { '@type': 'GeoCoordinates', latitude: g.lat, longitude: g.lng } : null,
    // Built from the coordinates rather than the record's googleMapsUrl, whose
    // stored values are placeholders that 404.
    hasMap: hasCoords ? `https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}` : null,
    foundingDate,
    isAccessibleForFree: true,
    publicAccess: true,
  });
}

/** Home > Explore > this pandal, matching how the app's Back link behaves. */
function ganpatiBreadcrumb(g) {
  const item = (position, name, path) => ({
    '@type': 'ListItem',
    position,
    name,
    item: absoluteUrl(path),
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      item(1, 'Home', PATHS.home),
      item(2, 'Explore Pandals', PATHS.explore),
      item(3, g.name, ganpatiPath(g)),
    ],
  };
}

/**
 * Structured data for a screen, as a list of JSON-LD nodes. Search engines use
 * it for richer results, and assistants read it when answering questions about
 * Pune's pandals. Listing screens get none: their content is the pandal pages,
 * which carry their own.
 */
export function jsonLdFor({ page, ganpati }) {
  if (page === 'detail' && ganpati) return [ganpatiPlace(ganpati), ganpatiBreadcrumb(ganpati)];
  if (page === 'home') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        inLanguage: 'en-IN',
        description: STATIC_SEO.home.description,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: `${SITE_URL}/`,
      },
    ];
  }
  return [];
}
