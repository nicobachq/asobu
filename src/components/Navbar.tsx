import { Link } from "react-router-dom";

function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link to="/" className="text-2xl font-bold tracking-tight text-slate-900">
          Asobu
        </Link>

        <div className="hidden flex-1 md:block">
          <input
            type="text"
            placeholder="Search players, coaches, teams, communities..."
            className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
          />
        </div>

        <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-slate-900">
            Feed
          </Link>
          <Link to="/profile" className="hover:text-slate-900">
            Profile
          </Link>
          <Link to="/messages" className="hover:text-slate-900">
            Messages
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;