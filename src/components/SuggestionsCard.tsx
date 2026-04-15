import { Link } from "react-router-dom";
import { formatOrganizationTypeLabel } from "../lib/identity";

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
    <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Your organizations</h2>
          <p className="mt-1 text-sm text-slate-500">Quick access to the organizations you manage.</p>
        </div>
        <Link
          to="/organizations"
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {manageableOrganizations.length > 0 ? (
          manageableOrganizations.slice(0, 4).map((organization) => (
            <Link
              key={organization.id}
              to={`/organizations/${organization.id}`}
              className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-slate-100 active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-white">
                    {getInitials(organization.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-slate-900">{organization.name}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  {formatOrganizationTypeLabel(organization.organization_type)}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
            You do not manage any organizations yet.
          </div>
        )}
      </div>
    </section>
  );
}

export default SuggestionsCard;
