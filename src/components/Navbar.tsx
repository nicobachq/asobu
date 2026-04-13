import { NavLink } from "react-router-dom";

type NavbarProps = {
  onLogout: () => void;
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-slate-900 text-white shadow-sm"
      : "border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

function Navbar({ onLogout }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <NavLink to="/" className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Asobu
          </NavLink>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/" end className={navLinkClass}>
              Feed
            </NavLink>
            <NavLink to="/discover" className={navLinkClass}>
              Discover
            </NavLink>
            <NavLink to="/organizations" className={navLinkClass}>
              Organizations
            </NavLink>
            <NavLink to="/messages" className={navLinkClass}>
              Messages
            </NavLink>
            <NavLink to="/profile" className={navLinkClass}>
              Profile
            </NavLink>
          </nav>
        </div>

        <button
          onClick={onLogout}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:px-4"
        >
          Log out
        </button>
      </div>

      <div className="border-t border-slate-100 md:hidden">
        <nav className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-3 py-3 sm:px-4">
          <NavLink to="/" end className={navLinkClass}>
            Feed
          </NavLink>
          <NavLink to="/discover" className={navLinkClass}>
            Discover
          </NavLink>
          <NavLink to="/organizations" className={navLinkClass}>
            Organizations
          </NavLink>
          <NavLink to="/messages" className={navLinkClass}>
            Messages
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            Profile
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
