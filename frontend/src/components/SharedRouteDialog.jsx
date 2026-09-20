import { ShareIcon } from './icons.jsx';

// Bottom sheet that appears when a visitor lands on a route link shared by a
// friend (`/route?stops=...`) and already has stops of their own. Accepting
// replaces their route; declining keeps it. Mirrors SupportModal's sheet style.

export default function SharedRouteDialog({ count, names, onAccept, onDecline }) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center lg:items-center"
      onClick={onDecline}
    >
      <div className="absolute inset-0 bg-maroon/60" />
      <div
        className="relative w-full max-w-[480px] animate-slideUp rounded-t-sheet bg-cream px-gutter-lg pb-9 pt-7 lg:rounded-sheet lg:shadow-[0_18px_50px_rgba(107,30,46,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-6 h-1 w-10 rounded-[2px] bg-maroon/10 lg:hidden" />
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
            <ShareIcon />
          </div>
          <div className="font-serif text-xl text-maroon">A friend shared a darshan route</div>
          <p className="mx-auto mt-2 max-w-[340px] font-sans text-[13px] leading-[1.6] text-maroon/60">
            They planned {count} {count === 1 ? 'stop' : 'stops'}
            {names.length > 0 && (
              <>
                : <span className="text-maroon">{names.join(', ')}</span>
              </>
            )}
            . Replace your current route with theirs?
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onAccept}
              className="cursor-pointer rounded-card bg-gold px-7 py-3 font-sans text-[15px] font-semibold text-maroon hover:bg-gold-dark"
            >
              Use their route
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="cursor-pointer rounded-card border-[1.5px] border-maroon/15 px-7 py-3 font-sans text-[15px] font-medium text-maroon hover:border-maroon/40 hover:bg-maroon/5"
            >
              Keep my route
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}