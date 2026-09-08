import { useEffect } from 'react';
import { getSessionId } from '../data/session.js';

const PING_MS = 60_000; // once a minute is plenty for crowd purposes

export function useLocationSharing() {
  useEffect(() => {
    const enabled = localStorage.getItem('mandapmaps.shareLocation') === 'true';
    if (!enabled || !navigator.geolocation) return;

    const send = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
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
        () => {}, // permission denied or unavailable — fail silently
        { maximumAge: 30_000, timeout: 8_000 }
      );
    };

    send();
    const id = setInterval(send, PING_MS);
    return () => clearInterval(id);
  }, []);
}