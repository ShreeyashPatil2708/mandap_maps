import { useMemo } from 'react';
import { useGanpatis } from '../context/GanpatisContext.jsx';
import { useRoute } from '../context/RouteContext.jsx';
import CIRCUITS from '../data/circuits.js';

// One circuit card: name, the stop count / time / distance meta, a short note,
// the ordered stops as tappable chips, then a button that loads the whole
// circuit into the darshan route in one tap. Each stop resolves to a live
// Ganpati record and opens its detail view; unresolved names (if the dataset
// ever changes) degrade to plain, non-tappable text and are skipped by the
// "add all" action.
function CircuitCard({ circuit, byName, onOpenGanpati }) {
  const { route, addToRoute } = useRoute();

  // Resolve stop names to live records once; keep only the ones that exist.
  const resolved = useMemo(
    () => circuit.stops.map((n) => byName.get(n)).filter(Boolean),
    [circuit.stops, byName]
  );
  const allInRoute = resolved.length > 0 && resolved.every((g) => route.includes(g.id));

  const meta = [`${circuit.stops.length} stops`, circuit.time, circuit.distance]
    .filter(Boolean)
    .join(' · ');

  const addAll = () => resolved.forEach((g) => addToRoute(g.id));

  return (
    <div className="overflow-hidden rounded-card border border-maroon/[0.06] bg-surface">
      <div className="px-gutter pb-4 pt-4">
        <div className="font-serif text-[18px] leading-[1.25] text-maroon">{circuit.name}</div>
        <div className="mt-1.5 font-sans text-[12px] text-maroon/45">{meta}</div>
        <div className="mt-1 font-sans text-[12px] leading-[1.5] text-maroon/40">{circuit.note}</div>
      </div>

      <div className="flex flex-col gap-2 border-t border-maroon/[0.06] px-gutter py-3.5">
        {circuit.stops.map((stopName, i) => {
          const g = byName.get(stopName);
          return (
            <div
              key={stopName}
              onClick={g ? () => onOpenGanpati(g.id) : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2 ${
                g ? 'cursor-pointer bg-light hover:bg-cream' : 'bg-light/60'
              }`}
            >
              <div className="w-5 flex-none text-center font-serif text-[15px] text-gold">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1 font-sans text-[13px] font-medium text-maroon">
                {g ? g.name : stopName}
              </div>
              {g && <div className="flex-none font-sans text-[16px] text-maroon/25">›</div>}
            </div>
          );
        })}

        {allInRoute ? (
          <div className="mt-1.5 rounded-card border border-maroon/10 bg-light px-4 py-3 text-center font-sans text-[13px] font-semibold text-maroon/50">
            All stops added to route
          </div>
        ) : (
          <div
            onClick={addAll}
            className="mt-1.5 cursor-pointer rounded-card bg-maroon px-4 py-3 text-center font-sans text-[13px] font-semibold text-light hover:bg-maroon-dark"
          >
            Add circuit to route
          </div>
        )}
      </div>
    </div>
  );
}

// "Suggested Circuits" section: ready-made walking routes through Pune's pandals.
export default function Circuits({ onOpenGanpati }) {
  const { ganpatis } = useGanpatis();
  const byName = useMemo(() => new Map(ganpatis.map((g) => [g.name, g])), [ganpatis]);

  return (
    <div>
      <div className="mb-4">
        <div className="font-serif text-[22px] text-maroon">Suggested Circuits</div>
        <div className="font-devanagari text-[13px] text-maroon/40">ठरलेले मार्ग</div>
      </div>
      <div className="flex flex-col gap-3.5">
        {CIRCUITS.map((c) => (
          <CircuitCard key={c.id} circuit={c} byName={byName} onOpenGanpati={onOpenGanpati} />
        ))}
      </div>
    </div>
  );
}
