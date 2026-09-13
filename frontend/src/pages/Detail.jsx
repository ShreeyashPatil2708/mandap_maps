import { useEffect, useRef, useState } from 'react';
import { manachaBadge, directionsUrl, stripEditorialNotes } from '../data/helpers.js';
import { useRoute } from '../context/RouteContext.jsx';
import { OmMark, MetroIcon, FoodIcon, ParkingIcon } from '../components/icons.jsx';
import Container from '../components/Container.jsx';
import PandalPhoto from '../components/PandalPhoto.jsx';
import Link from '../components/Link.jsx';
import { PATHS, canGoBack, goBack } from '../router.js';

// Practical info (metro / ticket / food / directions) lives in an always-visible
// section above the tabs. Tabs hold the secondary reference info; Timings is the
// default and History sits last, since directions matter more to a visitor
// mid-festival than backstory.
const TABS = [
  { key: 'timings', label: 'Timings' },
  { key: 'history', label: 'History' },
];

function TimingRow({ title, value }) {
  return (
    <div className="flex items-center border-b border-maroon/[0.06] py-4 last:border-b-0">
      <div className="mr-4 h-10 w-1 flex-none rounded-[2px] bg-gold" />
      <div className="flex-1">
        <div className="font-sans text-sm font-semibold text-maroon">{title}</div>
        <div className="mt-0.5 font-sans text-[13px] text-maroon/50">{value}</div>
      </div>
    </div>
  );
}

// The add/remove control. It appears twice: pinned above the tab bar on a
// phone, and inline in the desktop rail, where a bar fixed across a 1920px
// screen would be absurd.
function RouteActionButton({ inRoute, onAdd, onRemove }) {
  if (inRoute) {
    return (
      <div
        className="flex-1 cursor-pointer rounded-card border border-maroon/10 bg-surface p-3.5 text-center font-sans text-sm font-semibold text-maroon/50 hover:text-maroon"
        onClick={onRemove}
      >
        Remove from Route
      </div>
    );
  }
  return (
    <div
      className="flex-1 cursor-pointer rounded-card bg-maroon p-3.5 text-center font-sans text-sm font-semibold text-light hover:bg-maroon-dark"
      onClick={onAdd}
    >
      Add to Route
    </div>
  );
}

// Directions: the Maps button and address. Like the route button it appears
// twice, in the main column on a phone and in the sticky rail on a laptop.
// A pandal without a verified pin says so, and the button searches by name.
function Directions({ ganpati }) {
  const hasPin = ganpati.lat != null && ganpati.lng != null;
  return (
    <div className="flex flex-col gap-2">
      <a
        href={directionsUrl([ganpati])}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer rounded-card bg-gold p-4 text-center font-sans text-[15px] font-semibold text-maroon no-underline hover:bg-gold-dark"
      >
        Open in Google Maps
      </a>
      <div className="font-sans text-sm leading-[1.6] text-maroon/60">
        {stripEditorialNotes(ganpati.address)}
      </div>
      <div className="font-sans text-xs font-medium text-gold">
        {hasPin
          ? '2026 pandal location not yet verified. Confirm once you are nearby.'
          : 'Exact location unavailable. Google Maps will search for it by name.'}
      </div>
    </div>
  );
}

function NearbyRow({ name, sub, dist }) {
  return (
    <div className="flex cursor-pointer items-center justify-between rounded-[10px] bg-surface px-3.5 py-3 hover:bg-[#f0e8d8]">
      <div>
        <div className="font-sans text-sm font-medium text-maroon">{name}</div>
        <div className="mt-0.5 font-sans text-xs text-maroon/45">{sub}</div>
      </div>
      <div className="whitespace-nowrap font-sans text-xs font-semibold text-gold">{dist}</div>
    </div>
  );
}

