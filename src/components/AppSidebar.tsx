import { NavLink } from 'react-router-dom';

type AppSidebarProps = {
  onLogout: () => void;
};

type IconName = 'feed' | 'discover' | 'organizations' | 'calendar' | 'messages' | 'profile' | 'logout';

type NavItem = {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Feed', icon: 'feed', end: true },
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
    case 'feed':
      return (
        <svg {...common}>
          <path d="M4.5 5.5h15" />
          <path d="M4.5 12h15" />
          <path d="M4.5 18.5h10.5" />
          <circle cx="17.75" cy="18.5" r="1.25" fill="currentColor" stroke="none" />
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
        </svg>
      );
    case 'messages':
      return (
        <svg {...common}>
          <path d="M5 18.5V7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H9l-4 2.5Z" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.25" />
          <path d="M5.5 19c1.6-3.1 4.1-4.65 6.5-4.65 2.4 0 4.9 1.55 6.5 4.65" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...common}>
          <path d="M9 6.5H7.5A2.5 2.5 0 0 0 5 9v6a2.5 2.5 0 0 0 2.5 2.5H9" />
          <path d="M13 8.5 17 12l-4 3.5" />
          <path d="M10 12h7" />
        </svg>
      );
  }
}

function BrandMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_30%_25%,rgba(54,214,203,.38),transparent_45%),linear-gradient(160deg,rgba(8,17,31,.98),rgba(18,31,51,.98))] shadow-[0_10px_30px_rgba(5,12,24,.45)]">
      <div className="absolute inset-[1px] rounded-[15px] bg-[linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.01))]" />
      <span className="relative text-sm font-semibold tracking-[0.22em] text-white">A</span>
    </div>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200',
    isActive
      ? 'bg-[linear-gradient(135deg,rgba(26,44,67,.98),rgba(13,24,40,.98))] text-white shadow-[0_12px_30px_rgba(4,12,22,.3)] ring-1 ring-white/8'
      : 'text-slate-300/78 hover:bg-white/6 hover:text-white',
  ].join(' ');

function AppSidebar({ onLogout }: AppSidebarProps) {
  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-white/8 bg-[linear-gradient(180deg,rgba(7,14,24,.98),rgba(8,15,28,.96))] px-4 pb-4 pt-5 md:flex">
      <div className="flex items-center gap-3 px-2">
        <BrandMark />
        <div>
          <p className="font-semibold tracking-[0.16em] text-white/92">ASOBU</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/55">Identity network</p>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/8 bg-white/[0.03] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-200',
                      isActive
                        ? 'border-cyan-300/18 bg-cyan-400/12 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,.07)]'
                        : 'border-white/6 bg-white/[0.03] text-slate-300/72 group-hover:border-white/12 group-hover:text-white',
                    ].join(' ')}
                  >
                    <Icon name={item.icon} />
                  </span>
                  <span className="truncate">{item.label}</span>
                  {isActive ? <span className="ml-auto h-2 w-2 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 shadow-[0_0_12px_rgba(34,211,238,.45)]" /> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,33,.9),rgba(10,18,29,.9))] p-4 text-sm text-slate-300 shadow-[0_14px_32px_rgba(2,8,18,.25)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">System status</p>
        <p className="mt-3 font-medium text-white">Build your sports identity</p>
        <p className="mt-2 leading-6 text-slate-300/76">
          Profiles, organizations, messaging and events now live inside one premium shell.
        </p>
      </div>

      <div className="mt-auto space-y-3 px-2 pt-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(45,212,191,.32),rgba(245,158,11,.28))] text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,.04)]">
            AB
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">Asobu member</p>
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-slate-400">Live workspace</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/7 bg-white/[0.03]">
              <Icon name="logout" />
            </span>
            Log out
          </span>
          <span className="text-slate-500">↗</span>
        </button>
      </div>
    </aside>
  );
}

export default AppSidebar;
