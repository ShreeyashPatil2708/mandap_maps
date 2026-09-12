import { useEffect, useRef, useState } from 'react';
import { manachaBadge, directionsUrl, stripEditorialNotes } from '../data/helpers.js';
import { useRoute } from '../context/RouteContext.jsx';
import { OmMark, MetroIcon, FoodIcon, ParkingIcon } from '../components/icons.jsx';
import PandalPhoto from '../components/PandalPhoto.jsx';
import Link from '../components/Link.jsx';
import { PATHS, canGoBack, goBack } from '../router.js';
import { reportCrowd } from '../services/crowd.js';
import { useCrowd } from '../context/CrowdContext.jsx';

// Practical info (metro / ticket / food / directions) lives in an always-visible
// section above the tabs. Tabs hold the secondary reference info; Timings is the
// default and History sits last, since directions and crowds matter more to a
// visitor mid-festival than backstory.
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

// Where the current level comes from, for the line under the heading.
function crowdBasis(current) {
  if (current.source === 'location') return 'estimated from live locations';
  if (current.source === 'interest') return 'estimated from planned routes';
  const n = current.reportCount || 0;
  return `${n} ${n === 1 ? 'report' : 'reports'} in the last 45 min`;
}

const REPORT_STATUS = {
  ok: 'Thanks, your report was counted.',
  cooldown: 'You reported this mandal recently. You can report again in a few minutes.',
  failed: "Couldn't send your report. Please check your connection and try again.",
};

function CrowdReportWidget({ ganpatiId }) {
  const { crowd, setLevel } = useCrowd();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const current = crowd[ganpatiId];

  const submit = async (level) => {
    setSubmitting(true);
    setStatus(null);
    try {
      // The reply carries the mandal's fresh level, so the widget updates
      // immediately instead of waiting for the next poll.
      const { crowd: fresh } = await reportCrowd(ganpatiId, level);
      setLevel(ganpatiId, fresh);
      setStatus(REPORT_STATUS.ok);
    } catch (err) {
      setStatus(err.status === 429 ? REPORT_STATUS.cooldown : REPORT_STATUS.failed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-card border border-maroon/[0.06] bg-surface p-4">
      <div className="mb-1 font-sans text-sm font-semibold text-maroon">How busy is it here?</div>
      {current && (
        <div className="mb-3 font-sans text-xs text-maroon/50">
          Current: {current.label} ({crowdBasis(current)})
        </div>
      )}
      <div className="flex gap-2">
        {[
          {
            level: 1,
            label: 'Low',
            tint: 'bg-crowd-low/12 text-crowd-low',
            on: 'bg-crowd-low text-light',
          },
          {
            level: 2,
            label: 'Medium',
            tint: 'bg-crowd-med/12 text-crowd-med',
            on: 'bg-crowd-med text-light',
          },
          {
            level: 3,
            label: 'High',
            tint: 'bg-crowd-high/12 text-crowd-high',
            on: 'bg-crowd-high text-light',
          },
        ].map((opt) => {
          const isCurrent = current?.level === opt.level;
          return (
            <button
              key={opt.level}
              disabled={submitting}
              onClick={() => submit(opt.level)}
              className={`flex-1 rounded-pill px-3 py-2 font-sans text-sm font-semibold transition-colors disabled:opacity-50 ${
                isCurrent ? opt.on : opt.tint
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {status && (
        <div className="mt-3 font-sans text-xs text-maroon/50" role="status">
          {status}
        </div>
      )}
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
    <main className={`${enter} pb-[calc(150px_+_env(safe-area-inset-bottom))]`}>
      {/* Back */}
      <div className="px-gutter py-3">
        <Link
          to={backPath}
          onClick={onBackClick}
          className="inline-flex cursor-pointer items-center gap-1.5 font-sans text-sm text-maroon/60 hover:text-maroon"
        >
          {backLabel}
        </Link>
      </div>

      {/* Photo, over the Om placeholder (which shows when there is none) */}
      <div className="relative mx-gutter flex h-[220px] items-center justify-center overflow-hidden rounded-panel bg-maroon">
        <div className="pointer-events-none absolute -right-2.5 -top-2.5 font-devanagari text-[140px] font-bold leading-none text-gold/[0.06]">
          ॐ
        </div>
        <OmMark size={56} textSize={18} opacity={0.4} />
        <PandalPhoto g={ganpati} sizes="(max-width: 480px) 100vw, 480px" priority showCredit />
      </div>

      {/* Name & info */}
      <div className="px-gutter-lg pt-5">
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

      {/* Crowd Report */}
      <div className="mx-gutter-lg mt-5">
        {/* Keyed by mandal so the status line resets when switching pandals. */}
        <CrowdReportWidget key={ganpati.id} ganpatiId={ganpati.id} />
      </div>

      {/* Plan your visit: the practical, act-on-it-now info (directions, metro,
          ticket, food, parking) kept always-visible above the reference tabs. */}
      <div className="mx-gutter-lg mt-5 flex flex-col gap-5">
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
            Pandal location updated for 2026 season
          </div>
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
        <div className="mx-gutter-lg mt-5 rounded-card border border-gold/25 bg-surface px-4 py-4">
          <div className="mb-1.5 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-gold">
            Did you know?
          </div>
          <div className="font-sans text-[14px] leading-[1.6] text-maroon/75">
            {ganpati.didYouKnow}
          </div>
        </div>
      )}

      {/* Tabs: secondary reference info */}
      <div className="mx-gutter-lg mt-5 flex border-b-2 border-maroon/[0.08]">
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
      <div className="px-gutter-lg py-5">
        <div className="flex flex-col" hidden={tab !== 'timings'}>
          <TimingRow title="Morning Aarti" value={ganpati.morningAarti} />
          <TimingRow title="Evening Aarti" value={ganpati.eveningAarti} />
          <TimingRow title="Special Events" value={ganpati.specialEvents} />
        </div>

        <div
          className="font-sans text-[15px] leading-[1.8] text-maroon/75"
          hidden={tab !== 'history'}
        >
          {ganpati.history}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-[calc(150px_+_env(safe-area-inset-bottom))] z-[60] flex justify-center px-gutter">
          <div className="animate-fadeIn rounded-pill bg-maroon px-5 py-2.5 font-sans text-[13px] font-medium text-light shadow-[0_4px_16px_rgba(107,30,46,0.25)]">
            Added to your route
          </div>
        </div>
      )}

      {/* Action bar, stacked flush on top of the fixed bottom nav (never hidden) */}
      <div className="fixed inset-x-0 bottom-[calc(56px_+_env(safe-area-inset-bottom))] z-50 flex gap-3 border-t border-maroon/[0.08] bg-cream px-gutter py-3.5">
        {inRoute ? (
          <div
            className="flex-1 cursor-pointer rounded-card border border-maroon/10 bg-surface p-3.5 text-center font-sans text-sm font-semibold text-maroon/50 hover:text-maroon"
            onClick={() => removeFromRoute(ganpati.id)}
          >
            Remove from Route
          </div>
        ) : (
          <div
            className="flex-1 cursor-pointer rounded-card bg-maroon p-3.5 text-center font-sans text-sm font-semibold text-light hover:bg-maroon-dark"
            onClick={onAdd}
          >
            Add to Route
          </div>
        )}
      </div>
    </main>
  );
}
