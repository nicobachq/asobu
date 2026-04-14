import { NavLink } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';

type AppShellProps = {
  onLogout: () => void;
  children: React.ReactNode;
};

const mobileNavItems = [
  { to: '/', label: 'Feed', end: true },
  { to: '/discover', label: 'Discover' },
  { to: '/organizations', label: 'Orgs' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/messages', label: 'Messages' },
  { to: '/profile', label: 'Profile' },
];

function MobileDock() {
  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-3 md:hidden">
      <nav className="mx-auto flex max-w-xl items-center justify-between rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,15,26,.96),rgba(6,12,22,.94))] px-2 py-2 shadow-[0_18px_38px_rgba(0,0,0,.35)] backdrop-blur-xl">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition',
                isActive ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-slate-200',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span className={['h-1.5 w-7 rounded-full transition', isActive ? 'bg-gradient-to-r from-cyan-300 to-emerald-300' : 'bg-white/10'].join(' ')} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function AppShell({ onLogout, children }: AppShellProps) {
  return (
    <div className="asobu-app relative min-h-screen overflow-hidden bg-[#07111d] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.09),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(245,158,11,.08),transparent_22%),linear-gradient(180deg,#08111f_0%,#091422_40%,#08111d_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(34,211,238,.05),transparent)]" />
      <AppSidebar onLogout={onLogout} />
      <div className="relative min-h-screen md:pl-[17rem]">
        <AppTopbar onLogout={onLogout} />
        <main className="px-3 pb-28 pt-5 sm:px-4 sm:pt-6 lg:px-6 lg:pt-8">
          <div className="mx-auto max-w-[1580px]">{children}</div>
        </main>
      </div>
      <MobileDock />
    </div>
  );
}

export default AppShell;
