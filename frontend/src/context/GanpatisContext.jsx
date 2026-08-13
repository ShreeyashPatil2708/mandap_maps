import { createContext, useContext, useEffect, useState } from 'react';
import { fetchGanpatis } from '../services/ganpatis.js';

// Loads the Ganpati dataset once from the API and shares it with every screen.
// Replaces the old hardcoded frontend/src/data/ganpatis.js module.
const GanpatisContext = createContext({ ganpatis: [], loading: true, error: null });

export function GanpatisProvider({ children }) {
  const [state, setState] = useState({ ganpatis: [], loading: true, error: null });

  useEffect(() => {
    let alive = true;
    fetchGanpatis()
      .then((ganpatis) => alive && setState({ ganpatis, loading: false, error: null }))
      .catch((error) => alive && setState({ ganpatis: [], loading: false, error }));
    return () => {
      alive = false;
    };
  }, []);

  return <GanpatisContext.Provider value={state}>{children}</GanpatisContext.Provider>;
}

export function useGanpatis() {
  return useContext(GanpatisContext);
}
