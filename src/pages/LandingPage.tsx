import { Link } from "react-router-dom";
import hero from "../assets/hero.png";

function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-slate-950">
            Asobu
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/auth" className="btn-secondary px-4 py-2.5">
              Log in
            </Link>
            <Link to="/auth?mode=signup" className="btn-primary px-4 py-2.5">
              Create account
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Build your sports identity. Be easier to discover.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Structured sports profiles for players, coaches, scouts, teams, and clubs.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth?mode=signup" className="btn-primary min-h-[52px] px-6">
                Create account
              </Link>
              <Link to="/auth" className="btn-secondary min-h-[52px] px-6">
                Log in
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-100 shadow-sm lg:justify-self-end">
            <img src={hero} alt="Asobu preview" className="h-full w-full scale-[0.92] object-cover lg:translate-x-8" />
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
