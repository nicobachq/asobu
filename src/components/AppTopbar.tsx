import { Link, NavLink, useLocation } from 'react-router-dom';

type AppTopbarProps = {
  onLogout: () => void;
};

const routeMeta: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Feed',
    description: 'Share updates, media and results that strengthen your sporting identity.',
  },
  '/discover': {
    title: 'Discover',
    description: 'Search players, coaches and organizations across the Asobu network.',
  },
  '/organizations': {
    title: 'Organizations',
    description: 'Explore teams, clubs, federations, entities and communities.',
  },
  '/calendar': {
    title: 'Calendar',
    description: 'Track events, upcoming matches and activity across your sporting world.',
  },
  '/messages': {
    title: 'Messages',
    description: 'Turn visibility into real conversation with players, coaches and organizations.',
  },
  '/profile': {
    title: 'Profile',
    description: 'Shape your public identity, history, skills and discoverability.',
  },
};

function resolveMeta(pathname: string) {
  if (pathname.startsWith('/messages')) return routeMeta['/messages'];
  if (pathname.startsWith('/organizations/')) {
    return {
      title: 'Organization',
      description: 'Follow identity, members, activity and linked events for this organization.',
    };
  }
  if (pathname.startsWith('/profiles/')) {
    return {
      title: 'Public profile',
      description: 'Review the public sports identity, history, media and skill context.',
    };
  }

  return routeMeta[pathname] || routeMeta['/'];
}

function AppTopbar({ onLogout }: AppTopbarProps) {
  const location = useLocation();
  const meta = resolveMeta(location.pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-white/6 bg-[linear-gradient(180deg,rgba(8,14,24,.92),rgba(8,14,24,.78))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/55">Asobu workspace</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.9rem]">{meta.title}</h1>
            <span className="rounded-full border border-amber-300/12 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/80">
              Premium beta
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300/78">{meta.description}</p>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <NavLink
            to="/discover"
            className="rounded-full border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08] hover:text-white"
          >
            Discover
          </NavLink>
          <Link
            to="/calendar"
            className="rounded-full bg-[linear-gradient(135deg,rgba(45,212,191,.18),rgba(245,158,11,.18))] px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/8 transition hover:brightness-110"
          >
            Open calendar
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppTopbar;
