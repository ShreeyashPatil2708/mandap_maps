import { Fragment, useState } from 'react';
import { useGanpatis } from '../context/GanpatisContext.jsx';
import { useRoute, routeCode, shareUrlFor } from '../context/RouteContext.jsx';
import { directionsUrl, formatDistance } from '../data/helpers.js';
import { hasLocation, optimizeOrder, routeStats, walkKm, walkMinutes } from '../data/walk.js';
import Container from '../components/Container.jsx';
import Link from '../components/Link.jsx';
import RouteMap from '../components/RouteMap.jsx';
import { ShareIcon } from '../components/icons.jsx';
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
  const { route, removeFromRoute, clearRoute, reorderRoute, replaceRoute } = useRoute();
  const items = route.map((id) => ganpatis.find((g) => g.id === id)).filter(Boolean);
  const count = items.length;
  const stats = routeStats(items);
  const canOptimize = items.filter(hasLocation).length >= 3;
  // What the last "Best walking order" tap did, cleared by any other change.
  const [optimizeNote, setOptimizeNote] = useState('');
  // Feedback after sharing / copying the route link. Cleared by the next share.
  const [shareNote, setShareNote] = useState('');

  const optimize = () => {
    const next = optimizeOrder(items);
    const unchanged = next.every((id, i) => id === items[i].id);
    if (!unchanged) replaceRoute(next);
    setOptimizeNote(
      unchanged ? 'Already the shortest order we can find.' : 'Reordered for the shortest walk.'
    );
  };

  // Share the route with friends: native share sheet where the browser has one
  // (Android/iOS/desktop), otherwise copy the link and confirm. The route code
  // below is the same payload the link carries, for a friend to type into /join.
  const share = async () => {
    setShareNote('');
    const url = shareUrlFor(route);
    if (!url) return;
    const payload = {
      title: 'My Ganpati Darshan Route',
      text: `Join my ${count} ${count === 1 ? 'stop' : 'stops'} darshan route of Pune's Ganpati pandals on MandapMaps`,
      url,
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
        return;
      } catch (err) {
        // Closing the sheet is a cancel, not an error; anything else drops the
        // user into the copy fallback below.
        if (err?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareNote('Link copied — send it to your friends');
    } catch {
      setShareNote(url); // last resort: surface the link to copy by hand
    }
  };

  return (
    <Container as="main" className={`${enter} pt-gutter`}>
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
        <div className="mx-auto max-w-prose rounded-2xl border border-maroon/[0.06] bg-surface px-gutter py-[60px] text-center">
          <div className="mb-2 font-serif text-xl text-maroon">No Ganpatis added yet</div>
          <div className="mb-6 font-sans text-sm leading-[1.6] text-maroon/50">
            Add Ganpatis from the Explore page to build your darshan route or join Route
          </div>
          <Link
            to={PATHS.explore}
            className="inline-block cursor-pointer rounded-pill bg-gold px-7 py-3 font-sans text-sm font-semibold text-maroon hover:bg-gold-dark"
          >
            Explore Pandals
          </Link>
          <Link
            to={PATHS.join}
            className="inline-block cursor-pointer rounded-pill bg-gold px-7 py-3 font-sans text-sm font-semibold text-maroon hover:bg-gold-dark"
          >
            Join Route
          </Link>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
          {/* Route list. One ordered column at every width: the order is the
              whole point of a route, so a multi-column grid would be wrong. */}
          <div className="mb-5 flex flex-col gap-2.5 lg:mb-0">
            {items.map((g, i) => {
              const leg = i > 0 ? walkKm(items[i - 1], g) : null;
              return (
                <Fragment key={g.id}>
                  {leg != null && (
                    <div className="-my-1 pl-[56px] font-sans text-[11px] text-maroon/40">
                      ~{walkMinutes(leg)} min walk · {formatDistance(leg)}
                    </div>
                  )}
                  <div className="flex items-center gap-3 rounded-card border border-maroon/[0.06] bg-surface px-4 py-3.5">
                    <div className="w-7 flex-none text-center font-serif text-xl text-gold">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-[15px] text-maroon">{g.name}</div>

                      <div className="font-sans text-xs text-maroon/40">
                        {g.area}
                        {!hasLocation(g) && ' · No map location yet'}
                      </div>
                    </div>
                    <div className="flex flex-none flex-col items-center text-maroon/35">
                      <div
                        className={`flex h-6 w-8 items-center justify-center rounded ${
                          i === 0
                            ? 'pointer-events-none opacity-20'
                            : 'cursor-pointer hover:bg-maroon/5 hover:text-maroon'
                        }`}
                        onClick={() => {
                          reorderRoute(i, i - 1);
                          setOptimizeNote('');
                        }}
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
                        onClick={() => {
                          reorderRoute(i, i + 1);
                          setOptimizeNote('');
                        }}
                        aria-label="Move down"
                      >
                        <ChevronDown />
                      </div>
                    </div>
                    <div
                      className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-lg text-maroon/30 hover:bg-maroon/5 hover:text-maroon"
                      onClick={() => {
                        removeFromRoute(g.id);
                        setOptimizeNote('');
                      }}
                      aria-label="Remove"
                    >
                      ✕
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>

          {/* Actions. Sits under the list on a phone, which is where a thumb
              expects it; on a laptop it sticks beside the list instead of
              sitting below the fold of a long route. */}
          <aside className="lg:sticky lg:top-24">
            <div className="mb-3 mt-6 font-sans text-[13px] text-maroon/45 lg:mt-0">
              {count} {count === 1 ? 'stop' : 'stops'} on this route
              {stats.legs > 0 && (
                <>
                  <div className="mt-1 font-serif text-[20px] text-maroon">
                    ~{formatDistance(stats.km)} · ~{stats.minutes} min walk
                  </div>
                  <div className="mt-0.5 text-xs text-maroon/40">
                    Walking estimate between stops with a map location, not counting darshan queues.
                  </div>
                </>
              )}
            </div>
            <a
              href={directionsUrl(items)}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 block cursor-pointer rounded-card bg-gold p-4 text-center font-sans text-base font-semibold text-maroon no-underline hover:bg-gold-dark lg:mt-0"
            >
              Open in Google Maps
            </a>
            {canOptimize && (
              <>
                <button
                  type="button"
                  onClick={optimize}
                  className="mb-1 block w-full cursor-pointer rounded-card border-[1.5px] border-maroon/15 p-3.5 text-center font-sans text-[15px] font-medium text-maroon hover:border-maroon/40 hover:bg-maroon/5"
                >
                  Best walking order
                </button>
                <div className="mb-3 min-h-[18px] text-center font-sans text-xs text-maroon/45">
                  {optimizeNote}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={share}
              className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-card border-[1.5px] border-maroon/15 p-3.5 font-sans text-[15px] font-medium text-maroon hover:border-maroon/40 hover:bg-maroon/5"
            >
              <ShareIcon /> Share Route
            </button>
            <div className="mb-3 text-center font-sans text-xs leading-relaxed text-maroon/45">
              {shareNote ? (
                <span className="text-gold">{shareNote}</span>
              ) : (
                <>
                  Friends can join with code <span className="font-semibold text-maroon/60">{routeCode(route)}</span>{' '}
                  on <a href={PATHS.join}>Join</a>
                </>
              )}
            </div>
            <div className="text-center">
              <span
                className="cursor-pointer font-sans text-sm font-medium text-gold"
                onClick={clearRoute}
              >
                Clear all
              </span>
            </div>
            {/* The route on a small map: reloads from Google whenever the
                stops change, showing them in the current order. */}
            <RouteMap stops={items} />
          </aside>
        </div>
      )}
    </Container>
  );
}
