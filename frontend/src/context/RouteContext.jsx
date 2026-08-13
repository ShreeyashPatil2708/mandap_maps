import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Shared darshan route state. The list of selected Ganpati IDs lives here so
// the detail page (Add to Route button) and the route page stay in sync. The
// list is persisted to localStorage so it survives a page refresh. Wire this to
// a backend "saved routes" endpoint in a later phase.
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

export function RouteProvider({ children }) {
  const [route, setRoute] = useState(loadRoute);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(route));
    } catch {
      // Ignore write failures (e.g. private mode); route still works in memory.
    }
  }, [route]);

  const addToRoute = useCallback(
    (id) => setRoute((prev) => (prev.includes(id) ? prev : [...prev, id])),
    []
  );
  const removeFromRoute = useCallback(
    (id) => setRoute((prev) => prev.filter((r) => r !== id)),
    []
  );
  const clearRoute = useCallback(() => setRoute([]), []);
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
    () => ({ route, addToRoute, removeFromRoute, clearRoute, reorderRoute }),
    [route, addToRoute, removeFromRoute, clearRoute, reorderRoute]
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useRoute() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within a RouteProvider');
  return ctx;
}
