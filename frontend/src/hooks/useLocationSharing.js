import { useEffect } from 'react';
import { getSessionId } from '../data/session.js';

const PING_MS = 60_000; // once a minute is plenty for crowd purposes

/**
 * While `enabled` is true, send an anonymous, coarse location ping once a
 * minute. Reacts to the toggle immediately: turning it off stops the pings
 * right away (no reload needed), turning it on starts them.
 */
export function useLocationSharing(enabled) {
  useEffect(() => {
    if (!enabled || !navigator.geolocation) return undefined;

    let active = true;
    const send = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // The user may have switched sharing off while the fix was pending.
          if (!active) return;
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/locations/ping`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: getSessionId(),
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          }).catch(() => {});
        },
        () => {}, // permission denied or unavailable: fail silently
        { maximumAge: 30_000, timeout: 8_000 }
      );
    };

    send();
    const id = setInterval(send, PING_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [enabled]);
}
