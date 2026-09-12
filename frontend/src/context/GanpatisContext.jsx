import { createContext, useContext, useEffect, useState } from 'react';
import { fetchGanpatis } from '../services/ganpatis.js';

// Loads the Ganpati dataset once from the API and shares it with every screen.
// Replaces the old hardcoded frontend/src/data/ganpatis.js module.
const GanpatisContext = createContext({ ganpatis: [], loading: true, error: null });

// `initialData` is the dataset the caller already has: the build-time prerender
// (entry-server.jsx) and the browser (main.jsx, which fetches before mounting
// over prerendered HTML) both pass it, so those renders start with real content
// instead of a loading state. Without it the provider fetches as before.
export function GanpatisProvider({ children, initialData }) {
  const seeded = Boolean(initialData?.length);
  const [state, setState] = useState(
    seeded
      ? { ganpatis: initialData, loading: false, error: null }
      : { ganpatis: [], loading: true, error: null }
  );

  useEffect(() => {
    if (seeded) return undefined;
    let alive = true;
    fetchGanpatis()
      .then((ganpatis) => alive && setState({ ganpatis, loading: false, error: null }))
      .catch((error) => alive && setState({ ganpatis: [], loading: false, error }));
    return () => {
      alive = false;
    };
  }, [seeded]);

  return <GanpatisContext.Provider value={state}>{children}</GanpatisContext.Provider>;
}

export function useGanpatis() {
  return useContext(GanpatisContext);
}
