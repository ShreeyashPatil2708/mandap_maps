import { useGanpatis } from '../context/GanpatisContext.jsx';
import { useRoute } from '../context/RouteContext.jsx';

// Build a Google Maps directions URL from the ordered stops. The first stop is
// the origin, the last is the destination, and any stops in between become
// waypoints separated by "|". No Maps API key is needed for this URL scheme.
function directionsUrl(stops) {
  const coord = (g) => `${g.lat},${g.lng}`;
  const origin = coord(stops[0]);
  const destination = coord(stops[stops.length - 1]);
  const middle = stops.slice(1, -1).map(coord).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (middle) url += `&waypoints=${middle}`;
  return url;
}

function ChevronUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 10L8 6L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Route({ onExplore }) {
  const { ganpatis } = useGanpatis();
  const { route, removeFromRoute, clearRoute, reorderRoute } = useRoute();
  const items = route.map((id) => ganpatis.find((g) => g.id === id)).filter(Boolean);
  const count = items.length;
  const single = count === 1;
  const time = single ? 'add more stops' : `${Math.round(count * 25)} min`;
  const distance = single ? 'add more stops' : `${(count * 1.8).toFixed(1)} km`;

  return (
    <div className="animate-fadeIn px-gutter pb-nav-safe pt-gutter">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-serif text-2xl text-maroon">My Darshan Route</div>
          <div className="mt-0.5 font-devanagari text-[13px] text-maroon/40">माझा दर्शन मार्ग</div>
        </div>
        {count > 0 && (
          <div className="rounded-[20px] bg-maroon px-3.5 py-1.5 font-sans text-[13px] font-semibold text-light">
            {count} {count === 1 ? 'Ganpati' : 'Ganpatis'}
          </div>
        )}
      </div>

      {count === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border border-maroon/[0.06] bg-surface px-gutter py-[60px] text-center">
          <div className="mb-2 font-serif text-xl text-maroon">No Ganpatis added yet</div>
          <div className="mb-6 font-sans text-sm leading-[1.6] text-maroon/50">
            Add Ganpatis from the Explore page to build your darshan route
          </div>
          <div
            className="inline-block cursor-pointer rounded-pill bg-gold px-7 py-3 font-sans text-sm font-semibold text-maroon hover:bg-gold-dark"
            onClick={onExplore}
          >
            Explore Pandals
          </div>
        </div>
      ) : (
        <>
          {/* Route list */}
          <div className="mb-5 flex flex-col gap-2.5">
            {items.map((g, i) => (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-card border border-maroon/[0.06] bg-surface px-4 py-3.5"
              >
                <div className="w-7 flex-none text-center font-serif text-xl text-gold">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-[15px] text-maroon">{g.name}</div>
                  <div className="font-sans text-xs text-maroon/40">{g.area}</div>
                </div>
                <div className="flex flex-none flex-col items-center text-maroon/35">
                  <div
                    className={`flex h-6 w-8 items-center justify-center rounded ${
                      i === 0
                        ? 'pointer-events-none opacity-20'
                        : 'cursor-pointer hover:bg-maroon/5 hover:text-maroon'
                    }`}
                    onClick={() => reorderRoute(i, i - 1)}
                    aria-label="Move up"
                  >
                    <ChevronUp />
                  </div>
                  <div
                    className={`flex h-6 w-8 items-center justify-center rounded ${
                      i === count - 1
                        ? 'pointer-events-none opacity-20'
                        : 'cursor-pointer hover:bg-maroon/5 hover:text-maroon'
                    }`}
                    onClick={() => reorderRoute(i, i + 1)}
                    aria-label="Move down"
                  >
                    <ChevronDown />
                  </div>
                </div>
                <div
                  className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-lg text-maroon/30 hover:bg-maroon/5 hover:text-maroon"
                  onClick={() => removeFromRoute(g.id)}
                  aria-label="Remove"
                >
                  ✕
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mb-2 flex gap-5 rounded-card border border-maroon/[0.06] bg-surface px-5 py-[18px]">
            <div className="flex-1 text-center">
              <div className="mb-1 font-sans text-[11px] uppercase tracking-[0.5px] text-maroon/40">
                Stops
              </div>
              <div className="font-serif text-[22px] text-maroon">{count}</div>
            </div>
            <div className="w-px bg-maroon/[0.08]" />
            <div className="flex-1 text-center">
              <div className="mb-1 font-sans text-[11px] uppercase tracking-[0.5px] text-maroon/40">
                Est. Time
              </div>
              <div className="font-serif text-[22px] text-maroon">{time}</div>
            </div>
            <div className="w-px bg-maroon/[0.08]" />
            <div className="flex-1 text-center">
              <div className="mb-1 font-sans text-[11px] uppercase tracking-[0.5px] text-maroon/40">
                Distance
              </div>
              <div className="font-serif text-[22px] text-maroon">{distance}</div>
            </div>
          </div>

          {/* What the estimate means */}
          <div className="mb-5 px-1 text-center font-sans text-[11px] leading-[1.6] text-maroon/40">
            Rough total travel time and road distance for the whole route, based on about 25 min and
            1.8 km between stops. Real times vary with festival crowds and darshan queues.
          </div>

          {/* CTA */}
          <a
            href={directionsUrl(items)}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block cursor-pointer rounded-card bg-gold p-4 text-center font-sans text-base font-semibold text-maroon no-underline hover:bg-gold-dark"
          >
            Open in Google Maps
          </a>
          <div className="text-center">
            <span className="cursor-pointer font-sans text-sm font-medium text-gold" onClick={clearRoute}>
              Clear all
            </span>
          </div>
        </>
      )}

      {/*
        AI_ROUTE_OPTIMIZER_PLACEHOLDER
        Phase 2: POST /api/optimize-route with { ganpati_ids: [...] }
        Returns optimal visit order. Replace static list order with response.
      */}
    </div>
  );
}
