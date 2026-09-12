import { useGanpatis } from '../context/GanpatisContext.jsx';
import { useRoute } from '../context/RouteContext.jsx';
import { useCrowd } from '../context/CrowdContext.jsx';
import { directionsUrl } from '../data/helpers.js';
import Container from '../components/Container.jsx';
import Link from '../components/Link.jsx';
import { PATHS } from '../router.js';

function ChevronUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 10L8 6L12 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Route({ enter = 'animate-fadeIn' }) {
  const { ganpatis } = useGanpatis();
  const { route, removeFromRoute, clearRoute, reorderRoute } = useRoute();
  const { crowd } = useCrowd();
  const items = route.map((id) => ganpatis.find((g) => g.id === id)).filter(Boolean);
  const count = items.length;

  return (
    <Container as="main" width="prose" className={`${enter} pt-gutter`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-maroon">My Darshan Route</h1>
          <div className="mt-0.5 font-devanagari text-[13px] text-maroon/40" lang="mr">
            माझा दर्शन मार्ग
          </div>
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
          <Link
            to={PATHS.explore}
            className="inline-block cursor-pointer rounded-pill bg-gold px-7 py-3 font-sans text-sm font-semibold text-maroon hover:bg-gold-dark"
          >
            Explore Pandals
          </Link>
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
                <div className="w-7 flex-none text-center font-serif text-xl text-gold">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-[15px] text-maroon">
                    {g.name}

                    {crowd[g.id]?.level === 3 && (
                      <span className="ml-2 rounded-pill bg-crowd-high/12 px-2 py-0.5 font-sans text-[11px] font-semibold text-crowd-high">
                        Busy now, consider reordering
                      </span>
                    )}
                  </div>

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

          {/* CTA */}
          <a
            href={directionsUrl(items)}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 mt-6 block cursor-pointer rounded-card bg-gold p-4 text-center font-sans text-base font-semibold text-maroon no-underline hover:bg-gold-dark"
          >
            Open in Google Maps
          </a>
          <div className="text-center">
            <span
              className="cursor-pointer font-sans text-sm font-medium text-gold"
              onClick={clearRoute}
            >
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
    </Container>
  );
}
