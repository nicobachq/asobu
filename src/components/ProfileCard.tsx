import { Link } from "react-router-dom";

type Profile = {
  name: string;
  role: string;
  location: string;
  sports: string[];
  organization: string;
  openTo: string[];
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
  const visibleOpenTo = profile.openTo.filter(Boolean);

  return (
    <div className="app-card overflow-hidden rounded-[28px] sm:rounded-[32px]">
      <div
        className="app-gradient-panel h-24 bg-cover bg-center sm:h-28"
        style={
          profile.coverImageUrl
            ? {
                backgroundImage: `linear-gradient(135deg, rgba(13, 148, 136, 0.16), rgba(249, 115, 22, 0.12)), url(${profile.coverImageUrl})`,
              }
            : undefined
        }
      />

      <div className="p-4 sm:p-5">
        <div className="-mt-12 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[linear-gradient(135deg,color-mix(in_oklab,var(--asobu-primary)_18%,white_82%),color-mix(in_oklab,var(--asobu-warm)_14%,white_86%))] text-xl font-bold text-[var(--asobu-primary-dark)] shadow-[0_14px_28px_rgba(15,23,42,.08)] sm:-mt-16 sm:h-28 sm:w-28 sm:text-2xl">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
          ) : (
            getInitials(profile.name)
          )}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
            {profile.name}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">{profile.role}</p>
          <p className="mt-1 text-sm text-slate-500">{profile.location}</p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="app-card-subtle rounded-[22px] px-4 py-4 sm:rounded-[24px]">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Organization
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
              {profile.organization}
            </p>
          </div>

          <div className="app-card-subtle rounded-[22px] px-4 py-4 sm:rounded-[24px]">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
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
                  className="app-chip-brand rounded-full px-3 py-1 text-xs font-medium"
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
          className="app-button-primary mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium"
        >
          Edit profile
        </Link>
      </div>
    </div>
  );
}

export default ProfileCard;
