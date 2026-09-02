import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const SavedContext = createContext(null);
const STORAGE_KEY = 'mandapmaps.saved';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function SavedProvider({ children }) {
  const [saved, setSaved] = useState(loadSaved);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved]));
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded)
    }
  }, [saved]);

  const saveGanpati = useCallback(
    (id) => setSaved((prev) => new Set([...prev, id])),
    []
  );
  const unsaveGanpati = useCallback((id) => {
    setSaved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ saved, saveGanpati, unsaveGanpati }),
    [saved, saveGanpati, unsaveGanpati]
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used within a SavedProvider');
  return ctx;
}
