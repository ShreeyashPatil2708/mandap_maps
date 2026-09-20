import { mapsEmbedUrl } from '../data/helpers.js';

// Keyless Google Maps embed of the route's stops, in order: one stop shows its
// location, several draw a route through them. The iframe is rebuilt from
// `stops` on every render, so add/remove/reorder reloads the map with the new
// route. See mapsEmbedUrl in data/helpers.js for the URL shape.
export default function RouteMap({ stops }) {
  if (stops.length < 1) return null;
  const src = mapsEmbedUrl(stops);
  if (!src) return null;

  return (
    <div className="overflow-hidden rounded-card border border-maroon/[0.08]">
      <iframe
        title="Route map"
        src={src}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        className="h-56 w-full border-0 lg:h-64"
      />
    </div>
  );
}