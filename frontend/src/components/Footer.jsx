import Container from './Container.jsx';
import Link from './Link.jsx';
import { PATHS } from '../router.js';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../data/links.js';

// The site footer, on every page.
//
// It used to live inline in Home.jsx, so Explore, Route, Detail and Privacy
// simply ran out of content into the tab bar with nothing to close them off.
//
// It links only to what is not already in the chrome. Explore and My Route are
// in the tab bar on a phone and in the top bar on a laptop, so listing them
// here made them a third copy.
//
// The contact address is spelled out rather than hidden behind a "get in
// touch" link. A bare mailto silently does nothing for a desktop visitor with
// no mail client configured; an address on screen can always be copied, and
// still opens a composer for everyone else. It asks for suggestions rather
// than reporting faults, and the "made with devotion" colophon is gone: the
// drawer's Support Us button already carries that line.
//
// `bottomPad` clears whatever fixed chrome sits over the bottom of the page:
// the tab bar and, on Detail, its action bar stacked on top. None of that
// exists on desktop, which is where the tall empty maroon block came from, so
// the reserve is dropped at `lg:`.
export default function Footer({ bottomPad = 'pb-nav-safe' }) {
  const link = 'cursor-pointer text-light/70 no-underline hover:text-gold';

  return (
    <footer className={`mt-10 bg-maroon pt-7 lg:pb-9 ${bottomPad}`}>
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-serif text-[17px] text-gold">MandapMaps</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-sans text-[13px]">
            <Link to={PATHS.privacy} className={link}>
              Privacy
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-light/10 pt-4 font-sans text-[11px] text-light/35">
          Got a suggestion? Write to us at{' '}
          <a href={CONTACT_MAILTO} className="text-light/60 no-underline hover:text-gold">
            {CONTACT_EMAIL}
          </a>
        </div>
      </Container>
    </footer>
  );
}
