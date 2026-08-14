import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Pune city centre and a generous greater-Pune bound. The map is locked to this
// box (and a zoom floor) so only a small, bounded set of OSM tiles ever loads,
// and users can't drift off to the rest of the world.
const PUNE_CENTRE = [18.5204, 73.8567];
const PUNE_BOUNDS = [
  [18.3, 73.6],
  [18.75, 74.05],
];

// A maroon teardrop pin with a gold centre, built as a divIcon so we avoid
// Leaflet's default marker image (which breaks under Vite's asset handling).
// Colours are the project's maroon/gold design tokens.
const pinIcon = L.divIcon({
  className: 'mm-pin',
  html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.82 0 0 5.82 0 13c0 9.25 13 21 13 21s13-11.75 13-21C26 5.82 20.18 0 13 0z" fill="#6B1E2E"/>
      <circle cx="13" cy="13" r="5" fill="#C9A84C"/>
    </svg>`,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  tooltipAnchor: [0, -30],
});

// Open a pandal's detail in a new tab via its shareable deep link, so the map
// (and the user's zoom/scroll position) stays put in the current tab.
function openInNewTab(id) {
  window.open(`${window.location.pathname}?g=${id}`, '_blank', 'noopener');
}

// Map of the pandals passed in (already filtered/searched by Explore). Pins
// without coordinates are skipped. Hovering a pin shows the name (desktop);
// clicking/tapping opens that pandal's detail in a new tab. Two-finger / scroll
// zoom is enabled alongside pinch and the +/- controls.
export default function MapView({ ganpatis }) {
  const pins = ganpatis.filter((g) => g.lat != null && g.lng != null);

  return (
    <div className="overflow-hidden rounded-card border border-maroon/[0.08]">
      <MapContainer
        center={PUNE_CENTRE}
        zoom={13}
        minZoom={11}
        maxZoom={18}
        maxBounds={PUNE_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom
        style={{ height: '440px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((g) => (
          <Marker
            key={g.id}
            position={[g.lat, g.lng]}
            icon={pinIcon}
            eventHandlers={{ click: () => openInNewTab(g.id) }}
          >
            <Tooltip direction="top">{g.name}</Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
