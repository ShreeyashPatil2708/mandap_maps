import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const VisitedContext = createContext(null);
const STORAGE_KEY = 'mandapmaps.visited';

function loadVisited() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function VisitedProvider({ children }) {
  const [visited, setVisited] = useState(loadVisited);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
    } catch (_e) {
      // localStorage may be unavailable (private browsing, quota exceeded)
    }
  }, [visited]);

  const markVisited = useCallback(
    (id) => setVisited((prev) => new Set([...prev, id])),
    []
  );
  const unmarkVisited = useCallback((id) => {
    setVisited((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ visited, markVisited, unmarkVisited }),
    [visited, markVisited, unmarkVisited]
  );

  return <VisitedContext.Provider value={value}>{children}</VisitedContext.Provider>;
}

export function useVisited() {
  const ctx = useContext(VisitedContext);
  if (!ctx) throw new Error('useVisited must be used within a VisitedProvider');
  return ctx;
}
