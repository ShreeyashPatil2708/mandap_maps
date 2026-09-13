import { LogoMark } from './icons.jsx';
import Container from './Container.jsx';
import Link from './Link.jsx';
import { PATHS } from '../router.js';

// Top bar: maroon, sticky, brand mark on the left.
//
// On a phone it carries only the hamburger, because navigation belongs in the
// thumb-reachable tab bar at the bottom. On a laptop that tab bar is hidden (it
// is a phone pattern, and pinned to the bottom of a 1920px screen it was the
// loudest "this is a mobile app" signal on the site), so the same four
// destinations move up here, where desktop users look for them.
//
// These are real <Link> elements, not buttons, so the nav is still a crawlable
// link graph. Ask is the exception: it opens a sheet rather than navigating,
// exactly as it does in the tab bar.
export default function Navbar({ onToggleMenu, routeLen = 0, askOpen, onAsk, onSupport }) {
  const link =
    'cursor-pointer rounded-pill px-3 py-1.5 font-sans text-sm font-medium text-light/75 no-underline transition-colors hover:bg-light/10 hover:text-light';

  return (
    <header className="sticky top-0 z-[100] bg-maroon">
      <Container className="flex items-center justify-between py-3.5">
        <Link to={PATHS.home} className="flex cursor-pointer items-center gap-2">
          <LogoMark />
          <span className="font-serif text-[17px] tracking-[0.3px] text-gold">MandapMaps</span>
        </Link>

        {/* Desktop navigation. Hidden on phones, where BottomNav owns this. */}
        <nav className="hidden items-center gap-1 lg:flex">
          <Link to={PATHS.home} className={link}>
            Home
          </Link>
          <Link to={PATHS.explore} className={link}>
            Explore
          </Link>
          <Link to={PATHS.route} className={`${link} relative`}>
            Route
            {routeLen > 0 && (
              <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 font-sans text-[10px] font-bold text-maroon">
                {routeLen}
              </span>
            )}
          </Link>
          <button
            onClick={onAsk}
            aria-pressed={askOpen}
            className={`${link} ${askOpen ? 'bg-light/10 text-light' : ''}`}
          >
            Ask
          </button>
          <button
            onClick={onSupport}
            className="ml-2 cursor-pointer rounded-pill bg-gold px-4 py-2 font-sans text-sm font-semibold text-maroon transition-colors hover:bg-gold-dark"
          >
            Support Us
          </button>
        </nav>

        <div
          className="flex cursor-pointer flex-col gap-1 p-1.5 lg:hidden"
          onClick={onToggleMenu}
          aria-label="Open menu"
        >
          <div className="h-0.5 w-5 rounded-[1px] bg-gold" />
          <div className="h-0.5 w-5 rounded-[1px] bg-gold" />
          <div className="h-0.5 w-3.5 rounded-[1px] bg-gold" />
        </div>
      </Container>
    </header>
  );
}
