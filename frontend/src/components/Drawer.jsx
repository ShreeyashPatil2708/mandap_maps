// Right-side slide-in navigation drawer. Backdrop closes it; inner clicks are
// stopped so they don't bubble to the backdrop.
export default function Drawer({ open, onClose, onHome, onExplore, onRoute, onSupport }) {
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
          </div>
        </div>
      </div>
    </div>
  );
}
