import { useEffect, useMemo, useRef, useState } from 'react';
import { useGanpatis } from './context/GanpatisContext.jsx';
import { useRoute, readSharedRouteFromUrl } from './context/RouteContext.jsx';
import Navbar from './components/Navbar.jsx';
import Drawer from './components/Drawer.jsx';
import BottomNav from './components/BottomNav.jsx';
import SupportModal from './components/SupportModal.jsx';
import AskSheet from './components/AskSheet.jsx';
import SharedRouteDialog from './components/SharedRouteDialog.jsx';
import Link from './components/Link.jsx';
import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import Detail from './pages/Detail.jsx';
import Route from './pages/Route.jsx';
import Join from './pages/Join.jsx';
import Privacy from './pages/Privacy.jsx';
import About from './pages/About.jsx';
import Terms from './pages/Terms.jsx';
import Disclaimer from './pages/Disclaimer.jsx';
import Splash from './pages/Splash.jsx';
import Container from './components/Container.jsx';
import Footer from './components/Footer.jsx';
import { useDocumentHead } from './hooks/useDocumentHead.js';
import { slugify } from './data/helpers.js';
import {
  NAV_EVENT,
  PATHS,
  ganpatiPath,
  navigate,
  parsePath,
  readLegacyGanpatiId,
  replacePath,
  usePathname,
} from './router.js';
import { jsonLdFor, seoFor } from './seo.js';
import {
  readSplashSeen,
  readSupportShown,
  writeSplashSeen,
  writeSupportShown,
} from './data/storage.js';

