import { useLocation } from 'react-router-dom';

type AppTopbarProps = {
  onLogout: () => void;
};

const routeTitles: Record<string, string> = {
  '/': 'Home',
  '/discover': 'Discover',
  '/organizations': 'Organizations',
  '/calendar': 'Calendar',
  '/messages': 'Messages',
  '/profile': 'Profile',
};

function resolveTitle(pathname: string) {
  if (pathname.startsWith('/messages')) return 'Messages';
  if (pathname.startsWith('/organizations/')) return 'Organization';
  if (pathname.startsWith('/profiles/')) return 'Public profile';
  return routeTitles[pathname] || 'Asobu';
}

function AppTopbar({ onLogout }: AppTopbarProps) {
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">{title}</h1>

        <button
          type="button"
          onClick={onLogout}
          className="btn-secondary md:hidden"
        >
          Log out
        </button>
      </div>
    </header>
  );
}

export default AppTopbar;
