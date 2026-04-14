import { Link, useLocation } from 'react-router-dom';

type AppTopbarProps = {
  onLogout: () => void;
};

const routeMeta: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Home',
    description: 'Stay close to your sporting world with identity posts, upcoming activity, and the right next moves.',
  },
  '/discover': {
    title: 'Discover',
    description: 'Search people and organizations through a clearer sports identity and discovery layer.',
  },
  '/organizations': {
    title: 'Organizations',
    description: 'Explore teams, clubs, federations, entities, and communities across the Asobu ecosystem.',
  },
  '/calendar': {
    title: 'Calendar',
    description: 'See what is happening, what is coming next, and where your sporting activity lives.',
  },
  '/messages': {
    title: 'Messages',
    description: 'Turn visibility into real conversation with players, coaches, scouts, and organizations.',
  },
  '/profile': {
    title: 'Profile',
    description: 'Shape your public sports identity, history, skills, media, and discoverability.',
  },
};

function resolveMeta(pathname: string) {
  if (pathname.startsWith('/messages')) return routeMeta['/messages'];
  if (pathname.startsWith('/organizations/')) {
    return {
      title: 'Organization',
      description: 'Follow the identity, members, activity, and events of this organization in one place.',
    };
  }
  if (pathname.startsWith('/profiles/')) {
    return {
      title: 'Public profile',
      description: 'Review the public sports identity, media, history, and context behind the person.',
    };
  }

  return routeMeta[pathname] || routeMeta['/'];
}

function AppTopbar({ onLogout }: AppTopbarProps) {
  const location = useLocation();
  const meta = resolveMeta(location.pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/78 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Asobu workspace</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.9rem]">{meta.title}</h1>
            <span className="rounded-full border border-[color:color-mix(in_oklab,var(--asobu-warm)_18%,white_82%)] bg-[color:color-mix(in_oklab,var(--asobu-warm)_12%,white_88%)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--asobu-warm)]">
              Premium beta
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{meta.description}</p>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="flex h-11 min-w-[260px] items-center rounded-2xl border border-slate-200/80 bg-slate-50 px-4 text-sm text-slate-500 shadow-sm">
            Search athletes, clubs, events...
          </div>
          <Link
            to="/discover"
            className="app-button-secondary rounded-full px-4 py-2.5 text-sm font-medium"
          >
            Discover
          </Link>
          <Link
            to="/calendar"
            className="app-button-primary rounded-full px-4 py-2.5 text-sm font-semibold"
          >
            Open calendar
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={onLogout}
            className="app-button-secondary rounded-full px-3 py-2 text-xs font-medium"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppTopbar;
