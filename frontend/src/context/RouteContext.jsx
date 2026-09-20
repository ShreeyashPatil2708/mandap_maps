import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SITE_URL } from '../seo.js';
import { PATHS } from '../router.js';

// Shared darshan route state. The list of selected Ganpati IDs lives here so
// the detail page (Add to Route button) and the route page stay in sync. The
// list is persisted to localStorage so it survives a page refresh. Wire this to
// a backend "saved routes" endpoint in a later phase.
//
// A route can be shared with friends as a code on the fresh URL
// `/route?stops=1-5-3-7-9`: the ordered IDs joined with dashes. The route page
// builds this URL (and a native share sheet) for the visitor, and a friend who
// opens it — or types the code on /join — gets the same stops loaded locally.
const RouteContext = createContext(null);
const STORAGE_KEY = 'mandapmaps.route';

function loadRoute() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Ordered Ganpati IDs from a shared route code ("1-5-3-7-9"), or null when the
 * text holds no valid route. Tolerant on purpose: the /join box accepts the
 * code however it was pasted (spaces, commas) and keeps only numeric ids.
 */
export function parseRouteCode(code) {
  if (typeof code !== 'string') return null;
  const ids = (code.match(/\d+/g) || [])
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length ? ids : null;
}

/** The shareable code for an ordered list of ids: "1-5-3-7-9". */
export function routeCode(ids) {
  return (ids || []).map((id) => id).join('-');
}

/** The absolute shareable URL for a route, or null when there is no route. */
export function shareUrlFor(ids) {
  const code = routeCode(ids);
  return code ? `${SITE_URL}${PATHS.route}?stops=${encodeURIComponent(code)}` : null;
}

/** The ordered ids a visitor landed with via `/route?stops=...`, else null. */
export function readSharedRouteFromUrl() {
  if (typeof window === 'undefined') return null;
  return parseRouteCode(new URLSearchParams(window.location.search).get('stops'));
}

export function RouteProvider({ children }) {
  const [route, setRoute] = useState(loadRoute);
  // Latest route for callbacks, so addToRoute can stay stable.
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(route));
    } catch {
      // Ignore write failures (e.g. private mode); route still works in memory.
    }
  }, [route]);

  // Adds a stop, only when it is new (re-adding an existing stop is a no-op).
  // The route stays local; nothing is sent to the API.
  const addToRoute = useCallback((id) => {
    if (routeRef.current.includes(id)) return;
    routeRef.current = [...routeRef.current, id];
    setRoute((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);
  const removeFromRoute = useCallback((id) => setRoute((prev) => prev.filter((r) => r !== id)), []);
  const clearRoute = useCallback(() => setRoute([]), []);
  // Replaces the whole list in one step, e.g. with a reordered route.
  const replaceRoute = useCallback((ids) => setRoute([...ids]), []);
  const reorderRoute = useCallback(
    (from, to) =>
      setRoute((prev) => {
        if (to < 0 || to >= prev.length || from === to) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      }),
    []
  );

  const value = useMemo(
    () => ({ route, addToRoute, removeFromRoute, clearRoute, reorderRoute, replaceRoute }),
    [route, addToRoute, removeFromRoute, clearRoute, reorderRoute, replaceRoute]
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useRoute() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within a RouteProvider');
  return ctx;
}
