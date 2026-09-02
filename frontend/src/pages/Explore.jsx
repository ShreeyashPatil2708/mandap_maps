import { lazy, Suspense, useMemo, useState } from 'react';
import { useGanpatis } from '../context/GanpatisContext.jsx';
import { useSaved } from '../context/SavedContext.jsx';
import { manachaBadge, distanceKm, formatDistance } from '../data/helpers.js';
import { OmMark, SearchIcon, BookmarkIcon } from '../components/icons.jsx';

// The map bundles Leaflet, so load it only when the user opens the map view.
const MapView = lazy(() => import('../components/MapView.jsx'));

// An area or tag becomes a filter chip once at least this many pandals share it.
// Rarer one-off values stay reachable via "All" and search.
const AREA_CHIP_MIN = 2;
const TAG_CHIP_MIN = 2;

// Prefixes that mark a filter key's dimension, so the single active-filter
// string can carry either an area name, a tag, or a tier.
const TAG_PREFIX = 'tag:';
const TIER_PREFIX = 'tier:';

// Coarse importance tiers in the data (1 Manache/Iconic, 2 Heritage/Famous,
// 3 Notable), surfaced as friendly filter chips.
const TIER_CHIPS = [
  { key: `${TIER_PREFIX}1`, label: 'Most Iconic', tier: 1 },
  { key: `${TIER_PREFIX}2`, label: 'Heritage & Famous', tier: 2 },
  { key: `${TIER_PREFIX}3`, label: 'Notable', tier: 3 },
];

// Build the filter chips from the live data so they never go stale: "All",
// "Manache 5", the tiers present, the busiest neighbourhoods, then common tags.
function buildFilters(ganpatis) {
  const areaCounts = {};
  const tagCounts = {};
  const tiersPresent = new Set();
  for (const g of ganpatis) {
    if (g.areaCategory) areaCounts[g.areaCategory] = (areaCounts[g.areaCategory] || 0) + 1;
    for (const t of g.tags || []) tagCounts[t] = (tagCounts[t] || 0) + 1;
    if (g.tier) tiersPresent.add(g.tier);
  }
  const byCountThenName = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]);
  const areas = Object.entries(areaCounts)
    .filter(([, n]) => n >= AREA_CHIP_MIN)
    .sort(byCountThenName)
    .map(([key]) => ({ key, label: key }));
  const tags = Object.entries(tagCounts)
    .filter(([, n]) => n >= TAG_CHIP_MIN)
    .sort(byCountThenName)
    .map(([key]) => ({ key: `${TAG_PREFIX}${key}`, label: key }));
  const tiers = TIER_CHIPS.filter((t) => tiersPresent.has(t.tier)).map(({ key, label }) => ({
    key,
    label,
  }));
  return [
    { key: 'all', label: 'All' },
    { key: 'manache5', label: 'Manache 5' },
    ...tiers,
    ...areas,
    ...tags,
  ];
}

// Grid card for the Explore results. Shows a distance line when Near Me is on.
function GanpatiCard({ g, dist, onOpen, isSaved, onToggleSave }) {
  return (
    <div
      className="cursor-pointer overflow-hidden rounded-card border border-maroon/[0.06] bg-surface transition-all hover:border-gold/40 hover:shadow-[0_2px_12px_rgba(107,30,46,0.08)]"
      onClick={onOpen}
    >
      <div className="relative flex h-[90px] items-center justify-center bg-maroon">
        <OmMark size={32} textSize={18} opacity={0.5} />
        {g.manacha && (
          <div className="absolute left-2 top-2 whitespace-nowrap rounded-badge bg-gold px-2 py-0.5 font-sans text-[9px] font-semibold text-maroon">
            {manachaBadge(g.manacha)}
          </div>
        )}
        {dist != null && (
          <div className="absolute right-2 bottom-2 rounded-badge bg-cream/90 px-1.5 py-0.5 font-sans text-[9px] font-semibold text-maroon">
            {formatDistance(dist)}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
          aria-label={isSaved ? 'Remove from saved' : 'Save pandal'}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-maroon/40 transition-all hover:bg-maroon/60"
          style={{ color: isSaved ? '#C9A84C' : 'rgba(237,228,208,0.6)' }}
        >
          <BookmarkIcon filled={isSaved} size={13} />
        </button>
      </div>
      <div className="px-3.5 py-3">
        <div className="mb-0.5 font-serif text-sm leading-[1.3] text-maroon">{g.name}</div>
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
    </div>
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

export default function Explore({ query, onQuery, activeFilter, onFilter, onOpenGanpati }) {
  const { ganpatis } = useGanpatis();
  const { saved, saveGanpati, unsaveGanpati } = useSaved();
  const [view, setView] = useState('grid');
  const [nearMe, setNearMe] = useState(false);
  const [userPos, setUserPos] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [locating, setLocating] = useState(false);

  const filterOptions = useMemo(() => buildFilters(ganpatis), [ganpatis]);

  const results = useMemo(() => {
    let list = ganpatis;
    if (activeFilter === 'manache5') list = list.filter((g) => g.manacha);
    else if (activeFilter.startsWith(TAG_PREFIX)) {
      const tag = activeFilter.slice(TAG_PREFIX.length);
      list = list.filter((g) => (g.tags || []).includes(tag));
    } else if (activeFilter.startsWith(TIER_PREFIX)) {
      const tier = Number(activeFilter.slice(TIER_PREFIX.length));
      list = list.filter((g) => g.tier === tier);
    } else if (activeFilter !== 'all') list = list.filter((g) => g.areaCategory === activeFilter);

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
    <div className="animate-fadeIn pb-nav-safe">
      {/* Heading */}
      <div className="flex items-baseline justify-between px-gutter pt-gutter">
        <div className="font-serif text-2xl text-maroon">Explore Pandals</div>
        <div className="font-devanagari text-[13px] text-maroon/35">सर्व मंडळे</div>
      </div>

      {/* Search */}
      <div className="px-gutter pt-gutter">
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
      <div className="flex gap-2 overflow-x-auto px-gutter py-4">
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
      <div className="flex items-center justify-between px-gutter pb-3">
        <div className="font-sans text-[12px] text-maroon/50">{countLabel}</div>
        <ViewToggle view={view} onView={setView} />
      </div>

      {geoError && (
        <div className="px-gutter pb-2 font-sans text-[12px] text-maroon/50">{geoError}</div>
      )}

      {/* Results */}
      <div className="px-gutter">
        {view === 'map' ? (
          <Suspense
            fallback={
              <div className="flex h-[440px] items-center justify-center rounded-card border border-maroon/[0.08] bg-surface font-sans text-sm text-maroon/50">
                Loading map...
              </div>
            }
          >
            <MapView ganpatis={results.map((r) => r.g)} />
          </Suspense>
        ) : count > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-3.5">
            {results.map(({ g, dist }) => (
              <GanpatiCard
                key={g.id}
                g={g}
                dist={dist}
                onOpen={() => onOpenGanpati(g.id)}
                isSaved={saved.has(g.id)}
                onToggleSave={() => saved.has(g.id) ? unsaveGanpati(g.id) : saveGanpati(g.id)}
              />
            ))}
          </div>
        ) : (
          <div className="px-gutter py-[60px] text-center">
            <div className="mb-4 text-5xl opacity-30">🔍</div>
            <div className="mb-2 font-serif text-xl text-maroon">No pandals found</div>
            <div className="font-sans text-sm text-maroon/50">
              Try a different search term or filter
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
