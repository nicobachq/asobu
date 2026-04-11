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

function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="h-24 bg-gradient-to-r from-blue-600 to-teal-500" />

      <div className="p-5">
        <div className="-mt-14 h-20 w-20 rounded-full border-4 border-white bg-slate-300" />

        <h2 className="mt-3 text-xl font-bold">{profile.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{profile.role}</p>
        <p className="mt-1 text-sm text-slate-500">{profile.location}</p>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-slate-800">Sports</p>
          <div className="flex flex-wrap gap-2">
            {profile.sports.map((sport) => (
              <span
                key={sport}
                className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700"
              >
                {sport}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Organization:</span> {profile.organization}
          </p>
        </div>

        <div className="mt-3 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Open to:</span>{" "}
            {profile.openTo.join(", ")}
          </p>
        </div>

        <button className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">
          Edit Profile
        </button>
      </div>
    </div>
  );
}

export default ProfileCard;