import { useEffect, useMemo, useState } from 'react';
import { useGanpatis } from '../context/GanpatisContext.jsx';
import { manachaBadge } from '../data/helpers.js';
import { OmMark } from '../components/icons.jsx';
import Circuits from '../components/Circuits.jsx';

const UPI_ID = import.meta.env.VITE_UPI_ID || 'yourname@upi';

const FACTS = [
  "Dagdusheth's idol has 8 kg of gold, donated by devotees over 130 years.",
  'Kasba Ganpati\'s idol was originally the size of a grain of rice. It has grown over 385 years.',
  "Guruji Talim was co-founded by a Hindu and Muslim family in 1887, six years before Tilak's Ganeshotsav.",
  'Tulshibaug Ganpati was the first mandal in Pune to use a fibreglass idol, in 1975.',
  'Every public Ganeshotsav in India traces its origin to Kesariwada, where Tilak had the idea in 1893.',
];

// Carousel card for a Manacha Ganpati on the homepage.
function Manache5Card({ g, onOpen }) {
  return (
    <div
      className="w-[170px] flex-none cursor-pointer snap-start overflow-hidden rounded-card border border-maroon/[0.06] bg-surface"
      onClick={onOpen}
    >
      <div className="relative flex h-[105px] items-center justify-center bg-maroon">
        <OmMark size={40} textSize={18} opacity={0.6} />
        <div className="absolute left-2 top-2 rounded-badge bg-gold px-[9px] py-[3px] font-sans text-[10px] font-semibold text-maroon">
          {manachaBadge(g.manacha)}
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="font-serif text-[15px] leading-[1.3] text-maroon">{g.name}</div>
        <div className="mt-0.5 font-devanagari text-xs text-maroon/45">{g.nameMarathi}</div>
        <div className="mt-1 font-sans text-xs text-maroon/35">{g.area}</div>
      </div>
    </div>
  );
}

// Row card for the "Visit" list.
function VisitRow({ g, onOpen }) {
  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-card border border-maroon/[0.06] bg-surface px-4 py-3 hover:border-gold/40"
      onClick={onOpen}
    >
      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-maroon">
        <OmMark size={28} textSize={13} opacity={0.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[15px] leading-[1.3] text-maroon">{g.name}</div>
        <div className="font-devanagari text-xs text-maroon/40">{g.nameMarathi}</div>
      </div>
      <div className="whitespace-nowrap font-sans text-xs text-maroon/40">{g.area}</div>
    </div>
  );
}

