function ProfilePage() {
  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="h-48 bg-gradient-to-r from-blue-600 to-teal-500" />

        <div className="p-6">
          <div className="-mt-20 h-28 w-28 rounded-full border-4 border-white bg-slate-300" />

          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            Nicolas Bachmann
          </h1>
          <p className="mt-2 text-slate-600">Player / Founder</p>
          <p className="mt-1 text-slate-500">Lugano, Switzerland</p>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">About</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
              Sports-focused founder building Asobu, a platform designed to
              connect athletes, coaches, teams, clubs, and communities.
            </p>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Sports</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-700">
                Football
              </span>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-700">
                Padel
              </span>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-700">
                Tennis
              </span>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Organizations</h2>
            <p className="mt-2 text-sm text-slate-700">Asobu Community</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ProfilePage;