// Screen state driven by the URL: every screen has a real path (see router.js)
// so pandals are crawlable, linkable and shareable. The darshan route list,
// search/filter, drawer and support modal all live here so every screen stays
// in sync. Ganpati data is loaded once via GanpatisProvider (from the API in
// the browser, from the build-time snapshot when prerendering) and read through
// useGanpatis().
//
// `initialPath` is the path being prerendered, and `ssr` turns off the bits that
// only make sense in a browser (the splash intro, legacy query-param links).
export default function App({ initialPath, ssr = false }) {
  const pathname = usePathname(initialPath);
  const { page, slug } = parsePath(pathname);

  const { ganpatis, loading, error } = useGanpatis();
  const { route, replaceRoute } = useRoute();
  const [showSplash, setShowSplash] = useState(() => !ssr && page === 'home' && !readSplashSeen());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showMenu, setShowMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAsk, setShowAsk] = useState(false);

  const detailGanpati = useMemo(
    () => (slug ? ganpatis.find((g) => slugify(g.name) === slug) : null),
    [ganpatis, slug]
  );
  // An unknown path, or a pandal slug that is not in the data (a stale link).
  const notFound = page === 'notfound' || (page === 'detail' && !loading && !detailGanpati);

  // The screen the visitor landed on is already painted (the build prerenders
  // it) by the time React takes over, so replaying the entry animation there
  // would make the page blink. Screens they navigate to still animate in.
  const landingPath = useRef(pathname).current;
  const enter = pathname === landingPath ? '' : 'animate-fadeIn';

  // The last listing screen visited, so a pandal's Back link reads correctly
  // even when the visitor arrived straight from search.
  const lastListRef = useRef(page === 'detail' ? 'explore' : 'home');
  useEffect(() => {
    if (page === 'home' || page === 'explore' || page === 'route') lastListRef.current = page;
  }, [page]);

  // Links shared before pandals had their own paths look like /?g=<id>. Honour
  // them: swap in the pandal's real URL as soon as the data is available.
  const [legacyId, setLegacyId] = useState(() => (ssr ? null : readLegacyGanpatiId()));
  useEffect(() => {
    if (!legacyId || loading) return;
    const match = ganpatis.find((g) => g.id === legacyId);
    if (match) replacePath(ganpatiPath(match));
    setLegacyId(null);
  }, [legacyId, loading, ganpatis]);

  // A route shared by a friend travels as the ordered ids in `/route?stops=...`
  // (see RouteContext). Track them from the URL so a direct link and the /join
  // code box both land here; accepting or declining a shared route clears the
  // parameter, which keeps the /route URL clean for the visitor's own route.
  const [sharedIds, setSharedIds] = useState(() => (ssr ? null : readSharedRouteFromUrl()));
  useEffect(() => {
    const sync = () => setSharedIds(readSharedRouteFromUrl());
    sync();
    window.addEventListener(NAV_EVENT, sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener(NAV_EVENT, sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const clearSharedParam = () => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('stops')) {
      replacePath(PATHS.route);
    }
  };
  const sameRoute = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

  // Load a shared route straight in when the visitor has none yet (or already
  // planned the same order). When their route differs, the dialog below asks
  // before replacing it. Invalid ids in a shared code are simply ignored by the
  // route page, which only renders stops it knows.
  useEffect(() => {
    if (!sharedIds) return;
    if (route.length === 0 || sameRoute(sharedIds, route)) {
      if (route.length === 0) replaceRoute(sharedIds);
      clearSharedParam();
      setSharedIds(null);
    }
  }, [sharedIds, route, replaceRoute]);

  const hasPendingSharedRoute = !!sharedIds && route.length > 0 && !sameRoute(sharedIds, route);
  const sharedNames = sharedIds
    ? sharedIds.map((id) => ganpatis.find((g) => g.id === id)?.name).filter(Boolean)
    : [];

  const headPage = notFound ? 'notfound' : page;
  useDocumentHead(
    useMemo(() => seoFor({ page: headPage, ganpati: detailGanpati }), [headPage, detailGanpati]),
    useMemo(() => jsonLdFor({ page: headPage, ganpati: detailGanpati }), [headPage, detailGanpati])
  );

  const closeMenu = () => setShowMenu(false);

  // Show the Support popup once per visit, the first time Home is on screen:
  // straight after the splash closes, or on arrival when there is no splash.
  // It used to be once per browser ever, so a laptop that had seen it once
  // never showed it again, and it opened hidden behind the splash.
  useEffect(() => {
    if (page === 'home' && !showSplash && !readSupportShown()) {
      setShowModal(true);
      writeSupportShown();
    }
  }, [page, showSplash]);

  const showPage = !loading && !error && !notFound;

  return (
    <div className="relative flex min-h-screen flex-col bg-cream">
      {showSplash && (
        <Splash
          onEnter={() => {
            writeSplashSeen();
            setShowSplash(false);
          }}
        />
      )}

      <Navbar
        onToggleMenu={() => setShowMenu((v) => !v)}
        routeLen={route.length}
        askOpen={showAsk}
        onAsk={() => setShowAsk((v) => !v)}
        onSupport={() => setShowModal(true)}
      />

      {/* Grows to fill the viewport so the footer sits at the bottom on a
          short page (an empty route, a 404) rather than floating mid-screen
          with dead space under it. */}
      <div className="flex flex-1 flex-col">
        {loading && (
          <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-1 text-center">
            <div className="font-serif text-xl text-maroon">Loading pandals...</div>
            <div className="font-devanagari text-[13px] text-maroon/40">क्षणभर थांबा</div>
          </Container>
        )}

        {!loading && error && (
          <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
            <div className="font-serif text-xl text-maroon">Could not load pandals</div>
            <div className="font-sans text-sm text-maroon/50">
              Please check your connection and try again.
            </div>
          </Container>
        )}

        {!loading && !error && notFound && (
          <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
            <div className="font-serif text-xl text-maroon">Page not found</div>
            <div className="font-sans text-sm text-maroon/50">
              This page does not exist, or the pandal has moved.
            </div>
            <Link
              to={PATHS.explore}
              className="mt-3 rounded-pill bg-gold px-7 py-3 font-sans text-sm font-semibold text-maroon hover:bg-gold-dark"
            >
              Explore Pandals
            </Link>
          </Container>
        )}

        {showPage && page === 'home' && <Home enter={enter} onFilter={setFilter} />}

        {showPage && page === 'explore' && (
          <Explore
            enter={enter}
            query={query}
            onQuery={setQuery}
            activeFilter={filter}
            onFilter={setFilter}
          />
        )}

        {showPage && page === 'detail' && detailGanpati && (
          <Detail enter={enter} ganpati={detailGanpati} prevPage={lastListRef.current} />
        )}

        {showPage && page === 'route' && <Route enter={enter} />}

        {showPage && page === 'join' && <Join enter={enter} />}

        {showPage && page === 'privacy' && <Privacy enter={enter} />}

        {showPage && page === 'about' && <About enter={enter} />}

        {showPage && page === 'terms' && <Terms enter={enter} />}

        {showPage && page === 'disclaimer' && <Disclaimer enter={enter} />}
      </div>

      {showPage && (
        <Footer
          bottomPad={
            page === 'detail' ? 'pb-[calc(150px_+_env(safe-area-inset-bottom))]' : 'pb-nav-safe'
          }
        />
      )}

      <BottomNav
        page={page}
        routeLen={route.length}
        askOpen={showAsk}
        onAsk={() => setShowAsk((v) => !v)}
      />

      <Drawer
        open={showMenu}
        onClose={closeMenu}
        onAsk={() => {
          setShowAsk(true);
          setShowMenu(false);
        }}
        onSupport={() => {
          setShowModal(true);
          setShowMenu(false);
        }}
      />

      <SupportModal open={showModal} onClose={() => setShowModal(false)} />

      {hasPendingSharedRoute && (
        <SharedRouteDialog
          count={sharedIds.length}
          names={sharedNames}
          onAccept={() => {
            replaceRoute(sharedIds);
            clearSharedParam();
            setSharedIds(null);
          }}
          onDecline={() => {
            clearSharedParam();
            setSharedIds(null);
          }}
        />
      )}

      {showAsk && (
        <AskSheet
          onClose={() => setShowAsk(false)}
          ganpatis={ganpatis}
          onOpenGanpati={(id) => {
            const match = ganpatis.find((g) => g.id === id);
            if (match) navigate(ganpatiPath(match));
            setShowAsk(false);
          }}
          onExplore={() => {
            navigate(PATHS.explore);
            setShowAsk(false);
          }}
        />
      )}
    </div>
  );
}
