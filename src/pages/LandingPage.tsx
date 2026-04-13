import { Link } from "react-router-dom";
import {
  formatOrganizationTypeLabel,
  ORGANIZATION_REGISTRATION_OPTIONS,
  PERSON_ROLE_OPTIONS,
} from "../lib/identity";
import { SPORT_REGISTRATION_OPTIONS } from "../lib/sports";

const currentCapabilities = [
  {
    title: "Build a structured sports identity",
    description:
      "Create a profile with your roles, main sport, sporting history, organizations, and skill identity.",
  },
  {
    title: "Become easier to discover",
    description:
      "Players, coaches, scouts, and organizations can search across sports and view public profiles.",
  },
  {
    title: "Share media and stay connected",
    description:
      "Post photos and updates, message people directly, and grow your presence inside the network.",
  },
];

const roadmapItems = [
  "Sport-specific skill systems and stronger validation",
  "Richer scouting and discovery workflows",
  "External media links and easier sharing outward",
  "A deeper media and performance layer over time",
];

function LandingPage() {
  const audienceLabel = PERSON_ROLE_OPTIONS.map((option) => option.label).join(", ");
  const organizationTypes = ORGANIZATION_REGISTRATION_OPTIONS.map((option) => option.value);
  const featuredSports = SPORT_REGISTRATION_OPTIONS.slice(0, 11);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_34%),radial-gradient(circle_at_80%_20%,_rgba(45,212,191,0.16),_transparent_26%),linear-gradient(180deg,_rgba(2,6,23,1)_0%,_rgba(15,23,42,1)_55%,_rgba(248,250,252,1)_55%,_rgba(248,250,252,1)_100%)]" />

        <section className="relative border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <Link to="/" className="text-2xl font-semibold tracking-tight text-white">
              Asobu
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/auth"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/25 hover:bg-white/8 hover:text-white"
              >
                Log in
              </Link>
              <Link
                to="/auth?mode=signup"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Create account
              </Link>
            </div>
          </div>
        </section>

        <section className="relative">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-sky-400/25 bg-sky-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
                Sports identity and discovery network
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.05]">
                Build your sports identity. Become easier to discover.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Asobu helps players, coaches, scouts, teams, clubs, federations,
                entities, and communities build structured profiles, show sporting
                history, share media, and connect across one serious sports network.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/auth?mode=signup"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Create account
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/8"
                >
                  Log in
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { value: "Multi-role", label: audienceLabel },
                  {
                    value: "Organizations",
                    label: "Teams, clubs, federations, entities, and communities",
                  },
                  {
                    value: "Structured",
                    label: "Sports, positions, history, media, and messaging",
                  },
                ].map((item) => (
                  <div key={item.value} className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:pl-4">
              <div className="rounded-[32px] border border-white/10 bg-white/8 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-md sm:p-6">
                <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    What you can do now
                  </p>
                  <div className="mt-5 space-y-4">
                    {currentCapabilities.map((item) => (
                      <div key={item.title} className="rounded-3xl border border-white/8 bg-white/5 p-4">
                        <h2 className="text-base font-semibold text-white">{item.title}</h2>
                        <p className="mt-2 text-sm leading-7 text-slate-300">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Built for
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {audienceLabel}, plus organizations across different structures
                      and levels.
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      What comes next
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      Better validation, stronger discovery, and a richer media layer
                      over time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
              What Asobu is
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              A serious sports identity layer, before the deeper media stack comes later.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Asobu is not trying to be every sports product on day one. Right now it is
              focused on identity, discoverability, organizations, messaging, structured
              sporting history, and a foundation for trusted skill visibility.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {currentCapabilities.map((item) => (
              <article key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white text-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-start">
            <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                Organization model
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                Organization is the umbrella term.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                On Asobu, organizations can represent formal structures or user-created
                communities. The platform keeps one clear umbrella model while still
                distinguishing what each organization really is.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {organizationTypes.map((type) => (
                <div key={type} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
                  <p className="text-base font-semibold text-slate-950">
                    {formatOrganizationTypeLabel(type)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {
                      ORGANIZATION_REGISTRATION_OPTIONS.find((option) => option.value === type)
                        ?.description
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                Supported sports
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                Built for the approved Asobu sports structure.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Profiles, sporting history, and positions are being standardized across
                the current approved sport list so identity stays structured and easier to
                trust.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {featuredSports.map((sport) => (
                <div key={sport.value} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/40">
                  {sport.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white text-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="rounded-[36px] border border-slate-200 bg-slate-950 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">
                  What comes next
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  A stronger discovery and media layer, built on top of a cleaner identity foundation.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                  Asobu will keep growing from the current identity and discovery core.
                  The next steps are about making profiles more meaningful, discovery more
                  useful, and media more connected without pretending the full video stack
                  already exists today.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <ul className="space-y-3 text-sm leading-7 text-slate-200">
                  {roadmapItems.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/auth?mode=signup"
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  >
                    Join Asobu
                  </Link>
                  <Link
                    to="/auth"
                    className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/8"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
