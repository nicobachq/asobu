import { Link } from "react-router-dom";

type Profile = {
  name: string;
  role: string;
  location: string;
  sports: string[];
  organization: string;
  openTo: string[];
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
  const visibleOpenTo = profile.openTo.filter(Boolean);

  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-sm sm:rounded-[32px]">
      <div className="h-24 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 sm:h-28" />

      <div className="p-4 sm:p-5">
        <div className="-mt-12 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-xl font-bold text-white shadow-sm sm:-mt-16 sm:h-28 sm:w-28 sm:text-2xl">
          {getInitials(profile.name)}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
            {profile.name}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">{profile.role}</p>
          <p className="mt-1 text-sm text-slate-500">{profile.location}</p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] bg-slate-50 px-4 py-4 sm:rounded-[24px]">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Organization
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
              {profile.organization}
            </p>
          </div>

          <div className="rounded-[22px] bg-slate-50 px-4 py-4 sm:rounded-[24px]">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Open to
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
              {visibleOpenTo.length > 0 ? visibleOpenTo.join(", ") : "Not specified"}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-slate-800">Sports</p>
          {visibleSports.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {visibleSports.map((sport) => (
                <span
                  key={sport}
                  className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700"
                >
                  {sport}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No sports added yet.</p>
          )}
        </div>

        <Link
          to="/profile"
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
        >
          Edit Profile
        </Link>
      </div>
    </div>
  );
}

export default ProfileCard;
