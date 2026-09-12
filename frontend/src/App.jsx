import { useEffect, useMemo, useRef, useState } from 'react';
import { useGanpatis } from './context/GanpatisContext.jsx';
import { useRoute } from './context/RouteContext.jsx';
import Navbar from './components/Navbar.jsx';
import Drawer from './components/Drawer.jsx';
import BottomNav from './components/BottomNav.jsx';
import SupportModal from './components/SupportModal.jsx';
import AskSheet from './components/AskSheet.jsx';
import Link from './components/Link.jsx';
import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import Detail from './pages/Detail.jsx';
import Route from './pages/Route.jsx';
import Privacy from './pages/Privacy.jsx';
import Splash from './pages/Splash.jsx';
import Container from './components/Container.jsx';
import Footer from './components/Footer.jsx';
import Team from './pages/Team.jsx';
import { useDocumentHead } from './hooks/useDocumentHead.js';
import { slugify } from './data/helpers.js';
import {
  PATHS,
  ganpatiPath,
  navigate,
  parsePath,
  readLegacyGanpatiId,
  replacePath,
  usePathname,
} from './router.js';
import { jsonLdFor, seoFor } from './seo.js';
import { readSplashSeen, writeSplashSeen } from './data/storage.js';

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
  const { route } = useRoute();
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

  const headPage = notFound ? 'notfound' : page;
  useDocumentHead(
    useMemo(() => seoFor({ page: headPage, ganpati: detailGanpati }), [headPage, detailGanpati]),
    useMemo(() => jsonLdFor({ page: headPage, ganpati: detailGanpati }), [headPage, detailGanpati])
  );

  const closeMenu = () => setShowMenu(false);

  // Show the Support popup once per browser, when Home first becomes active.
  useEffect(() => {
    if (page === 'home' && !localStorage.getItem('supportShown')) {
      setShowModal(true);
      localStorage.setItem('supportShown', 'true');
    }
  }, [page]);

  const showPage = !loading && !error && !notFound;

  return (
    <div className="relative min-h-screen bg-cream">
      {showSplash && (
        <Splash
          onEnter={() => {
            writeSplashSeen();
            setShowSplash(false);
          }}
          onTeam={() => {
            writeSplashSeen();
            setShowSplash(false);
            navigate(PATHS.team);
          }}
        />
      )}

      <Navbar onToggleMenu={() => setShowMenu((v) => !v)} />

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

      {showPage && page === 'privacy' && <Privacy enter={enter} />}

      {showPage && page === 'team' && <Team enter={enter} />}

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
        onSupport={() => {
          setShowModal(true);
          setShowMenu(false);
        }}
      />

      <SupportModal open={showModal} onClose={() => setShowModal(false)} />

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
