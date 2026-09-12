import Container from './Container.jsx';
import Link from './Link.jsx';
import { PATHS } from '../router.js';

// The site footer, on every page.
//
// It used to live inline in Home.jsx, so Explore, Route, Detail and Privacy
// simply ran out of content into the tab bar with nothing to close them off.
//
// It is deliberately thin. The support QR and the credit that used to sit here
// have moved into the menu drawer and the Team page: the ask already appears in
// the one-time SupportModal, the drawer button and the Team page panel, and a
// fourth copy at the bottom of every single page was pushing it at people. What
// is left is what a footer is for, a way out of the page.
//
// `bottomPad` clears whatever fixed chrome sits over the bottom of the page:
// the tab bar everywhere, plus Detail's action bar stacked on top of it.
export default function Footer({ bottomPad = 'pb-nav-safe' }) {
  const link = 'cursor-pointer text-light/70 no-underline hover:text-gold';

  return (
    <footer className={`mt-10 bg-maroon pt-7 ${bottomPad}`}>
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-serif text-[17px] text-gold">MandapMaps</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-sans text-[13px]">
            <Link to={PATHS.explore} className={link}>
              Explore
            </Link>
            <Link to={PATHS.route} className={link}>
              My Route
            </Link>
            <Link to={PATHS.team} className={link}>
              About
            </Link>
            <Link to={PATHS.privacy} className={link}>
              Privacy
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-light/10 pt-4 font-sans text-[11px] text-light/35">
          Made with devotion in Pune
        </div>
      </Container>
    </footer>
  );
}
