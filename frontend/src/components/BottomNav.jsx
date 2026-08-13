import { HomeNavIcon, ExploreNavIcon, RouteNavIcon, AskNavIcon } from './icons.jsx';

const ACTIVE = '#6B1E2E';
const INACTIVE = 'rgba(107,30,46,0.3)';
const ACTIVE_FILL = 'rgba(107,30,46,0.08)';

function NavItem({ color, label, icon, onClick, badge }) {
  return (
    <div
      className="relative flex flex-1 cursor-pointer flex-col items-center gap-1 py-1.5"
      onClick={onClick}
    >
      {icon}
      <span className="font-sans text-[10px] font-semibold" style={{ color }}>
        {label}
      </span>
      {badge > 0 && (
        <div className="absolute right-[calc(50%-18px)] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold font-sans text-[9px] font-bold text-maroon">
          {badge}
        </div>
      )}
    </div>
  );
}

// Fixed bottom tab bar with Home / Explore / Route / Ask. The Route tab carries
// a badge with the number of stops currently on the darshan route. The Ask tab
// opens the chat bottom sheet instead of navigating.
export default function BottomNav({ page, routeLen, askOpen, onHome, onExplore, onRoute, onAsk }) {
  const homeActive = page === 'home';
  const exploreActive = page === 'explore' || page === 'detail';
  const routeActive = page === 'route';

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] flex border-t border-maroon/10 bg-cream pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
      <NavItem
        color={homeActive ? ACTIVE : INACTIVE}
        label="Home"
        onClick={onHome}
        icon={
          <HomeNavIcon color={homeActive ? ACTIVE : INACTIVE} fill={homeActive ? ACTIVE_FILL : 'none'} />
        }
      />
      <NavItem
        color={exploreActive ? ACTIVE : INACTIVE}
        label="Explore"
        onClick={onExplore}
        icon={
          <ExploreNavIcon
            color={exploreActive ? ACTIVE : INACTIVE}
            fill={exploreActive ? ACTIVE_FILL : 'none'}
          />
        }
      />
      <NavItem
        color={routeActive ? ACTIVE : INACTIVE}
        label="Route"
        onClick={onRoute}
        badge={routeLen}
        icon={
          <RouteNavIcon color={routeActive ? ACTIVE : INACTIVE} fill={routeActive ? ACTIVE_FILL : 'none'} />
        }
      />
      <NavItem
        color={askOpen ? ACTIVE : INACTIVE}
        label="Ask"
        onClick={onAsk}
        icon={
          <AskNavIcon color={askOpen ? ACTIVE : INACTIVE} fill={askOpen ? ACTIVE_FILL : 'none'} />
        }
      />
    </div>
  );
}
