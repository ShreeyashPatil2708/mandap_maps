import { useMemo } from 'react';
import { useGanpatis } from '../context/GanpatisContext.jsx';
import { filterOptions, manachaBadge } from '../data/helpers.js';
import { OmMark, SearchIcon } from '../components/icons.jsx';

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
      </div>
    </div>
  );
}

export default function Explore({ query, onQuery, activeFilter, onFilter, onOpenGanpati }) {
  const { ganpatis } = useGanpatis();

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
