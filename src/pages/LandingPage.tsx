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

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">How it works</p>
          <h2 className="mt-4 text-center text-2xl font-semibold text-slate-950 sm:text-3xl">Three steps to your sports identity</h2>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">1</div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Create your profile</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Pick your sport, role, and location. Join or create your club, team, or academy.</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">2</div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Rate your skills</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Self-assess your sport-specific attributes. Let anonymous community signals refine the picture over time.</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">3</div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Get discovered</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Scouts, coaches, and clubs browse structured profiles to find athletes who fit what they need.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">Built for real sports</p>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950 sm:text-3xl">Your identity, structured</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Unlike generic social profiles, Asobu captures the data that actually matters in sport: skill attributes with community validation, structured playing history, and verified organizational ties.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <span className="text-lg">&#9881;</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">Skill radar</h3>
              <p className="mt-2 text-sm text-slate-500">Sport-specific attributes rated by you and validated anonymously by peers.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <span className="text-lg">&#9733;</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">Playing history</h3>
              <p className="mt-2 text-sm text-slate-500">Structured timeline of clubs, teams, and phases. Linked to real organizations on the platform.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <span className="text-lg">&#128269;</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">Discovery</h3>
              <p className="mt-2 text-sm text-slate-500">Coaches and scouts filter by sport, skill level, location, and role to find the right fit.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-slate-950 sm:text-3xl">Ready to build your sports identity?</h2>
          <p className="mt-4 text-base text-slate-600">Join players, coaches, and organizations already on Asobu.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth?mode=signup" className="btn-primary min-h-[52px] px-8">
              Create account
            </Link>
            <Link to="/auth" className="btn-secondary min-h-[52px] px-8">
              Log in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
