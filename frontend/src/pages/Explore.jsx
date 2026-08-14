import { useMemo } from 'react';
import { useGanpatis } from '../context/GanpatisContext.jsx';
import { manachaBadge } from '../data/helpers.js';
import { OmMark, SearchIcon } from '../components/icons.jsx';

// An area or tag becomes a filter chip once at least this many pandals share it.
// Rarer one-off values stay reachable via "All" and search.
const AREA_CHIP_MIN = 2;
const TAG_CHIP_MIN = 2;

// Prefix that marks a filter key as a tag filter (vs. "all", "manache5" or an
// area name), so the single active-filter string can carry either dimension.
const TAG_PREFIX = 'tag:';

// Build the filter chips from the live data so they never go stale as pandals
// are added: "All", "Manache 5", the busiest neighbourhoods, then the tags that
// appear often enough to be worth a chip.
function buildFilters(ganpatis) {
  const areaCounts = {};
  const tagCounts = {};
  for (const g of ganpatis) {
    if (g.areaCategory) areaCounts[g.areaCategory] = (areaCounts[g.areaCategory] || 0) + 1;
    for (const t of g.tags || []) tagCounts[t] = (tagCounts[t] || 0) + 1;
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
  return [
    { key: 'all', label: 'All' },
    { key: 'manache5', label: 'Manache 5' },
    ...areas,
    ...tags,
  ];
}

// Grid card for the Explore results.
function GanpatiCard({ g, onOpen }) {
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

export default function Explore({ query, onQuery, activeFilter, onFilter, onOpenGanpati }) {
  const { ganpatis } = useGanpatis();

  const filterOptions = useMemo(() => buildFilters(ganpatis), [ganpatis]);

  const results = useMemo(() => {
    let list = ganpatis;
    if (activeFilter === 'manache5') list = list.filter((g) => g.manacha);
    else if (activeFilter.startsWith(TAG_PREFIX)) {
      const tag = activeFilter.slice(TAG_PREFIX.length);
      list = list.filter((g) => (g.tags || []).includes(tag));
    } else if (activeFilter !== 'all') list = list.filter((g) => g.areaCategory === activeFilter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.area.toLowerCase().includes(q) ||
          g.nameMarathi.includes(q)
      );
    }
    return list;
  }, [ganpatis, query, activeFilter]);

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
            placeholder="Search pandals..."
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            className="w-full rounded-pill border-2 border-maroon/10 bg-surface py-3.5 pl-11 pr-5 font-sans text-[15px] text-maroon outline-none focus:border-gold"
          />
          <SearchIcon />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto px-gutter py-4">
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

      {/* Results */}
      <div className="px-gutter">
        {results.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-3.5">
            {results.map((g) => (
              <GanpatiCard key={g.id} g={g} onOpen={() => onOpenGanpati(g.id)} />
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
