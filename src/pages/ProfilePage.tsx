function ProfilePage() {
  const sports = ["Football", "Padel", "Tennis"];
  const organizations = [
    {
      name: "Asobu Community",
      type: "Community",
      location: "Lugano, Switzerland",
    },
    {
      name: "FC Lugano Network",
      type: "Football Network",
      location: "Ticino",
    },
  ];

  const highlights = [
    "Reached semifinal in regional tournament",
    "Built early Asobu concept for athletes and communities",
    "Open to teams, clubs, and sports communities",
  ];

  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="h-56 bg-gradient-to-r from-blue-700 via-sky-500 to-emerald-500" />

          <div className="px-6 pb-6">
            <div className="-mt-16 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col md:flex-row md:items-end md:gap-5">
                <div className="h-32 w-32 rounded-full border-4 border-white bg-slate-300 shadow-md" />

                <div className="mt-4 md:mt-0">
                  <h1 className="text-3xl font-bold text-slate-900">
                    Nicolas Bachmann
                  </h1>
                  <p className="mt-1 text-base font-medium text-slate-600">
                    Player / Founder
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Lugano, Switzerland
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {sports.map((sport) => (
                      <span
                        key={sport}
                        className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700"
                      >
                        {sport}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Message
                </button>
                <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">241</p>
                <p className="mt-1 text-xs text-slate-500">Profile views</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">18</p>
                <p className="mt-1 text-xs text-slate-500">Scout visits</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">7</p>
                <p className="mt-1 text-xs text-slate-500">Active chats</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">12</p>
                <p className="mt-1 text-xs text-slate-500">Connections</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">About</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Sports-focused founder building Asobu, a platform designed to
                connect athletes, coaches, teams, clubs, and communities.
                Interested in team sports like football, futsal, basketball, and
                volleyball, while also supporting community-driven sports like
                padel, tennis, and running.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Recent highlights
              </h2>

              <div className="mt-4 space-y-3">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Media highlights
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="h-40 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200" />
                <div className="h-40 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Sports</h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {sports.map((sport) => (
                  <span
                    key={sport}
                    className="rounded-full bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-700"
                  >
                    {sport}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Organizations
              </h2>

              <div className="mt-4 space-y-3">
                {organizations.map((org) => (
                  <div
                    key={org.name}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">
                      {org.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{org.type}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {org.location}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Open to</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p>Teams</p>
                <p>Clubs</p>
                <p>Communities</p>
                <p>Coaches</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;