// Countdown to Ganeshotsav plus a rotating "Did you know?" fact. The fact
// cross-fades every 5 seconds (0.4s out, swap, 0.4s in).
function CountdownCard() {
  const daysLeft = useMemo(() => {
    const target = new Date(2026, 7, 22); // 22 August 2026 (month is 0-indexed)
    const ms = target - new Date();
    return Math.max(0, Math.ceil(ms / 86400000));
  }, []);

  const [factIndex, setFactIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setFactIndex((i) => (i + 1) % FACTS.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-hidden rounded-card border border-maroon/[0.06] bg-surface">
      {/* Countdown */}
      <div className="flex items-center gap-4 px-gutter py-5">
        <div className="font-serif text-[52px] leading-none text-gold">{daysLeft}</div>
        <div className="min-w-0">
          <div className="font-sans text-[15px] leading-[1.3] text-maroon">
            days to Ganeshotsav 2026
          </div>
          <div className="mt-1.5 font-sans text-[11px] text-maroon/45">
            <span className="font-devanagari">पुण्याचा उत्सव</span> · 50+ pandals mapped
          </div>
        </div>
      </div>

      {/* Thin divider */}
      <div className="border-t border-maroon/[0.08]" />

      {/* Did you know */}
      <div className="px-gutter py-5">
        <div className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-gold">
          Did you know?
        </div>
        <div
          className="min-h-[46px] font-sans text-[13px] leading-[1.6] text-maroon/70 transition-opacity duration-[400ms]"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {FACTS[factIndex]}
        </div>
      </div>
    </div>
  );
}

export default function Home({ onExplore, onRoute, onOpenGanpati, onSupport }) {
  const { ganpatis } = useGanpatis();

  // The five Manache Ganpatis, ordered by rank.
  const manache5 = useMemo(
    () => ganpatis.filter((g) => g.manacha).sort((a, b) => a.manacha - b.manacha),
    [ganpatis]
  );
  // Three non-Manache pandals surfaced in the "Visit" section.
  const visitPicks = useMemo(() => ganpatis.filter((g) => !g.manacha).slice(0, 3), [ganpatis]);

  return (
    <div className="animate-fadeIn">
      {/* Hero */}
      <div className="relative flex min-h-[320px] flex-col justify-end overflow-hidden bg-maroon px-gutter-lg pb-11 pt-[60px]">
        <div className="pointer-events-none absolute -right-5 top-5 select-none font-devanagari text-[200px] font-bold leading-none text-gold/[0.06]">
          श्री
        </div>
        <div className="relative z-[1] max-w-[600px]">
          <div className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[3px] text-gold">
            Pune · Ganeshotsav 2026
          </div>
          <div className="mb-4 font-serif text-[clamp(32px,8vw,48px)] leading-[1.1] text-light">
            Your Darshan
            <br />
            Companion
          </div>
          <div className="mb-7 max-w-[340px] font-sans text-[15px] leading-[1.6] text-light/60">
            Find pandals, plan your route, learn the history of Pune&apos;s beloved Ganpatis.
          </div>
          <div className="flex flex-wrap gap-3">
            <div
              className="cursor-pointer whitespace-nowrap rounded-pill bg-gold px-8 py-3.5 font-sans text-[15px] font-semibold text-maroon hover:bg-gold-dark"
              onClick={onExplore}
            >
              Start Exploring
            </div>
            <div
              className="cursor-pointer rounded-pill border-[1.5px] border-light/25 px-7 py-[13px] font-sans text-[15px] font-medium text-light hover:border-light/50"
              onClick={onRoute}
            >
              Plan Route
            </div>
          </div>
        </div>
      </div>

      {/* Manache 5 */}
      <div className="pb-7 pt-8">
        <div className="mb-4 flex items-baseline justify-between px-gutter-lg">
          <div>
            <div className="font-serif text-[22px] text-maroon">Manache 5</div>
            <div className="font-devanagari text-[13px] text-maroon/40">मानाचे पाच गणपती</div>
          </div>
          <div
            className="cursor-pointer font-sans text-[13px] font-medium text-gold"
            onClick={onExplore}
          >
            View others →
          </div>
        </div>
        <div className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-gutter-lg pb-2">
          {manache5.map((g) => (
            <Manache5Card key={g.id} g={g} onOpen={() => onOpenGanpati(g.id)} />
          ))}
        </div>
      </div>

      {/* Visit */}
      <div className="px-gutter-lg pb-7">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <div className="font-serif text-[22px] text-maroon">Visit</div>
            <div className="font-devanagari text-[13px] text-maroon/40">दर्शनासाठी</div>
          </div>
          <div
            className="cursor-pointer font-sans text-[13px] font-medium text-gold"
            onClick={onExplore}
          >
            View all →
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {visitPicks.map((g) => (
            <VisitRow key={g.id} g={g} onOpen={() => onOpenGanpati(g.id)} />
          ))}
        </div>
      </div>

      {/* Suggested Circuits */}
      <div className="px-gutter-lg pb-7">
        <Circuits onOpenGanpati={onOpenGanpati} />
      </div>

      {/* Countdown + Did you know */}
      <div className="px-gutter-lg pb-9 pt-2">
        <CountdownCard />
      </div>

      {/* Support Us */}
      <div className="px-gutter-lg pb-9">
        <div className="overflow-hidden rounded-panel bg-maroon">
          <div className="px-gutter pb-5 pt-6">
            <div className="mb-2 font-serif text-[19px] text-light">Built with devotion</div>
            <div className="font-sans text-[13px] leading-[1.6] text-light/60">
              By 3 Pune engineers who wanted this to exist. If it made your darshan easier, we&apos;d
              love your support.
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 bg-light/[0.06] p-gutter">
            <div className="rounded-md bg-gold/10 px-3.5 py-[5px] font-sans text-[13px] font-medium tracking-[0.5px] text-gold">
              {UPI_ID}
            </div>
            <div className="font-sans text-[11px] text-light/45">UPI QR coming soon</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-maroon px-gutter-lg pb-nav-safe pt-7">
        <div>
          <div className="mb-1 font-serif text-[15px] text-gold">MandapMaps</div>
          <div className="font-sans text-[11px] text-light/35">Made with devotion in Pune</div>
        </div>
        <div className="cursor-pointer font-sans text-xs text-gold" onClick={onSupport}>
          Support Us 🙏
        </div>
      </div>
    </div>
  );
}
