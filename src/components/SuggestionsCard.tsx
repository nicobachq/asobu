import { Link } from "react-router-dom";

type ManageableOrganization = {
  id: number;
  name: string;
  organization_type: string | null;
  logo_url: string | null;
};

type SuggestionsCardProps = {
  manageableOrganizations: ManageableOrganization[];
};

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "O"
  );
}

function SuggestionsCard({ manageableOrganizations }: SuggestionsCardProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-[32px] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your organizations</h2>
            <p className="mt-1 text-sm text-slate-500">
              Quick access to the teams and communities you manage.
            </p>
          </div>
          <Link
            to="/organizations"
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            View all
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {manageableOrganizations.length > 0 ? (
            manageableOrganizations.slice(0, 3).map((organization) => (
              <Link
                key={organization.id}
                to={`/organizations/${organization.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      className="h-full w-full rounded-2xl object-contain p-1.5"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-white">
                      {getInitials(organization.name)}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {organization.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {organization.organization_type || "organization"}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              You do not manage any organizations yet.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[32px] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-4 space-y-3">
          <Link
            to="/profile"
            className="block rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="text-sm font-semibold text-slate-900">Complete your profile</p>
            <p className="mt-1 text-sm text-slate-500">
              Add location, role, sport, and create an organization from your profile page.
            </p>
          </Link>

          <Link
            to="/organizations"
            className="block rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="text-sm font-semibold text-slate-900">Discover organizations</p>
            <p className="mt-1 text-sm text-slate-500">
              Browse clubs, teams, and communities and send a join request.
            </p>
          </Link>
        </div>
      </div>

      <div className="rounded-[32px] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">What to publish</h2>

        <div className="mt-4 space-y-4 text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Match result or tournament update</p>
            <p className="mt-1">Share results, milestones, call-ups, or league progress.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Training clip or community moment</p>
            <p className="mt-1">Post a highlight, a team update, or something that shows momentum.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Recruitment or announcement</p>
            <p className="mt-1">Use organization posts for trials, events, and important notices.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuggestionsCard;
