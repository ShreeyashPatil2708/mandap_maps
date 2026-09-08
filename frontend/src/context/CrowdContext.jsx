import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchAllCrowdLevels } from '../services/crowd.js';

const CrowdContext = createContext({ crowd: {}, refresh: () => {} });
const POLL_MS = 60_000; // refresh every minute so pins/badges update on their own

export function CrowdProvider({ children }) {
  const [crowd, setCrowd] = useState({});

  const refresh = useCallback(() => {
    fetchAllCrowdLevels()
      .then(setCrowd)
      .catch(() => {
        /* keep showing the last known data on a failed refresh */
      });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return <CrowdContext.Provider value={{ crowd, refresh }}>{children}</CrowdContext.Provider>;
}

export function useCrowd() {
  return useContext(CrowdContext);
}