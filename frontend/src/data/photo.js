import photos from './photos.js';
import { safeHttpUrl } from './helpers.js';

// Photo lookup for a pandal. Kept free of React so the share-card tags in
// seo.js (which also run in Node during the prerender build) can use the same
// resolution as the on-page image in components/PandalPhoto.jsx.

/**
 * Photo for a pandal: the generated photos map (npm run photos) first, then the
 * API's photoUrl. Returns { src, srcSet, credit } or null when there is none.
 */
export function photoFor(g) {
  const entry = photos[g.name];
  if (entry) {
    const url = (w) => safeHttpUrl(`${entry.src}.${w}.webp`);
    // Default src: the largest variant up to 800px, for browsers without srcset.
    const fallback = entry.widths.filter((w) => w <= 800).pop() ?? entry.widths[0];
    const src = url(fallback);
    if (src) {
      return {
        src,
        srcSet: entry.widths.map((w) => `${url(w)} ${w}w`).join(', '),
        credit: entry.credit,
      };
    }
  }
  const src = safeHttpUrl(g.photoUrl);
  return src ? { src, srcSet: undefined, credit: undefined } : null;
}

/**
 * Absolute URL of the largest variant, or null. Share cards (Open Graph,
 * Twitter) take a single image and are shown large, so they want the biggest
 * file rather than the responsive default.
 */
export function largestPhotoUrl(g) {
  const entry = photos[g.name];
  if (entry?.widths?.length) {
    const widest = Math.max(...entry.widths);
    const url = safeHttpUrl(`${entry.src}.${widest}.webp`);
    if (url) return url;
  }
  return safeHttpUrl(g.photoUrl);
}
