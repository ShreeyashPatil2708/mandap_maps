import { useState } from 'react';
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

// Single-file state machine mirroring the design reference: page routing,
// the darshan route list, search/filter, drawer and support modal all live
// here so every screen stays in sync. Ganpati data is loaded once from the
// API via GanpatisProvider and read through useGanpatis().
export default function App() {
  const { ganpatis, loading, error } = useGanpatis();
  const { route } = useRoute();
  const [page, setPage] = useState('home');
  const [prevPage, setPrevPage] = useState('home');
  const [selectedId, setSelectedId] = useState(null);
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
    setSelectedId(id);
    setPage('detail');
    setShowMenu(false);
  };
  const goBack = () => setPage(prevPage || 'explore');

  const detailGanpati = ganpatis.find((g) => g.id === selectedId) || ganpatis[0];

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
