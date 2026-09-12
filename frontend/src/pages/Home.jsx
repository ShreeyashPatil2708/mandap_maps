import { useEffect, useMemo, useState } from 'react';
import { useGanpatis } from '../context/GanpatisContext.jsx';
import { manachaBadge, areaFilters } from '../data/helpers.js';
import { OmMark } from '../components/icons.jsx';
import PandalPhoto from '../components/PandalPhoto.jsx';
import Circuits from '../components/Circuits.jsx';
import Container from '../components/Container.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import Link from '../components/Link.jsx';
import { PATHS, ganpatiPath } from '../router.js';
import GANPATI_FACTS from '../data/facts.js';

// Carousel card for a Manacha Ganpati on the homepage.
function Manache5Card({ g }) {
  return (
    <Link
      to={ganpatiPath(g)}
      className="w-[170px] flex-none cursor-pointer snap-start overflow-hidden rounded-card border border-maroon/[0.06] bg-surface transition-colors hover:border-gold/40 sm:w-auto"
    >
      <div className="relative flex h-[105px] items-center justify-center bg-maroon">
        <OmMark size={40} textSize={18} opacity={0.6} />
        <PandalPhoto g={g} sizes="170px" />
        <div className="absolute left-2 top-2 rounded-badge bg-gold px-[9px] py-[3px] font-sans text-[10px] font-semibold text-maroon">
          {manachaBadge(g.manacha)}
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="font-serif text-[15px] leading-[1.3] text-maroon">{g.name}</div>
        <div className="mt-0.5 font-devanagari text-xs text-maroon/45" lang="mr">
          {g.nameMarathi}
        </div>
        <div className="mt-1 font-sans text-xs text-maroon/35">{g.area}</div>
      </div>
    </Link>
  );
}

// Row card for the "Visit" list.
function VisitRow({ g }) {
  return (
    <Link
      to={ganpatiPath(g)}
      className="flex cursor-pointer items-start gap-3 rounded-card border border-maroon/[0.06] bg-surface px-4 py-3 hover:border-gold/40"
    >
      <div className="relative flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-lg bg-maroon">
        <OmMark size={28} textSize={13} opacity={0.5} />
        <PandalPhoto g={g} sizes="44px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[15px] leading-[1.3] text-maroon">{g.name}</div>
        <div className="font-devanagari text-xs text-maroon/40" lang="mr">
          {g.nameMarathi}
        </div>
        {/* Stacked under the name rather than pinned to the right of the row.
            Right-aligned, a long area squeezed a long name onto three lines. */}
        <div className="mt-1 truncate font-sans text-xs text-maroon/40">{g.area}</div>
      </div>
    </Link>
  );
}

// "Did you know?" deck. Replaces the old countdown, which was pinned to a fixed
// date and had already run down to zero.
//
// Facts are shown in a shuffled order and advanced by the reader, not on a
// timer: a fact that changes under you while you are still reading it is worse
// than one you asked for. The deck reshuffles once it has been through every
// fact, so nothing repeats until all of them have been seen.
function shuffled(n) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function DidYouKnow() {
  // The homepage is prerendered, so the first render has to be deterministic or
  // the server and client markup disagree. Shuffling happens after mount.
  const [order, setOrder] = useState(null);
  const [pos, setPos] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setOrder(shuffled(GANPATI_FACTS.length));
  }, []);

  const fact = GANPATI_FACTS[order ? order[pos] : 0];

  const next = () => {
    setVisible(false);
    setTimeout(() => {
      const at = pos + 1;
      if (at >= (order ? order.length : GANPATI_FACTS.length)) {
        // Seen them all, deal a fresh order.
        setOrder(shuffled(GANPATI_FACTS.length));
        setPos(0);
      } else {
        setPos(at);
      }
      setVisible(true);
    }, 200);
  };

  return (
    <div className="rounded-card border border-maroon/[0.06] bg-surface px-5 py-5">
      {/* Stacked on a phone, a single row on wider screens so the card does not
          become one short line of text stranded in a very wide box. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-gold">
            Did you know?
          </div>
          {/* Reserve the height of the longest fact so the card does not jump
              as the reader clicks through. */}
          <div
            className="min-h-[72px] font-sans text-[15px] leading-[1.6] text-maroon/75 transition-opacity duration-200 sm:min-h-[48px]"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {fact}
          </div>
        </div>
        <button
          type="button"
          onClick={next}
          className="flex-none cursor-pointer self-start rounded-pill border-[1.5px] border-maroon/15 px-5 py-2 font-sans text-[13px] font-medium text-maroon transition-colors hover:border-maroon/40 hover:bg-maroon/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:self-center"
        >
          Next fact
        </button>
      </div>
    </div>
  );
}

