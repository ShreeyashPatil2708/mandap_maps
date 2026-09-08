import { getAllGanpatis } from '../repositories/ganpatiRepo.js';
import { getRecentPings, purgeOldPings } from '../repositories/locationRepo.js';
import { addCrowdReport } from '../repositories/crowdRepo.js';

const RADIUS_METERS = 100;

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function runCrowdAggregation() {
  const [ganpatis, pings] = await Promise.all([getAllGanpatis(), getRecentPings(5)]);

  for (const g of ganpatis) {
    if (g.lat == null || g.lng == null) continue;
    const nearby = pings.filter(
      (p) => distanceMeters(g.lat, g.lng, Number(p.latitude), Number(p.longitude)) <= RADIUS_METERS
    ).length;

    // Tune these thresholds against real footfall once you have festival data.
    const level = nearby >= 40 ? 3 : nearby >= 15 ? 2 : nearby > 0 ? 1 : null;
    if (level) {
      await addCrowdReport(g.id, level);
    }
  }

  await purgeOldPings(30);
}