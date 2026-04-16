import { NavLink } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';

type AppShellProps = {
  onLogout: () => void;
  children: React.ReactNode;
};

const mobileNavItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/discover', label: 'Discover' },
  { to: '/organizations', label: 'Orgs' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/messages', label: 'Messages' },
  { to: '/profile', label: 'Profile' },
];

function MobileDock() {
  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-3 md:hidden">
      <nav className="app-glass mx-auto flex max-w-xl items-center justify-between rounded-[26px] px-2 py-2 shadow-[0_18px_34px_rgba(15,23,42,.12)]">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition',
                isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'h-1.5 w-7 rounded-full transition',
                    isActive
                      ? 'bg-[linear-gradient(135deg,var(--asobu-primary-dark),var(--asobu-primary-light))]'
                      : 'bg-slate-200',
                  ].join(' ')}
                />
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
    <div className="asobu-app relative min-h-screen overflow-hidden bg-[var(--asobu-background)] text-[var(--asobu-foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(10,166,175,.08),transparent_28%),radial-gradient(circle_at_85%_8%,rgba(244,128,32,.06),transparent_20%),linear-gradient(180deg,rgba(255,255,255,.88),rgba(248,250,252,.6)_38%,rgba(241,245,249,.52)_100%)]" />
      <AppSidebar onLogout={onLogout} />
      <div className="relative min-h-screen md:pl-[16.5rem]">
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