// `enter` is the entry animation class, empty for the screen the visitor landed
// on (it is already painted from the prerendered HTML). See App.jsx.
export default function Home({ enter = 'animate-fadeIn', onFilter }) {
  const { ganpatis } = useGanpatis();

  // The five Manache Ganpatis, ordered by rank.
  const manache5 = useMemo(
    () => ganpatis.filter((g) => g.manacha).sort((a, b) => a.manacha - b.manacha),
    [ganpatis]
  );
  // Non-Manache pandals surfaced in the "Visit" section. This used to show
  // three out of a hundred and seven, which left the homepage looking like it
  // had nothing on it.
  const visitPicks = useMemo(() => ganpatis.filter((g) => !g.manacha).slice(0, 8), [ganpatis]);
  // Areas worth browsing, same source as the Explore filter chips.
  const areas = useMemo(() => areaFilters(ganpatis).slice(0, 8), [ganpatis]);

  // Open Explore already filtered to the area that was tapped.
  const openArea = (key) => {
    if (onFilter) onFilter(key);
  };

  return (
    <main className={enter}>
      {/* Hero */}
      <div className="relative overflow-hidden bg-maroon">
        <Container className="relative flex min-h-[320px] flex-col justify-end pb-11 pt-[60px] md:min-h-[420px] md:justify-center">
          <div
            className="pointer-events-none absolute -right-5 top-5 select-none font-devanagari text-[200px] font-bold leading-none text-gold/[0.06] md:right-0 md:top-1/2 md:-translate-y-1/2 md:text-[260px]"
            aria-hidden="true"
          >
            श्री
          </div>
          <div className="relative z-[1] md:max-w-[58%]">
            <div className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[3px] text-gold">
              Pune · Ganeshotsav 2026
            </div>
            <h1 className="mb-4 font-serif text-[clamp(32px,8vw,48px)] leading-[1.1] text-light">
              Your Darshan
              <br />
              Companion
            </h1>
            <div className="mb-7 max-w-[340px] font-sans text-[15px] leading-[1.6] text-light/60">
              Find pandals, plan your route, learn the history of Pune&apos;s beloved Ganpatis.
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={PATHS.explore}
                className="cursor-pointer whitespace-nowrap rounded-pill bg-gold px-8 py-3.5 font-sans text-[15px] font-semibold text-maroon hover:bg-gold-dark"
              >
                Start Exploring
              </Link>
              <Link
                to={PATHS.route}
                className="cursor-pointer rounded-pill border-[1.5px] border-light/25 px-8 py-3.5 font-sans text-[15px] font-medium text-light hover:border-light/50"
              >
                Plan Route
              </Link>
            </div>
          </div>
        </Container>
      </div>

      {/* Manache 5. A snap rail on a phone, a row of five on a wide screen,
          where the rail used to stop short and leave the section half empty. */}
      <Container className="pb-9 pt-8">
        <SectionHeader
          title="Manache 5"
          marathi="मानाचे पाच गणपती"
          linkTo={PATHS.explore}
          linkLabel="View others →"
        />
        <div className="-mx-gutter-lg flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-gutter-lg pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
          {manache5.map((g) => (
            <Manache5Card key={g.id} g={g} />
          ))}
        </div>
      </Container>

      {/* Did you know */}
      <Container className="pb-9">
        <DidYouKnow />
      </Container>

      {/* Visit */}
      <Container className="pb-9">
        <SectionHeader
          title="Visit"
          marathi="दर्शनासाठी"
          linkTo={PATHS.explore}
          linkLabel="View all →"
        />
        <div className="grid gap-2.5 md:grid-cols-2">
          {visitPicks.map((g) => (
            <VisitRow key={g.id} g={g} />
          ))}
        </div>
      </Container>

      {/* Browse by area */}
      {areas.length > 0 && (
        <Container className="pb-9">
          <SectionHeader title="Browse by area" marathi="भागानुसार" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {areas.map((a) => (
              <Link
                key={a.key}
                to={PATHS.explore}
                onClick={() => openArea(a.key)}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-card border border-maroon/[0.06] bg-surface px-4 py-3 hover:border-gold/40"
              >
                <span className="min-w-0 truncate font-sans text-[14px] font-medium text-maroon">
                  {a.label}
                </span>
                <span className="flex-none font-sans text-xs text-maroon/40">{a.count}</span>
              </Link>
            ))}
          </div>
        </Container>
      )}

      {/* Suggested Circuits */}
      <Container className="pb-9">
        <Circuits />
      </Container>
    </main>
  );
}