// Metro ticket call-to-action shown wherever a metro station or walk distance
// appears. Full width outlined secondary button plus the official number note.
function MetroWhatsApp() {
  return (
    <>
      <div
        className="w-full cursor-pointer rounded-card border-[1.5px] border-maroon/15 p-4 text-center font-sans text-[15px] font-semibold text-maroon hover:border-maroon"
        onClick={() => window.open('https://wa.me/919420101990?text=Hi', '_blank', 'noopener')}
      >
        Book Metro Ticket via WhatsApp
      </div>
      <div className="font-sans text-xs text-maroon/45">
        Official Pune Metro WhatsApp: +91 94201 01990
      </div>
    </>
  );
}

function NearbyGroup({ icon, title, children }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-maroon">
          {icon}
        </div>
        <div className="font-sans text-sm font-semibold text-maroon">{title}</div>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export default function Detail({ enter = 'animate-fadeIn', ganpati, prevPage }) {
  const [tab, setTab] = useState('timings');
  const [toast, setToast] = useState(false);
  const toastTimer = useRef(null);
  const { route, addToRoute, removeFromRoute } = useRoute();
  const inRoute = route.includes(ganpati.id);
  const cameFromHome = prevPage === 'home';
  const backLabel = cameFromHome ? '← Back to Home' : '← Back to Explore';
  const backPath = cameFromHome ? PATHS.home : PATHS.explore;

  // A real link (crawlable, and right for a visitor who landed here from
  // search), but inside the app it steps back through history instead, so the
  // listing keeps its scroll position and filters.
  const onBackClick = (event) => {
    if (!canGoBack()) return;
    event.preventDefault();
    goBack();
  };

  // Don't fire a pending toast timeout after the page has been left.
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const onAdd = () => {
    addToRoute(ganpati.id);
    setToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 2000);
  };

  return (
    <Container as="main" className={enter}>
      {/* Back */}
      <div className="py-3">
        <Link
          to={backPath}
          onClick={onBackClick}
          className="inline-flex cursor-pointer items-center gap-1.5 font-sans text-sm text-maroon/60 hover:text-maroon"
        >
          {backLabel}
        </Link>
      </div>

      {/* Two columns on a laptop: the page read as one long phone column with
          the whole screen's width spent on 250-character lines of history. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
        <div>
          {/* Photo, over the Om placeholder (which shows when there is none) */}
          <div className="relative flex h-[220px] items-center justify-center overflow-hidden rounded-panel bg-maroon lg:h-[340px]">
            <div className="pointer-events-none absolute -right-2.5 -top-2.5 font-devanagari text-[140px] font-bold leading-none text-gold/[0.06]">
              ॐ
            </div>
            <OmMark size={56} textSize={18} opacity={0.4} />
            <PandalPhoto g={ganpati} sizes="(max-width: 1024px) 100vw, 900px" priority showCredit />
          </div>

          {/* Name & info */}
          <div className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-[26px] leading-[1.2] text-maroon">{ganpati.name}</h1>
                <div className="mt-0.5 font-devanagari text-[15px] text-maroon/40" lang="mr">
                  {ganpati.nameMarathi}
                </div>
              </div>
              {ganpati.manacha && (
                <div className="mt-1 flex-none rounded-md bg-gold px-3 py-1 font-sans text-[11px] font-semibold text-maroon">
                  {manachaBadge(ganpati.manacha)}
                </div>
              )}
            </div>
            <div className="mt-1.5 font-sans text-[13px] text-maroon/45">
              {ganpati.area} · Est. {ganpati.est}
            </div>

            {ganpati.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ganpati.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-badge border border-gold/40 bg-surface px-2.5 py-1 font-sans text-[11px] font-medium text-maroon/70"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Plan your visit: the practical, act-on-it-now info (directions, metro,
          ticket, food, parking) kept always-visible above the reference tabs. */}
          <div className="mt-5 flex flex-col gap-5">
            {/* On a laptop directions move into the rail. */}
            <div className="lg:hidden">
              <Directions ganpati={ganpati} />
            </div>

            <NearbyGroup icon={<MetroIcon />} title="Nearest Metro">
              {ganpati.metro.map((m) => (
                <NearbyRow key={m.name} name={m.name} sub={m.line} dist={m.dist} />
              ))}
              <MetroWhatsApp />
            </NearbyGroup>

            <NearbyGroup icon={<FoodIcon />} title="Food Nearby">
              {ganpati.food.map((f) => (
                <NearbyRow key={f.name} name={f.name} sub={f.type} dist={f.dist} />
              ))}
            </NearbyGroup>

            <NearbyGroup icon={<ParkingIcon />} title="Parking">
              <div className="rounded-[10px] bg-surface px-3.5 py-3 font-sans text-sm leading-[1.6] text-maroon/60">
                {ganpati.parking || 'Parking guidance for this pandal is coming soon.'}
              </div>
            </NearbyGroup>
          </div>

          {/* Did You Know */}
          {ganpati.didYouKnow && (
            <div className="mt-5 rounded-card border border-gold/25 bg-surface px-4 py-4">
              <div className="mb-1.5 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-gold">
                Did you know?
              </div>
              <div className="font-sans text-[14px] leading-[1.6] text-maroon/75">
                {ganpati.didYouKnow}
              </div>
            </div>
          )}

          {/* Tabs: secondary reference info */}
          <div className="mt-5 flex border-b-2 border-maroon/[0.08]">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <div
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="-mb-0.5 flex-1 cursor-pointer border-b-2 py-3 text-center font-sans text-sm font-semibold transition-all"
                  style={{
                    color: active ? '#6B1E2E' : 'rgba(107,30,46,0.35)',
                    borderColor: active ? '#C9A84C' : 'transparent',
                  }}
                >
                  {t.label}
                </div>
              );
            })}
          </div>

          {/* Tab content. Both panels stay in the HTML (the inactive one hidden) so
          the history text is there for search engines and for a visitor who
          opens the page with JavaScript still loading. */}
          <div className="py-5">
            <div className="flex flex-col" hidden={tab !== 'timings'}>
              <div className="mb-2 font-sans text-xs text-maroon/45">
                Timings are not yet verified for 2026. Please confirm with the mandal.
              </div>
              <TimingRow title="Morning Aarti" value={ganpati.morningAarti} />
              <TimingRow title="Evening Aarti" value={ganpati.eveningAarti} />
              <TimingRow title="Special Events" value={ganpati.specialEvents} />
            </div>

            <div
              className="max-w-read font-sans text-[15px] leading-[1.8] text-maroon/75"
              hidden={tab !== 'history'}
            >
              {ganpati.history}
            </div>
          </div>
        </div>

        {/* Desktop rail: directions and the route action, kept in view while
            they read. Hidden on phones, where directions sit in the main column
            and the action bar is pinned instead. Aarti times are unverified, so
            they stay in the Timings tab with their caveat rather than being
            promoted here as at-a-glance facts. */}
        <aside className="hidden flex-col gap-4 lg:sticky lg:top-24 lg:flex">
          <div className="rounded-card border border-maroon/[0.06] bg-surface p-4">
            <Directions ganpati={ganpati} />
          </div>
          <div className="flex">
            <RouteActionButton
              inRoute={inRoute}
              onAdd={onAdd}
              onRemove={() => removeFromRoute(ganpati.id)}
            />
          </div>
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-[calc(150px_+_env(safe-area-inset-bottom))] z-[60] lg:bottom-8">
          <Container className="flex justify-center">
            <div className="animate-fadeIn rounded-pill bg-maroon px-5 py-2.5 font-sans text-[13px] font-medium text-light shadow-[0_4px_16px_rgba(107,30,46,0.25)]">
              Added to your route
            </div>
          </Container>
        </div>
      )}

      {/* Action bar, stacked flush on top of the fixed bottom nav. Phones only:
          the desktop rail carries the same control inline. */}
      <div className="fixed inset-x-0 bottom-[calc(56px_+_env(safe-area-inset-bottom))] z-50 border-t border-maroon/[0.08] bg-cream py-3.5 lg:hidden">
        <Container className="flex gap-3">
          <RouteActionButton
            inRoute={inRoute}
            onAdd={onAdd}
            onRemove={() => removeFromRoute(ganpati.id)}
          />
        </Container>
      </div>
    </Container>
  );
}
