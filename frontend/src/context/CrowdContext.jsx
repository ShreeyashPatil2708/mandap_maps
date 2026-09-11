import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { fetchAllCrowdLevels } from '../services/crowd.js';

const CrowdContext = createContext({ crowd: {}, refresh: () => {}, setLevel: () => {} });
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

  // Apply one mandal's fresh level (e.g. returned by a crowd report) right
  // away, without waiting for the next poll.
  const setLevel = useCallback((id, data) => {
    setCrowd((prev) => {
      const next = { ...prev };
      if (data?.level) next[id] = data;
      else delete next[id];
      return next;
    });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const value = useMemo(() => ({ crowd, refresh, setLevel }), [crowd, refresh, setLevel]);

  return <CrowdContext.Provider value={value}>{children}</CrowdContext.Provider>;
}

export function useCrowd() {
  return useContext(CrowdContext);
}
