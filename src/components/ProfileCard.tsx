import { Link } from "react-router-dom";

type Profile = {
  name: string;
  role: string;
  location: string;
  sports: string[];
  organization: string;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
};

type ProfileCardProps = {
  profile: Profile;
};

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "A"
  );
}

function ProfileCard({ profile }: ProfileCardProps) {
  const visibleSports = profile.sports.filter(Boolean);

  return (
    <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200/70">
      <div
        className="h-20 bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500"
        style={
          profile.coverImageUrl
            ? {
                backgroundImage: `url(${profile.coverImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />

      <div className="p-4">
        <div className="-mt-10 flex items-end gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-900 text-lg font-bold text-white shadow-sm">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(profile.name)
            )}
          </div>
          <div className="min-w-0 pb-1">
            <h2 className="break-words text-base font-semibold leading-tight text-slate-900">
              {profile.name}
            </h2>
            <p className="mt-1 break-words text-sm text-slate-600">{profile.role}</p>
          </div>
        </div>

        <div className="mt-3 space-y-2 text-sm">
          {profile.location && profile.location !== "No location yet" ? (
            <p className="break-words text-slate-500">{profile.location}</p>
          ) : null}

          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Organization
            </p>
            <p className="mt-1 break-words font-medium text-slate-800">{profile.organization}</p>
          </div>

          {visibleSports.length > 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Sports
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleSports.map((sport) => (
                  <span
                    key={sport}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
                  >
                    {sport}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <Link
          to="/profile"
          className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 active:scale-[0.99]"
        >
          View profile
        </Link>
      </div>
    </section>
  );
}

export default ProfileCard;
