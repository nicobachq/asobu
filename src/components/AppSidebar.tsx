import { NavLink } from 'react-router-dom';

type AppSidebarProps = {
  onLogout: () => void;
};

type IconName = 'home' | 'discover' | 'organizations' | 'calendar' | 'messages' | 'profile' | 'logout';

type NavItem = {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/discover', label: 'Discover', icon: 'discover' },
  { to: '/organizations', label: 'Organizations', icon: 'organizations' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/messages', label: 'Messages', icon: 'messages' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
];

function Icon({ name, className = 'h-[18px] w-[18px]' }: { name: IconName; className?: string }) {
  const common = {
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.85,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="m4 10.5 8-6 8 6" />
          <path d="M6.5 9.75v9h11v-9" />
          <path d="M10 18.75v-5.25h4v5.25" />
        </svg>
      );
    case 'discover':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="5.75" />
          <path d="m16 16 3.5 3.5" />
        </svg>
      );
    case 'organizations':
      return (
        <svg {...common}>
          <path d="M3.5 19.5h17" />
          <path d="M6 19.5V9.25h4v10.25" />
          <path d="M14 19.5V9.25h4v10.25" />
          <path d="m3.5 9.25 8.5-5 8.5 5" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
          <path d="M8 3.75v3.5" />
          <path d="M16 3.75v3.5" />
          <path d="M4 9.5h16" />
          <path d="M8.25 13h3.5" />
          <path d="M8.25 16.5h7.5" />
        </svg>
      );
    case 'messages':
      return (
        <svg {...common}>
          <path d="M5 6.75A2.75 2.75 0 0 1 7.75 4h8.5A2.75 2.75 0 0 1 19 6.75v6.5A2.75 2.75 0 0 1 16.25 16H11l-4.75 4v-4H7.75A2.75 2.75 0 0 1 5 13.25z" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 19.25c1.4-3.25 4-4.75 6.5-4.75s5.1 1.5 6.5 4.75" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...common}>
          <path d="M9.5 6.25H7A2.75 2.75 0 0 0 4.25 9v6A2.75 2.75 0 0 0 7 17.75h2.5" />
          <path d="M14.5 8.25 19 12l-4.5 3.75" />
          <path d="M19 12H9.5" />
        </svg>
      );
  }
}

function AppSidebar({ onLogout }: AppSidebarProps) {
  return (
    <aside className="app-glass fixed inset-y-0 left-0 z-40 hidden w-[16.5rem] flex-col border-r border-slate-200/80 md:flex">
      <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--asobu-primary-dark),var(--asobu-primary-light))] text-base font-bold text-white shadow-[0_10px_24px_rgba(10,166,175,.18)]">
          A
        </div>
        <div>
          <p className="font-semibold tracking-tight text-slate-900">Asobu</p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Sports identity</p>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_16px_34px_rgba(15,23,42,.06)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Workspace</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Identity, organizations, and activity in one place.
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition',
                isActive
                  ? 'bg-white text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,.08)] ring-1 ring-[color:color-mix(in_oklab,var(--asobu-primary)_14%,white_86%)]'
                  : 'text-slate-500 hover:bg-white/70 hover:text-slate-900',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'flex h-10 w-10 items-center justify-center rounded-2xl transition',
                    isActive
                      ? 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--asobu-primary)_16%,white_84%),color-mix(in_oklab,var(--asobu-warm)_10%,white_90%))] text-[color:var(--asobu-primary-dark)]'
                      : 'bg-slate-100 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700',
                  ].join(' ')}
                >
                  <Icon name={item.icon} />
                </span>
                <span className="truncate">{item.label}</span>
                {isActive ? <span className="ml-auto h-2 w-2 rounded-full bg-[var(--asobu-primary)]" /> : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200/80 px-4 py-4">
        <div className="mb-3 flex items-center gap-3 rounded-[24px] bg-white/92 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,.05)] ring-1 ring-white/70">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_oklab,var(--asobu-primary)_18%,white_82%),color-mix(in_oklab,var(--asobu-warm)_12%,white_88%))] text-sm font-semibold text-[var(--asobu-primary-dark)]">
            AB
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">Asobu member</p>
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-slate-400">Premium beta</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/92 px-3.5 py-3 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:text-slate-900 hover:shadow-[0_12px_24px_rgba(15,23,42,.06)]"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Icon name="logout" />
            </span>
            Log out
          </span>
          <span className="text-slate-300">↗</span>
        </button>
      </div>
    </aside>
  );
}

export default AppSidebar;
