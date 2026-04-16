import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatOrganizationTypeLabel,
  normalizeOrganizationType,
  ORGANIZATION_TYPE_FILTER_OPTIONS,
} from "../lib/identity";
import { supabase } from "../lib/supabase";

type Organization = {
  id: number;
  name: string;
  organization_type: string;
  sport: string | null;
  location: string | null;
  description: string | null;
  created_by: string;
  created_at: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
};

type MembershipRow = {
  organization_id: number;
  member_role: string | null;
};

type JoinRequestRow = {
  organization_id: number;
  status: string;
};

type MemberCountRow = {
  organization_id: number;
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

function OrganizationsListPage() {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [membershipsByOrg, setMembershipsByOrg] = useState<Record<number, string>>({});
  const [pendingRequestsByOrg, setPendingRequestsByOrg] = useState<Record<number, boolean>>({});
  const [memberCountsByOrg, setMemberCountsByOrg] = useState<Record<number, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    async function loadOrganizationsPage() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (orgError) {
        console.error("Error loading organizations:", orgError.message);
        setOrganizations([]);
        setLoading(false);
        return;
      }

      const typedOrganizations = (orgData as Organization[]) || [];
      setOrganizations(typedOrganizations);

      const { data: memberCountRows, error: memberCountError } = await supabase
        .from("organization_members")
        .select("organization_id");

      if (memberCountError) {
        console.error("Error loading member counts:", memberCountError.message);
        setMemberCountsByOrg({});
      } else {
        const countsMap: Record<number, number> = {};

        for (const row of (memberCountRows as MemberCountRow[]) || []) {
          countsMap[row.organization_id] = (countsMap[row.organization_id] || 0) + 1;
        }

        setMemberCountsByOrg(countsMap);
      }

      if (user) {
        const { data: membershipData, error: membershipError } = await supabase
          .from("organization_members")
          .select("organization_id, member_role")
          .eq("user_id", user.id);

        if (membershipError) {
          console.error("Error loading memberships:", membershipError.message);
          setMembershipsByOrg({});
        } else {
          const membershipMap: Record<number, string> = {};

          for (const row of (membershipData as MembershipRow[]) || []) {
            membershipMap[row.organization_id] = row.member_role || "member";
          }

          setMembershipsByOrg(membershipMap);
        }

        const { data: joinRequestData, error: joinRequestError } = await supabase
          .from("organization_join_requests")
          .select("organization_id, status")
          .eq("user_id", user.id);

        if (joinRequestError) {
          console.error("Error loading join requests:", joinRequestError.message);
          setPendingRequestsByOrg({});
        } else {
          const pendingMap: Record<number, boolean> = {};

          for (const row of (joinRequestData as JoinRequestRow[]) || []) {
            if (row.status === "pending") {
              pendingMap[row.organization_id] = true;
            }
          }

          setPendingRequestsByOrg(pendingMap);
        }
      } else {
        setMembershipsByOrg({});
        setPendingRequestsByOrg({});
      }

      setLoading(false);
    }

    loadOrganizationsPage();
  }, []);

  const filteredOrganizations = useMemo(() => {
    return organizations.filter((organization) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        organization.name.toLowerCase().includes(normalizedSearch) ||
        (organization.location || "").toLowerCase().includes(normalizedSearch) ||
        (organization.sport || "").toLowerCase().includes(normalizedSearch) ||
        formatOrganizationTypeLabel(organization.organization_type).toLowerCase().includes(normalizedSearch);

      const normalizedType = normalizeOrganizationType(organization.organization_type);
      const matchesType = typeFilter === "all" || normalizedType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [organizations, searchTerm, typeFilter]);


  return (
    <main className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 ring-1 ring-slate-200/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.5fr)_220px_auto] lg:min-w-[720px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search organizations"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
              >
                {ORGANIZATION_TYPE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <Link to="/profile" className="btn-primary min-h-[48px] whitespace-nowrap px-4">
                Create organization
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 ring-1 ring-slate-200/70">
          {loading ? (
            <p className="text-sm text-slate-500">Loading organizations...</p>
          ) : filteredOrganizations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No organizations found.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredOrganizations.map((organization) => {
                const myRole = membershipsByOrg[organization.id] || null;
                const hasPendingRequest = pendingRequestsByOrg[organization.id] || false;
                const memberCount = memberCountsByOrg[organization.id] || 0;

                return (
                  <Link key={organization.id} to={`/organizations/${organization.id}`} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50">
                    <div
                      className="h-40 bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500"
                      style={organization.cover_image_url ? { backgroundImage: `url(${organization.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    />
                    <div className="p-4 sm:p-5">
                      <div className="-mt-12 flex items-start gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-white shadow-sm">
                          {organization.logo_url ? (
                            <img src={organization.logo_url} alt={organization.name} className="h-full w-full rounded-[1.1rem] object-contain p-2" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-[1.1rem] bg-slate-900 text-lg font-semibold text-white">{getInitials(organization.name)}</div>
                          )}
                        </div>
                        <div className="min-w-0 pt-10">
                          <h2 className="break-words text-lg font-semibold text-slate-900">{organization.name}</h2>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{formatOrganizationTypeLabel(organization.organization_type)}</span>
                            {organization.sport ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">{organization.sport}</span> : null}
                            {myRole ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{myRole}</span> : null}
                            {!myRole && hasPendingRequest ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Pending</span> : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                            <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
                            {organization.location ? <span className="break-words">{organization.location}</span> : null}
                          </div>
                          {organization.description ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{organization.description}</p> : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default OrganizationsListPage;
