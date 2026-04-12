import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
        organization.name.toLowerCase().includes(normalizedSearch) ||
        (organization.location || "").toLowerCase().includes(normalizedSearch) ||
        (organization.sport || "").toLowerCase().includes(normalizedSearch);

      const matchesType =
        typeFilter === "all" || organization.organization_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [organizations, searchTerm, typeFilter]);

  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                Discover
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Organizations
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Find teams, clubs, and communities on Asobu. Open a page to learn
                more, send a join request, or manage the organization if you are an
                admin.
              </p>
            </div>

            <Link
              to="/profile"
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Create organization from profile
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search by name, sport, or location
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search organizations..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Filter by type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
              >
                <option value="all">All</option>
                <option value="team">Team</option>
                <option value="club">Club</option>
                <option value="community">Community</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Results</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {filteredOrganizations.length}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-500">Loading organizations...</p>
          ) : filteredOrganizations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <h2 className="text-lg font-semibold text-slate-900">
                No organizations found
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Try a different search or change the filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredOrganizations.map((organization) => {
                const myRole = membershipsByOrg[organization.id] || null;
                const hasPendingRequest = pendingRequestsByOrg[organization.id] || false;
                const memberCount = memberCountsByOrg[organization.id] || 0;

                return (
                  <Link
                    key={organization.id}
                    to={`/organizations/${organization.id}`}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div
                      className="h-28 bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500"
                      style={
                        organization.cover_image_url
                          ? {
                              backgroundImage: `url(${organization.cover_image_url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    />

                    <div className="p-5">
                      <div className="-mt-11 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-white shadow-sm">
                            {organization.logo_url ? (
                              <img
                                src={organization.logo_url}
                                alt={organization.name}
                                className="h-full w-full rounded-[1.1rem] object-contain p-2"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center rounded-[1.1rem] bg-slate-900 text-lg font-semibold text-white">
                                {getInitials(organization.name)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 pt-10">
                            <h2 className="truncate text-xl font-semibold text-slate-900">
                              {organization.name}
                            </h2>
                            <p className="mt-1 text-sm font-medium text-slate-600">
                              {organization.organization_type}
                            </p>
                          </div>
                        </div>

                        {myRole ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            {myRole}
                          </span>
                        ) : hasPendingRequest ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            pending
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            not joined
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {organization.sport && (
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                            {organization.sport}
                          </span>
                        )}

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {memberCount} members
                        </span>
                      </div>

                      <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">
                        {organization.description || "No description yet."}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
                        <span>{organization.location || "No location"}</span>
                        <span className="font-medium text-slate-700">Open page</span>
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