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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 px-5 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Your network</p>
          <h2 className="mt-2 text-lg font-bold">Managed organizations</h2>
          <p className="mt-2 text-sm leading-7 text-white/75">
            Quick access to the teams, clubs, and communities you actively shape on Asobu.
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Quick access</p>
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
                  className="flex items-center gap-3 rounded-[24px] bg-slate-50 p-3 transition hover:bg-slate-100"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white">
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
                    <p className="truncate text-sm font-semibold text-slate-900">{organization.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {organization.organization_type || "organization"}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                You do not manage any organizations yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Next moves</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <Link
            to="/profile"
            className="block rounded-[24px] bg-slate-50 p-4 transition hover:bg-slate-100"
          >
            <p className="font-semibold text-slate-900">Strengthen your identity</p>
            <p className="mt-1 leading-7">Complete your profile, clarify your role, and improve your public visibility.</p>
          </Link>

          <Link
            to="/discover"
            className="block rounded-[24px] bg-slate-50 p-4 transition hover:bg-slate-100"
          >
            <p className="font-semibold text-slate-900">Expand your network</p>
            <p className="mt-1 leading-7">Search players, coaches, and organizations that fit your sporting world.</p>
          </Link>
        </div>
      </section>

      <section className="rounded-[32px] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">What works well on Asobu</h2>
        <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
          <div className="rounded-[24px] bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Identity posts with media</p>
            <p className="mt-1">Photos, match moments, and community images make profiles more credible.</p>
          </div>
          <div className="rounded-[24px] bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Clear role and sport context</p>
            <p className="mt-1">The strongest profiles make it obvious who they are, what they do, and where they play.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SuggestionsCard;
