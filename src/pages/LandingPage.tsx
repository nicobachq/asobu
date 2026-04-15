import { Link } from "react-router-dom";
import hero from "../assets/hero.png";
import { PERSON_ROLE_OPTIONS } from "../lib/identity";

const currentCapabilities = [
  {
    title: "Build your identity",
    description: "Create a sports profile with roles, history, media, and skills.",
  },
  {
    title: "Be discoverable",
    description: "Search and share profiles, organizations, and activity across sports.",
  },
  {
    title: "Stay connected",
    description: "Post updates, manage organizations, and keep events in one place.",
  },
];

function LandingPage() {
  const audienceLabel = PERSON_ROLE_OPTIONS.map((option) => option.label).join(", ");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-slate-950">
            Asobu
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
            >
              Log in
            </Link>
            <Link
              to="/auth?mode=signup"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99]"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">
              Sports identity and discovery
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Build your sports identity. Be easier to discover.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
              Asobu helps {audienceLabel.toLowerCase()}, plus teams and clubs, build structured sports profiles,
              share activity, and stay connected in one network.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth?mode=signup"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99]"
              >
                Create account
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
              >
                Log in
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-100 shadow-sm">
            <img src={hero} alt="Asobu preview" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-5 lg:grid-cols-3">
            {currentCapabilities.map((item) => (
              <article key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="rounded-[32px] bg-slate-900 px-6 py-8 text-white sm:px-8 lg:px-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Create your profile and start building your network.
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/auth?mode=signup"
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99]"
                >
                  Join Asobu
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10 active:scale-[0.99]"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
