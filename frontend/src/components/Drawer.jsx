import Link from './Link.jsx';
import { PATHS } from '../router.js';
import { GitHubIcon } from './icons.jsx';
import { GITHUB_URL, CONTACT_MAILTO, CORRECTION_MAILTO } from '../data/links.js';

// Right-side slide-in navigation drawer. Backdrop closes it; inner clicks are
// stopped so they don't bubble to the backdrop.
//
// The credit block lives here rather than in the footer. It used to sit under a
// divider at the very bottom of a tall maroon footer on every page, which is
// both too far down to find and, repeated page after page, closer to an ask
// than a colophon. Opening this menu is a deliberate act, so whoever reads it
// went looking.
export default function Drawer({ open, onClose, onSupport }) {
  if (!open) return null;

  const link = 'cursor-pointer border-b border-maroon/[0.07] py-3 font-serif text-xl text-maroon';
  const meta = 'cursor-pointer font-sans text-[11px] text-maroon/45 hover:text-maroon no-underline';

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-maroon/45" />
      <div
        className="relative flex h-full w-[260px] animate-slideInRight flex-col overflow-y-auto bg-cream"
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
          <Link to={PATHS.home} className={link} onClick={onClose}>
            Home
          </Link>
          <Link to={PATHS.explore} className={link} onClick={onClose}>
            Explore
          </Link>
          <Link to={PATHS.route} className={link} onClick={onClose}>
            Plan Route
          </Link>
          <Link to={PATHS.team} className={link} onClick={onClose}>
            About
          </Link>
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

            <p className="mt-4 font-sans text-[11px] leading-[1.7] text-maroon/45">
              By 3 Pune engineers who wanted this to exist.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MandapMaps on GitHub"
                className="flex items-center gap-1.5 font-sans text-[11px] text-maroon/45 no-underline hover:text-maroon"
              >
                <GitHubIcon size={14} /> GitHub
              </a>
              <a href={CONTACT_MAILTO} className={meta}>
                Contact
              </a>
            </div>

            {/* Timings drift through the festival, and whoever is standing in
                front of a mandal notices before we do. */}
            <a href={CORRECTION_MAILTO} className={`mt-3 block ${meta}`}>
              Spotted something wrong? Suggest a correction
            </a>

            <Link to={PATHS.privacy} className={`mt-3 block ${meta}`} onClick={onClose}>
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
