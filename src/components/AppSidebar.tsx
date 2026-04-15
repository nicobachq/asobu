import { NavLink } from 'react-router-dom';

type AppSidebarProps = {
  onLogout: () => void;
};

type IconName = 'home' | 'discover' | 'organizations' | 'calendar' | 'messages' | 'profile' | 'logout';

const navItems: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/discover', label: 'Discover', icon: 'discover' },
  { to: '/organizations', label: 'Organizations', icon: 'organizations' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/messages', label: 'Messages', icon: 'messages' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
] as const;

function Icon({ name }: { name: IconName }) {
  switch (name) {
    case 'home':
      return <span aria-hidden>⌂</span>;
    case 'discover':
      return <span aria-hidden>⌕</span>;
    case 'organizations':
      return <span aria-hidden>◫</span>;
    case 'calendar':
      return <span aria-hidden>☷</span>;
    case 'messages':
      return <span aria-hidden>✉</span>;
    case 'profile':
      return <span aria-hidden>◉</span>;
    case 'logout':
      return <span aria-hidden>↗</span>;
    default:
      return null;
  }
}

function AppSidebar({ onLogout }: AppSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[15.5rem] flex-col border-r border-slate-200/80 bg-slate-50/95 backdrop-blur md:flex">
      <div className="px-5 py-6">
        <div className="text-2xl font-semibold tracking-tight text-slate-950">Asobu</div>
      </div>

      <nav className="flex-1 space-y-1 px-3 pb-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-xl text-base transition',
                    isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800',
                  ].join(' ')}
                >
                  <Icon name={item.icon} />
                </span>
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200/80 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-between rounded-2xl bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-slate-100 hover:text-slate-900 active:scale-[0.99]"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Icon name="logout" />
            </span>
            Log out
          </span>
        </button>
      </div>
    </aside>
  );
}

export default AppSidebar;
