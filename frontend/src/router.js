// Minimal path router. Every screen has a real URL so each pandal can be
// crawled, linked and shared on its own address:
//
//   /                       home
//   /explore                the pandal grid / map
//   /route                  the darshan route (private to the visitor, noindex)
//   /privacy                privacy policy
//   /ganpati/<slug>         one pandal
//
// The build prerenders one HTML file per route (scripts/prerender.mjs), so the
// same paths resolve without JavaScript. Navigation still happens in the client
// via history.pushState: components render a real <a href> (components/Link.jsx)
// and the click handler takes over.
import { useEffect, useState } from 'react';
import { slugify } from './data/helpers.js';

const NAV_EVENT = 'mm:navigate';
const isBrowser = typeof window !== 'undefined';

// Static (non-pandal) paths, in the order they appear in the bottom nav.
export const PATHS = {
  home: '/',
  explore: '/explore',
  route: '/route',
  privacy: '/privacy',
};

/** The path a pandal lives at. */
export function ganpatiPath(g) {
  return `/ganpati/${slugify(g.name)}`;
}

/** Drop a trailing slash so "/explore/" and "/explore" are one route. */
function normalize(pathname) {
  const path = pathname || '/';
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * Which screen a path means: `{ page, slug }`. Unknown paths are 'notfound',
 * which renders a noindex message rather than silently showing home.
 */
export function parsePath(pathname) {
  const path = normalize(pathname);
  if (path === PATHS.home) return { page: 'home', slug: null };
  if (path === PATHS.explore) return { page: 'explore', slug: null };
  if (path === PATHS.route) return { page: 'route', slug: null };
  if (path === PATHS.privacy) return { page: 'privacy', slug: null };
  const match = /^\/ganpati\/([a-z0-9-]+)$/.exec(path);
  if (match) return { page: 'detail', slug: match[1] };
  return { page: 'notfound', slug: null };
}

// How many entries this session pushed onto the history stack, so a "Back" link
// can return to where the visitor actually came from instead of guessing. A
// deep link opened straight from search has none, so Back falls back to a path.
let pushCount = 0;
if (isBrowser) {
  window.addEventListener('popstate', () => {
    pushCount = Math.max(0, pushCount - 1);
  });
}

/** Go to a path within the app, adding a history entry. */
export function navigate(to) {
  if (!isBrowser || normalize(to) === normalize(window.location.pathname)) return;
  window.history.pushState({}, '', to);
  pushCount += 1;
  window.dispatchEvent(new Event(NAV_EVENT));
}

/** Replace the current URL without adding a history entry (legacy ?g= links). */
export function replacePath(to) {
  if (!isBrowser) return;
  window.history.replaceState({}, '', to);
  window.dispatchEvent(new Event(NAV_EVENT));
}

/** True when the browser's Back button would stay inside the app. */
export function canGoBack() {
  return pushCount > 0;
}

/** Step back through the app's own history. */
export function goBack() {
  if (isBrowser) window.history.back();
}

/**
 * The current pathname, kept in sync with pushState navigation and the
 * browser's back/forward buttons. `initialPath` is what the server rendered.
 */
export function usePathname(initialPath) {
  const [pathname, setPathname] = useState(
    () => initialPath ?? (isBrowser ? window.location.pathname : PATHS.home)
  );

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', sync);
    window.addEventListener(NAV_EVENT, sync);
    // A navigation could have landed between first render and this effect.
    sync();
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(NAV_EVENT, sync);
    };
  }, []);

  return pathname;
}

/**
 * The pandal id in a legacy `/?g=<id>` link, or null. Those links were shared
 * before pandals had their own paths, so they are still honoured and rewritten
 * to /ganpati/<slug> once the data is loaded.
 */
export function readLegacyGanpatiId() {
  if (!isBrowser) return null;
  const raw = new URLSearchParams(window.location.search).get('g');
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
