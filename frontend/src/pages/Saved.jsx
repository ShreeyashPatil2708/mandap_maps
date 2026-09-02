import { useGanpatis } from '../context/GanpatisContext.jsx';
import { useSaved } from '../context/SavedContext.jsx';
import { OmMark } from '../components/icons.jsx';
import { manachaBadge } from '../data/helpers.js';

export default function Saved({ onOpenGanpati, onExplore }) {
  const { ganpatis } = useGanpatis();
  const { saved, unsaveGanpati } = useSaved();

  const items = [...saved]
    .map((id) => ganpatis.find((g) => g.id === id))
    .filter(Boolean);

  return (
    <div className="animate-fadeIn px-gutter pb-nav-safe pt-gutter">
      <div className="mb-6">
        <div className="font-serif text-2xl text-maroon">Saved Pandals</div>
        <div className="mt-0.5 font-devanagari text-[13px] text-maroon/40">जतन केलेले गणपती</div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-maroon/[0.06] bg-surface px-gutter py-[60px] text-center">
          <div className="mb-2 font-serif text-xl text-maroon">No saved pandals yet</div>
          <div className="mb-6 font-sans text-sm leading-[1.6] text-maroon/50">
            Tap the bookmark icon on any pandal to save it here
          </div>
          <div
            className="inline-block cursor-pointer rounded-pill bg-gold px-7 py-3 font-sans text-sm font-semibold text-maroon hover:bg-gold-dark"
            onClick={onExplore}
          >
            Explore Pandals
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((g) => (
            <div
              key={g.id}
              className="flex cursor-pointer items-center gap-3 rounded-card border border-maroon/[0.06] bg-surface px-4 py-3.5 transition-all hover:border-gold/30"
              onClick={() => onOpenGanpati(g.id)}
            >
              <div className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-lg bg-maroon">
                <OmMark size={28} textSize={12} opacity={0.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-serif text-[15px] text-maroon">{g.name}</div>
                <div className="font-sans text-xs text-maroon/40">
                  {g.area}
                  {g.manacha ? ` · ${manachaBadge(g.manacha)}` : ''}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); unsaveGanpati(g.id); }}
                aria-label="Remove from saved"
                className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-lg text-maroon/30 hover:bg-maroon/5 hover:text-maroon"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
