import { NavLink } from "react-router-dom";

type NavbarProps = {
  onLogout: () => void;
};

const navItems = [
  { to: "/", label: "Feed" },
  { to: "/organizations", label: "Organizations" },
  { to: "/profile", label: "Profile" },
  { to: "/messages", label: "Messages" },
];

function Navbar({ onLogout }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:py-3">
        <div className="flex items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">
              A
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">Asobu</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Sports network
              </p>
            </div>
          </NavLink>

          <button
            onClick={onLogout}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
          >
            Log out
          </button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  [
                    "rounded-2xl px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={onLogout}
            className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 lg:inline-flex"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
