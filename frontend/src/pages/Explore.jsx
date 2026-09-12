import { lazy, Suspense, useMemo, useState } from 'react';
import { useGanpatis } from '../context/GanpatisContext.jsx';
import { manachaBadge, distanceKm, formatDistance, buildFilters } from '../data/helpers.js';
import { OmMark, SearchIcon } from '../components/icons.jsx';
import PandalPhoto from '../components/PandalPhoto.jsx';
import Container from '../components/Container.jsx';
import Link from '../components/Link.jsx';
import { ganpatiPath } from '../router.js';

// The map bundles Leaflet, so load it only when the user opens the map view.
const MapView = lazy(() => import('../components/MapView.jsx'));

// A neighbourhood becomes a filter chip once at least this many pandals share
// it. Rarer areas stay reachable via "All" and search.

/**
 * The filter chips, built from the live data so they never go stale: "All",
 * "Manache 5", then the neighbourhoods.
 *
 * Deliberately just those. The dataset's tags and tiers used to become chips
 * too, which produced 85 of them (one tag sits on 67 of the 107 pandals, and
 * labels like "Most Iconic" or "Notable" mean little to someone deciding where
 * to go). Search still matches tags, so nothing is unreachable.
 */
// Grid card for the Explore results. Shows a distance line when Near Me is on.
function GanpatiCard({ g, dist }) {
  return (
    <Link
      to={ganpatiPath(g)}
      className="cursor-pointer overflow-hidden rounded-card border border-maroon/[0.06] bg-surface transition-all hover:border-gold/40 hover:shadow-[0_2px_12px_rgba(107,30,46,0.08)]"
    >
      <div className="relative flex h-[90px] items-center justify-center bg-maroon">
        <OmMark size={32} textSize={18} opacity={0.5} />
        <PandalPhoto g={g} sizes="(max-width: 480px) 50vw, 240px" />
        {g.manacha && (
          <div className="absolute left-2 top-2 whitespace-nowrap rounded-badge bg-gold px-2 py-0.5 font-sans text-[9px] font-semibold text-maroon">
            {manachaBadge(g.manacha)}
          </div>
        )}
        {dist != null && (
          <div className="absolute right-2 top-2 rounded-badge bg-cream/90 px-1.5 py-0.5 font-sans text-[9px] font-semibold text-maroon">
            {formatDistance(dist)}
          </div>
        )}
      </div>
      <div className="px-3.5 py-3">
        <h3 className="mb-0.5 font-serif text-sm leading-[1.3] text-maroon">{g.name}</h3>
        <div className="font-sans text-[11px] text-maroon/40">{g.area}</div>
        {g.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {g.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded-badge border border-gold/40 bg-light px-1.5 py-0.5 font-sans text-[9px] font-medium text-maroon/70"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// Two-way Grid / Map segmented toggle.
function ViewToggle({ view, onView }) {
  const opt = (key, label) => (
    <div
      onClick={() => onView(key)}
      className={`cursor-pointer rounded-pill px-3 py-1 font-sans text-[12px] font-semibold transition-all ${
        view === key ? 'bg-maroon text-light' : 'text-maroon/50'
      }`}
    >
      {label}
    </div>
  );
  return (
    <div className="flex flex-none items-center gap-1 rounded-pill border border-maroon/10 bg-surface p-0.5">
      {opt('grid', 'Grid')}
      {opt('map', 'Map')}
    </div>
  );
}

export default function Explore({
  enter = 'animate-fadeIn',
  query,
  onQuery,
  activeFilter,
  onFilter,
}) {
  const { ganpatis } = useGanpatis();
  const [view, setView] = useState('grid');
  const [nearMe, setNearMe] = useState(false);
  const [userPos, setUserPos] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [locating, setLocating] = useState(false);

  const filterOptions = useMemo(() => buildFilters(ganpatis), [ganpatis]);

  const results = useMemo(() => {
    let list = ganpatis;
    if (activeFilter === 'manache5') list = list.filter((g) => g.manacha);
    else if (activeFilter !== 'all') list = list.filter((g) => g.areaCategory === activeFilter);

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.area.toLowerCase().includes(q) ||
          g.nameMarathi.includes(q) ||
          (g.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          (g.significance || '').toLowerCase().includes(q)
      );
    }

    let out = list.map((g) => ({
      g,
      dist:
        nearMe && userPos && g.lat != null && g.lng != null
          ? distanceKm(userPos, { lat: g.lat, lng: g.lng })
          : null,
    }));
    if (nearMe && userPos) {
      out = [...out].sort((a, b) => {
        if (a.dist == null) return 1;
        if (b.dist == null) return -1;
        return a.dist - b.dist;
      });
    }
    return out;
  }, [ganpatis, query, activeFilter, nearMe, userPos]);

  const count = results.length;
  const countLabel = `${count} ${count === 1 ? 'pandal' : 'pandals'}${
    nearMe && userPos ? ' · nearest first' : ''
  }`;

  const toggleNearMe = () => {
    if (nearMe) return setNearMe(false);
    if (userPos) return setNearMe(true);
    if (!('geolocation' in navigator)) {
      return setGeoError('Location is not available on this device');
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMe(true);
        setLocating(false);
      },
      () => {
        setGeoError('Could not get your location');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Container as="main" className={enter}>
      {/* Heading */}
      <div className="flex items-baseline justify-between pt-gutter">
        <h1 className="font-serif text-2xl text-maroon">Explore Pandals</h1>
        <div className="font-devanagari text-[13px] text-maroon/35" lang="mr">
          सर्व मंडळे
        </div>
      </div>

      {/* Search */}
      <div className="pt-gutter">
        <div className="relative">
          <input
            type="text"
            placeholder="Search name, area, tag..."
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            className="w-full rounded-pill border-2 border-maroon/10 bg-surface py-3.5 pl-11 pr-5 font-sans text-[15px] text-maroon outline-none focus:border-gold"
          />
          <SearchIcon />
        </div>
      </div>

      {/* Filter chips (Near Me toggle first, then the data-driven chips) */}
      <div className="flex gap-2 overflow-x-auto py-4">
        <div
          onClick={toggleNearMe}
          className={`flex flex-none cursor-pointer items-center gap-1 whitespace-nowrap rounded-pill border-[1.5px] px-[16px] py-2 font-sans text-[13px] font-medium transition-all ${
            nearMe
              ? 'border-maroon bg-maroon text-light'
              : 'border-maroon/[0.12] bg-surface text-maroon'
          }`}
        >
          📍 {locating ? 'Locating...' : 'Near me'}
        </div>
        {filterOptions.map((f) => {
          const active = activeFilter === f.key;
          return (
            <div
              key={f.key}
              onClick={() => onFilter(f.key)}
              className={`flex-none cursor-pointer whitespace-nowrap rounded-pill border-[1.5px] px-[18px] py-2 font-sans text-[13px] font-medium transition-all ${
                active
                  ? 'border-maroon bg-maroon text-light'
                  : 'border-maroon/[0.12] bg-surface text-maroon'
              }`}
            >
              {f.label}
            </div>
          );
        })}
      </div>

      {/* Result count + Grid/Map toggle */}
      <div className="flex items-center justify-between pb-3">
        <div className="font-sans text-[12px] text-maroon/50">{countLabel}</div>
        <ViewToggle view={view} onView={setView} />
      </div>

      {geoError && <div className="pb-2 font-sans text-[12px] text-maroon/50">{geoError}</div>}

      {/* Results */}
      <div>
        {view === 'map' ? (
          <Suspense
            fallback={
              <div className="flex h-[440px] items-center justify-center rounded-card border border-maroon/[0.08] bg-surface font-sans text-sm text-maroon/50 lg:h-[560px]">
                Loading map...
              </div>
            }
          >
            <MapView ganpatis={results.map((r) => r.g)} />
          </Suspense>
        ) : count > 0 ? (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {results.map(({ g, dist }) => (
              <GanpatiCard key={g.id} g={g} dist={dist} />
            ))}
          </div>
        ) : (
          <div className="py-[60px] text-center">
            <div className="mb-4 text-5xl opacity-30">🔍</div>
            <div className="mb-2 font-serif text-xl text-maroon">No pandals found</div>
            <div className="font-sans text-sm text-maroon/50">
              Try a different search term or filter
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
