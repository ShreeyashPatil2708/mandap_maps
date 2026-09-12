import { HomeNavIcon, ExploreNavIcon, RouteNavIcon, AskNavIcon } from './icons.jsx';
import Link from './Link.jsx';
import { PATHS } from '../router.js';

const ACTIVE = '#6B1E2E';
const INACTIVE = 'rgba(107,30,46,0.3)';
const ACTIVE_FILL = 'rgba(107,30,46,0.08)';

const ITEM_CLASS = 'relative flex flex-1 cursor-pointer flex-col items-center gap-1 py-1.5';

function NavItemBody({ color, label, icon, badge }) {
  return (
    <>
      {icon}
      <span className="font-sans text-[10px] font-semibold" style={{ color }}>
        {label}
      </span>
      {badge > 0 && (
        <div className="absolute right-[calc(50%-18px)] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold font-sans text-[9px] font-bold text-maroon">
          {badge}
        </div>
      )}
    </>
  );
}

// Tabs that go somewhere are real links, so they can be opened in a new tab and
// followed by search engines. Ask opens a sheet instead, so it stays a button.
function NavLink({ to, ...body }) {
  return (
    <Link to={to} className={ITEM_CLASS}>
      <NavItemBody {...body} />
    </Link>
  );
}

// Fixed bottom tab bar with Home / Explore / Route / Ask. The Route tab carries
// a badge with the number of stops currently on the darshan route. The Ask tab
// opens the chat bottom sheet instead of navigating.
export default function BottomNav({ page, routeLen, askOpen, onAsk }) {
  const homeActive = page === 'home';
  const exploreActive = page === 'explore' || page === 'detail';
  const routeActive = page === 'route';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[90] flex border-t border-maroon/10 bg-cream pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
      <NavLink
        to={PATHS.home}
        color={homeActive ? ACTIVE : INACTIVE}
        label="Home"
        icon={
          <HomeNavIcon
            color={homeActive ? ACTIVE : INACTIVE}
            fill={homeActive ? ACTIVE_FILL : 'none'}
          />
        }
      />
      <NavLink
        to={PATHS.explore}
        color={exploreActive ? ACTIVE : INACTIVE}
        label="Explore"
        icon={
          <ExploreNavIcon
            color={exploreActive ? ACTIVE : INACTIVE}
            fill={exploreActive ? ACTIVE_FILL : 'none'}
          />
        }
      />
      <NavLink
        to={PATHS.route}
        color={routeActive ? ACTIVE : INACTIVE}
        label="Route"
        badge={routeLen}
        icon={
          <RouteNavIcon
            color={routeActive ? ACTIVE : INACTIVE}
            fill={routeActive ? ACTIVE_FILL : 'none'}
          />
        }
      />
      <div className={ITEM_CLASS} onClick={onAsk}>
        <NavItemBody
          color={askOpen ? ACTIVE : INACTIVE}
          label="Ask"
          icon={
            <AskNavIcon color={askOpen ? ACTIVE : INACTIVE} fill={askOpen ? ACTIVE_FILL : 'none'} />
          }
        />
      </div>
    </nav>
  );
}
