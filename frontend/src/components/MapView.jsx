import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useCrowd } from '../context/CrowdContext.jsx';
import { ganpatiPath } from '../router.js';

// Pune city centre and a generous greater-Pune bound. The map is locked to this
// box (and a zoom floor) so only a small, bounded set of OSM tiles ever loads,
// and users can't drift off to the rest of the world.
const PUNE_CENTRE = [18.5204, 73.8567];
const PUNE_BOUNDS = [
  [18.3, 73.6],
  [18.75, 74.05],
];

// A teardrop pin with a gold centre, built as a divIcon so we avoid Leaflet's
// default marker image (which breaks under Vite's asset handling). The fill is
// a parameter so pins can show live crowd levels.
function makePinIcon(color) {
  return L.divIcon({
    className: 'mm-pin',
    html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 9.25 13 21 13 21s13-11.75 13-21C26 5.82 20.18 0 13 0z" fill="${color}"/>
        <circle cx="13" cy="13" r="5" fill="#C9A84C"/>
      </svg>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    tooltipAnchor: [0, -30],
  });
}

const DEFAULT_COLOR = '#6B1E2E'; // brand maroon (no crowd data)
// Same hexes as the `crowd` design tokens in tailwind.config.js. Kept as a plain
// map here because Leaflet pin icons take a raw color string, not a CSS class.
const CROWD_COLORS = { 1: '#3E8E5A', 2: '#C99A2E', 3: '#B23A3A' }; // low / med / high

// Only four pin variants exist, so build each icon once instead of one per pin
// on every render (the crowd poll re-renders the whole map every minute).
const DEFAULT_ICON = makePinIcon(DEFAULT_COLOR);
const CROWD_ICONS = Object.fromEntries(
  Object.entries(CROWD_COLORS).map(([level, color]) => [level, makePinIcon(color)])
);

// Open a pandal's detail in a new tab via its shareable deep link, so the map
// (and the user's zoom/scroll position) stays put in the current tab.
function openInNewTab(g) {
  window.open(ganpatiPath(g), '_blank', 'noopener');
}

// Map of the pandals passed in (already filtered/searched by Explore). Pins
// without coordinates are skipped. Hovering a pin shows the name (desktop);
// clicking/tapping opens that pandal's detail in a new tab. Two-finger / scroll
// zoom is enabled alongside pinch and the +/- controls.
export default function MapView({ ganpatis }) {
  const { crowd } = useCrowd();
  const pins = ganpatis.filter((g) => g.lat != null && g.lng != null);

  return (
    <div className="overflow-hidden rounded-card border border-maroon/[0.08]">
      <MapContainer center={PUNE_CENTRE}
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
        {pins.map((g) => {
          const icon = CROWD_ICONS[crowd[g.id]?.level] || DEFAULT_ICON;
          return (
            <Marker key={g.id} position={[g.lat, g.lng]} icon={icon} eventHandlers={{ click: () => openInNewTab(g) }}>
              <Tooltip direction="top">
                {g.name}{crowd[g.id] ? ` · ${crowd[g.id].label}` : ''}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
