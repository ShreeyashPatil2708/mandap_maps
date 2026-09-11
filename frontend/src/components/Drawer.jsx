// Right-side slide-in navigation drawer. Backdrop closes it; inner clicks are
// stopped so they don't bubble to the backdrop. The "Help detect crowds" state
// lives in App so the location pinger reacts to the toggle immediately.
export default function Drawer({
  open,
  onClose,
  onHome,
  onExplore,
  onRoute,
  onPrivacy,
  onSupport,
  sharing,
  onToggleSharing,
}) {
  if (!open) return null;

  const link =
    'cursor-pointer border-b border-maroon/[0.07] py-3 font-serif text-xl text-maroon';

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-maroon/45" />
      <div
        className="relative flex h-full w-[260px] animate-slideInRight flex-col bg-cream"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end px-gutter pt-gutter">
          <div
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-maroon/[0.08] text-base text-maroon"
            onClick={onClose}
          >
            ✕
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 px-7 py-8">
          <div className="mb-3 font-sans text-[10px] font-semibold uppercase tracking-[2px] text-maroon/35">
            Navigation
          </div>
          <div className={link} onClick={onHome}>
            Home
          </div>
          <div className={link} onClick={onExplore}>
            Explore
          </div>
          <div className={link} onClick={onRoute}>
            Plan Route
          </div>
          <div className="mt-auto pt-6">
            <div
              className="cursor-pointer rounded-[10px] bg-maroon px-[18px] py-3.5 text-center"
              onClick={onSupport}
            >
              <div className="font-serif text-base text-gold">Support Us 🙏</div>
              <div className="mt-0.5 font-sans text-[11px] text-light/45">
                Built with devotion in Pune
              </div>
            </div>
            {/* Live-crowd sharing: an informed, on-brand opt-in. Keeps the user
                in control and states plainly what is shared and for how long. */}
            <label className="mt-4 flex cursor-pointer items-start justify-between gap-3 rounded-[10px] border border-maroon/[0.08] bg-surface px-3.5 py-3">
              <span>
                <span className="block font-sans text-sm font-medium text-maroon">
                  Help detect crowds
                </span>
                <span className="mt-0.5 block font-sans text-[11px] leading-[1.5] text-maroon/50">
                  Shares your approximate location while the app is open so we can show live
                  crowds. Anonymous, off by default, deleted after 30 min.
                </span>
              </span>
              <input
                type="checkbox"
                checked={sharing}
                onChange={onToggleSharing}
                className="mt-0.5 h-4 w-4 flex-none accent-maroon"
              />
            </label>

            <div
              className="mt-4 cursor-pointer text-center font-sans text-xs text-maroon/45"
              onClick={onPrivacy}
            >
              Privacy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}