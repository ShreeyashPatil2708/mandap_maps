import { LogoMark } from './icons.jsx';
import Link from './Link.jsx';
import { PATHS } from '../router.js';

// Top bar: maroon, sticky, with the brand mark on the left and a hamburger on
// the right. Navigation lives in the hero CTAs and the hamburger drawer, so the
// bar itself carries no duplicate text links.
export default function Navbar({ onToggleMenu }) {
  return (
    <header className="sticky top-0 z-[100] flex items-center justify-between bg-maroon px-gutter py-3.5">
      <Link to={PATHS.home} className="flex cursor-pointer items-center gap-2">
        <LogoMark />
        <span className="font-serif text-[17px] tracking-[0.3px] text-gold">MandapMaps</span>
      </Link>
      <div
        className="flex cursor-pointer flex-col gap-1 p-1.5"
        onClick={onToggleMenu}
        aria-label="Open menu"
      >
        <div className="h-0.5 w-5 rounded-[1px] bg-gold" />
        <div className="h-0.5 w-5 rounded-[1px] bg-gold" />
        <div className="h-0.5 w-3.5 rounded-[1px] bg-gold" />
      </div>
    </header>
  );
}
