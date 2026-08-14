import { useEffect, useRef, useState } from 'react';
import { useGanpatis } from './context/GanpatisContext.jsx';
import { useRoute } from './context/RouteContext.jsx';
import Navbar from './components/Navbar.jsx';
import Drawer from './components/Drawer.jsx';
import BottomNav from './components/BottomNav.jsx';
import SupportModal from './components/SupportModal.jsx';
import AskSheet from './components/AskSheet.jsx';
import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import Detail from './pages/Detail.jsx';
import Route from './pages/Route.jsx';

// Read a valid Ganpati id from the ?g= query param, or null. Powers shareable,
// deep-linkable pandal URLs without pulling in a full router.
function readGanpatiParam() {
  const raw = new URLSearchParams(window.location.search).get('g');
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Single-file state machine mirroring the design reference: page routing,
// the darshan route list, search/filter, drawer and support modal all live
// here so every screen stays in sync. Ganpati data is loaded once from the
// API via GanpatisProvider and read through useGanpatis().
export default function App() {
  const { ganpatis, loading, error } = useGanpatis();
  const { route } = useRoute();
  const initialGanpatiId = readGanpatiParam();
  const [page, setPage] = useState(initialGanpatiId ? 'detail' : 'home');
  const [prevPage, setPrevPage] = useState('home');
  const [selectedId, setSelectedId] = useState(initialGanpatiId);
  // Listing page to return to when the browser back button leaves a detail view.
  const prevPageRef = useRef(initialGanpatiId ? 'explore' : 'home');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showMenu, setShowMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAsk, setShowAsk] = useState(false);

  const goHome = () => {
    setPage('home');
    setShowMenu(false);
  };
  const goExplore = () => {
    setPage('explore');
    setShowMenu(false);
  };
  const goRoute = () => {
    setPage('route');
    setShowMenu(false);
  };
  const openGanpati = (id) => {
    setPrevPage(page);
    prevPageRef.current = page;
    setSelectedId(id);
    setPage('detail');
    setShowMenu(false);
  };
  const goBack = () => setPage(prevPage || 'explore');

  const detailGanpati = ganpatis.find((g) => g.id === selectedId) || ganpatis[0];

  // Keep the URL (?g=id) in sync with the detail view so pandals are shareable
  // and openable in a new tab. Guarded so it never fights the browser's own
  // history updates on back/forward.
  useEffect(() => {
    const currentG = new URLSearchParams(window.location.search).get('g');
    if (page === 'detail' && selectedId) {
      if (currentG !== String(selectedId)) {
        window.history.pushState({}, '', `?g=${selectedId}`);
      }
    } else if (currentG !== null) {
      window.history.pushState({}, '', window.location.pathname);
    }
  }, [page, selectedId]);

  // Browser back/forward: reopen the pandal named in the URL, or leave detail.
  useEffect(() => {
    const onPop = () => {
      const id = readGanpatiParam();
      if (id) {
        setSelectedId(id);
        setPage('detail');
      } else {
        setPage(prevPageRef.current || 'explore');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div className="relative min-h-screen max-w-full bg-cream">
      <Navbar onHome={goHome} onToggleMenu={() => setShowMenu((v) => !v)} />

      {loading && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-1 px-gutter text-center">
          <div className="font-serif text-xl text-maroon">Loading pandals...</div>
          <div className="font-devanagari text-[13px] text-maroon/40">क्षणभर थांबा</div>
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-gutter text-center">
          <div className="font-serif text-xl text-maroon">Could not load pandals</div>
          <div className="font-sans text-sm text-maroon/50">
            Please check your connection and try again.
          </div>
        </div>
      )}

      {!loading && !error && page === 'home' && (
        <Home
          onExplore={goExplore}
          onRoute={goRoute}
          onOpenGanpati={openGanpati}
          onSupport={() => setShowModal(true)}
        />
      )}

      {!loading && !error && page === 'explore' && (
        <Explore
          query={query}
          onQuery={setQuery}
          activeFilter={filter}
          onFilter={setFilter}
          onOpenGanpati={openGanpati}
        />
      )}

      {!loading && !error && page === 'detail' && detailGanpati && (
        <Detail ganpati={detailGanpati} prevPage={prevPage} onBack={goBack} />
      )}

      {!loading && !error && page === 'route' && <Route onExplore={goExplore} />}

      <BottomNav
        page={page}
        routeLen={route.length}
        askOpen={showAsk}
        onHome={goHome}
        onExplore={goExplore}
        onRoute={goRoute}
        onAsk={() => setShowAsk((v) => !v)}
      />

      <Drawer
        open={showMenu}
        onClose={() => setShowMenu(false)}
        onHome={goHome}
        onExplore={goExplore}
        onRoute={goRoute}
        onSupport={() => {
          setShowModal(true);
          setShowMenu(false);
        }}
      />

      <SupportModal open={showModal} onClose={() => setShowModal(false)} />

      {showAsk && (
        <AskSheet
          onClose={() => setShowAsk(false)}
          ganpatiId={page === 'detail' ? selectedId : null}
        />
      )}
    </div>
  );
}
