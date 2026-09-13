// Walking estimates and stop ordering for the darshan route.
//
// Everything here works from straight-line distance, so the numbers are
// estimates and the UI always shows them with "~". Only pandals with a map pin
// take part: about half the dataset has no verified location yet, and guessing
// one would put a devotee on the wrong street. Stops without a pin are kept in
// the route, just left out of the maths.
import { distanceKm } from './helpers.js';

// Peth lanes are never a straight line, and festival crowds slow everyone down.
const DETOUR = 1.3;
const WALK_KMH = 4.5;

export function hasLocation(g) {
  return g != null && g.lat != null && g.lng != null;
}

/** Estimated walking distance in km between two pandals, or null without pins. */
export function walkKm(a, b) {
  if (!hasLocation(a) || !hasLocation(b)) return null;
  return distanceKm(a, b) * DETOUR;
}

/** Estimated walking minutes for a distance in km, never less than 1. */
export function walkMinutes(km) {
  return Math.max(1, Math.round((km / WALK_KMH) * 60));
}

/**
 * Totals for consecutive legs where both ends have a pin. `legs` is the number
 * of legs counted, so the caller can tell a real zero from nothing to measure.
 */
export function routeStats(stops) {
  let km = 0;
  let legs = 0;
  for (let i = 1; i < stops.length; i += 1) {
    const leg = walkKm(stops[i - 1], stops[i]);
    if (leg != null) {
      km += leg;
      legs += 1;
    }
  }
  return { km, minutes: legs ? walkMinutes(km) : 0, legs };
}

function pathKm(stops) {
  let km = 0;
  for (let i = 1; i < stops.length; i += 1) km += distanceKm(stops[i - 1], stops[i]);
  return km;
}

/**
 * The shortest walking order we can find, as a list of pandal ids.
 *
 * The first pinned stop stays first, since that is usually where the visitor
 * starts. The rest are ordered nearest-neighbour, then improved with 2-opt
 * (reverse any stretch that makes the path shorter) until nothing improves.
 * Stops without a pin follow at the end, in the order they were in. With the
 * handful of stops a route holds, this is effectively instant.
 */
export function optimizeOrder(stops) {
  const located = stops.filter(hasLocation);
  const unlocated = stops.filter((g) => !hasLocation(g));
  if (located.length < 3) return stops.map((g) => g.id);

  const [start, ...rest] = located;
  const path = [start];
  const remaining = [...rest];
  while (remaining.length) {
    const last = path[path.length - 1];
    let best = 0;
    for (let i = 1; i < remaining.length; i += 1) {
      if (distanceKm(last, remaining[i]) < distanceKm(last, remaining[best])) best = i;
    }
    path.push(remaining.splice(best, 1)[0]);
  }

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < path.length - 1; i += 1) {
      for (let j = i + 1; j < path.length; j += 1) {
        const candidate = [
          ...path.slice(0, i),
          ...path.slice(i, j + 1).reverse(),
          ...path.slice(j + 1),
        ];
        if (pathKm(candidate) + 1e-9 < pathKm(path)) {
          path.splice(0, path.length, ...candidate);
          improved = true;
        }
      }
    }
  }

  return [...path, ...unlocated].map((g) => g.id);
}
