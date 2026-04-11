import { Link } from "react-router-dom";

function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="text-2xl font-bold tracking-tight text-slate-900">
          Asobu
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
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