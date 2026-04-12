import { NavLink } from "react-router-dom";

type NavbarProps = {
  onLogout: () => void;
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

function Navbar({ onLogout }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="text-2xl font-bold tracking-tight text-slate-900">
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
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Log out
        </button>
      </div>

      <div className="border-t border-slate-100 px-4 pb-3 md:hidden">
        <nav className="mx-auto mt-3 flex max-w-7xl flex-wrap gap-2">
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
