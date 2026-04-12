import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
};

type MemberRow = {
  id: number;
  organization_id: number;
  user_id: string;
  member_role: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
};

type MemberWithProfile = MemberRow & {
  profile: ProfileRow | null;
};

type JoinRequestRow = {
  id: number;
  organization_id: number;
  user_id: string;
  status: string;
  created_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type JoinRequestWithProfile = JoinRequestRow & {
  profile: ProfileRow | null;
};

function OrganizationPage() {
  const { id } = useParams();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [myMembership, setMyMembership] = useState<MemberRow | null>(null);
  const [myJoinRequest, setMyJoinRequest] = useState<JoinRequestRow | null>(null);
  const [pendingRequests, setPendingRequests] = useState<JoinRequestWithProfile[]>([]);

  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("community");
  const [editSport, setEditSport] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [cancellingJoin, setCancellingJoin] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);

  const orgId = useMemo(() => Number(id), [id]);
  const myRole = myMembership?.member_role || null;
  const isAdmin = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";
  const hasPendingJoinRequest = myJoinRequest?.status === "pending";
  const canRequestToJoin = !myMembership && !hasPendingJoinRequest;

  useEffect(() => {
    async function loadPage() {
      if (!id || Number.isNaN(orgId)) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id || null);
      await loadAllData(orgId, user?.id || null);
      setLoading(false);
    }

    loadPage();
  }, [id, orgId]);

  async function loadAllData(organizationId: number, userId: string | null) {
    setPageMessage("");

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError) {
      console.error("Error loading organization:", orgError.message);
      setOrganization(null);
      return;
    }

    const typedOrganization = orgData as Organization;
    setOrganization(typedOrganization);
    setEditName(typedOrganization.name || "");
    setEditType(typedOrganization.organization_type || "community");
    setEditSport(typedOrganization.sport || "");
    setEditLocation(typedOrganization.location || "");
    setEditDescription(typedOrganization.description || "");

    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("id, organization_id, user_id, member_role, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (memberError) {
      console.error("Error loading organization members:", memberError.message);
      setMembers([]);
      setMyMembership(null);
    } else {
      const typedMembers = (memberData as MemberRow[]) || [];
      const memberProfiles = await loadProfilesByUserIds(
        typedMembers.map((member) => member.user_id)
      );

      setMembers(
        typedMembers.map((member) => ({
          ...member,
          profile: memberProfiles[member.user_id] || null,
        }))
      );

      if (userId) {
        const foundMembership =
          typedMembers.find((member) => member.user_id === userId) || null;
        setMyMembership(foundMembership);
      } else {
        setMyMembership(null);
      }
    }

    if (userId) {
      const { data: joinRequestData, error: joinRequestError } = await supabase
        .from("organization_join_requests")
        .select("id, organization_id, user_id, status, created_at, reviewed_at, reviewed_by")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (joinRequestError) {
        console.error("Error loading my join request:", joinRequestError.message);
        setMyJoinRequest(null);
      } else {
        setMyJoinRequest((joinRequestData as JoinRequestRow | null) || null);
      }
    } else {
      setMyJoinRequest(null);
    }

    const { data: freshMembershipData } = await supabase
      .from("organization_members")
      .select("id, organization_id, user_id, member_role, created_at")
      .eq("organization_id", organizationId)
      .eq("user_id", userId || "")
      .maybeSingle();

    const freshMembership = (freshMembershipData as MemberRow | null) || null;
    const freshRole = freshMembership?.member_role || null;

    if (freshRole === "owner" || freshRole === "admin") {
      const { data: requestData, error: requestError } = await supabase
        .from("organization_join_requests")
        .select("id, organization_id, user_id, status, created_at, reviewed_at, reviewed_by")
        .eq("organization_id", organizationId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (requestError) {
        console.error("Error loading pending join requests:", requestError.message);
        setPendingRequests([]);
      } else {
        const typedRequests = (requestData as JoinRequestRow[]) || [];
        const requestProfiles = await loadProfilesByUserIds(
          typedRequests.map((request) => request.user_id)
        );

        setPendingRequests(
          typedRequests.map((request) => ({
            ...request,
            profile: requestProfiles[request.user_id] || null,
          }))
        );
      }
    } else {
      setPendingRequests([]);
    }
  }

  async function loadProfilesByUserIds(userIds: string[]) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

    if (uniqueUserIds.length === 0) {
      return {} as Record<string, ProfileRow>;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, location, main_sport")
      .in("id", uniqueUserIds);

    if (error) {
      console.error("Error loading profiles:", error.message);
      return {} as Record<string, ProfileRow>;
    }

    const map: Record<string, ProfileRow> = {};

    for (const profile of (data as ProfileRow[]) || []) {
      map[profile.id] = profile;
    }

    return map;
  }

  async function refreshPage() {
    if (!orgId || Number.isNaN(orgId)) return;
    await loadAllData(orgId, currentUserId);
  }

  async function handleRequestToJoin() {
    if (!currentUserId || !organization) return;

    setRequestingJoin(true);
    setPageMessage("");

    const { error } = await supabase.from("organization_join_requests").upsert(
      {
        organization_id: organization.id,
        user_id: currentUserId,
        status: "pending",
        reviewed_at: null,
        reviewed_by: null,
      },
      {
        onConflict: "organization_id,user_id",
      }
    );

    if (error) {
      setPageMessage(`Error: ${error.message}`);
      setRequestingJoin(false);
      return;
    }

    setPageMessage("Join request sent.");
    await refreshPage();
    setRequestingJoin(false);
  }

  async function handleCancelJoinRequest() {
    if (!myJoinRequest) return;

    setCancellingJoin(true);
    setPageMessage("");

    const { error } = await supabase
      .from("organization_join_requests")
      .delete()
      .eq("id", myJoinRequest.id);

    if (error) {
      setPageMessage(`Error: ${error.message}`);
      setCancellingJoin(false);
      return;
    }

    setPageMessage("Join request cancelled.");
    await refreshPage();
    setCancellingJoin(false);
  }

  async function handleApproveRequest(request: JoinRequestRow) {
    if (!organization) return;

    setProcessingRequestId(request.id);
    setPageMessage("");

    const { error: memberError } = await supabase.from("organization_members").insert({
      organization_id: organization.id,
      user_id: request.user_id,
      member_role: "member",
    });

    if (memberError) {
      setPageMessage(`Error: ${memberError.message}`);
      setProcessingRequestId(null);
      return;
    }

    const { error: requestError } = await supabase
      .from("organization_join_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUserId,
      })
      .eq("id", request.id);

    if (requestError) {
      setPageMessage(`Error: ${requestError.message}`);
      setProcessingRequestId(null);
      return;
    }

    setPageMessage("Join request approved.");
    await refreshPage();
    setProcessingRequestId(null);
  }

  async function handleRejectRequest(request: JoinRequestRow) {
    setProcessingRequestId(request.id);
    setPageMessage("");

    const { error } = await supabase
      .from("organization_join_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUserId,
      })
      .eq("id", request.id);

    if (error) {
      setPageMessage(`Error: ${error.message}`);
      setProcessingRequestId(null);
      return;
    }

    setPageMessage("Join request rejected.");
    await refreshPage();
    setProcessingRequestId(null);
  }

  async function handleSaveOrganization(e: React.FormEvent) {
    e.preventDefault();

    if (!organization) return;

    setSavingEdit(true);
    setPageMessage("");

    const { error } = await supabase
      .from("organizations")
      .update({
        name: editName.trim(),
        organization_type: editType,
        sport: editSport.trim() || null,
        location: editLocation.trim() || null,
        description: editDescription.trim() || null,
      })
      .eq("id", organization.id);

    if (error) {
      setPageMessage(`Error: ${error.message}`);
      setSavingEdit(false);
      return;
    }

    setPageMessage("Organization updated.");
    await refreshPage();
    setSavingEdit(false);
  }

  async function handleMakeAdmin(memberId: number) {
    setUpdatingMemberId(memberId);
    setPageMessage("");

    const { error } = await supabase
      .from("organization_members")
      .update({ member_role: "admin" })
      .eq("id", memberId);

    if (error) {
      setPageMessage(`Error: ${error.message}`);
      setUpdatingMemberId(null);
      return;
    }

    setPageMessage("Member promoted to admin.");
    await refreshPage();
    setUpdatingMemberId(null);
  }

  async function handleMakeMember(memberId: number) {
    setUpdatingMemberId(memberId);
    setPageMessage("");

    const { error } = await supabase
      .from("organization_members")
      .update({ member_role: "member" })
      .eq("id", memberId);

    if (error) {
      setPageMessage(`Error: ${error.message}`);
      setUpdatingMemberId(null);
      return;
    }

    setPageMessage("Admin changed back to member.");
    await refreshPage();
    setUpdatingMemberId(null);
  }

  async function handleRemoveMember(memberId: number) {
    setUpdatingMemberId(memberId);
    setPageMessage("");

    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      setPageMessage(`Error: ${error.message}`);
      setUpdatingMemberId(null);
      return;
    }

    setPageMessage("Member removed.");
    await refreshPage();
    setUpdatingMemberId(null);
  }

  if (loading) {
    return (
      <main className="px-6 py-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow-sm">
          Loading organization...
        </div>
      </main>
    );
  }

  if (!organization) {
    return (
      <main className="px-6 py-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow-sm">
          Organization not found.
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="h-52 bg-gradient-to-r from-slate-900 via-blue-700 to-emerald-500" />

          <div className="p-6">
            <div className="-mt-16 h-28 w-28 rounded-3xl border-4 border-white bg-white shadow-md" />

            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {organization.name}
                </h1>
                <p className="mt-2 text-base font-medium text-slate-600">
                  {organization.organization_type}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {organization.location || "No location yet"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {organization.sport && (
                  <span className="rounded-full bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-700">
                    {organization.sport}
                  </span>
                )}
                {myRole && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700">
                    {myRole}
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                  {members.length} members
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-900">About</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {organization.description || "No description yet."}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {canRequestToJoin && (
                <button
                  onClick={handleRequestToJoin}
                  disabled={requestingJoin}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {requestingJoin ? "Sending request..." : "Request to join"}
                </button>
              )}

              {!myMembership && hasPendingJoinRequest && (
                <>
                  <span className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                    Request pending
                  </span>
                  <button
                    onClick={handleCancelJoinRequest}
                    disabled={cancellingJoin}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {cancellingJoin ? "Cancelling..." : "Cancel request"}
                  </button>
                </>
              )}

              {myMembership && (
                <span className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  You are a {myRole}
                </span>
              )}
            </div>

            {pageMessage && (
              <p className="mt-4 text-sm text-slate-600">{pageMessage}</p>
            )}
          </div>
        </section>

        {isAdmin && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Edit organization</h2>

            <form
              onSubmit={handleSaveOrganization}
              className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  placeholder="Organization name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Type
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                >
                  <option value="team">Team</option>
                  <option value="club">Club</option>
                  <option value="community">Community</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Sport
                </label>
                <input
                  type="text"
                  value={editSport}
                  onChange={(e) => setEditSport(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  placeholder="Football"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  placeholder="Lugano"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  placeholder="Short description"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={savingEdit || !editName.trim()}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingEdit ? "Saving..." : "Save organization"}
                </button>
              </div>
            </form>
          </section>
        )}

        {isAdmin && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">
                Pending join requests
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {pendingRequests.length}
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No pending requests.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {request.profile?.full_name || "Member"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {request.profile?.role || "No role yet"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {request.profile?.location || "No location yet"}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          Requested on{" "}
                          {request.created_at
                            ? new Date(request.created_at).toLocaleString()
                            : "Unknown time"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleApproveRequest(request)}
                          disabled={processingRequestId === request.id}
                          className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          {processingRequestId === request.id
                            ? "Processing..."
                            : "Approve"}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request)}
                          disabled={processingRequestId === request.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Members</h2>

          {members.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No members found yet.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {members.map((member) => {
                const canRemove =
                  isAdmin &&
                  member.member_role !== "owner" &&
                  member.user_id !== currentUserId;

                const canPromoteToAdmin =
                  isOwner && member.member_role === "member";

                const canDemoteToMember =
                  isOwner && member.member_role === "admin";

                return (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {member.profile?.full_name || "Member"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {member.profile?.role || "No role yet"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {member.profile?.location || "No location yet"}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {member.member_role || "member"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {member.profile?.main_sport && (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                          {member.profile.main_sport}
                        </span>
                      )}
                    </div>

                    {(canRemove || canPromoteToAdmin || canDemoteToMember) && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        {canPromoteToAdmin && (
                          <button
                            onClick={() => handleMakeAdmin(member.id)}
                            disabled={updatingMemberId === member.id}
                            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            {updatingMemberId === member.id
                              ? "Updating..."
                              : "Make admin"}
                          </button>
                        )}

                        {canDemoteToMember && (
                          <button
                            onClick={() => handleMakeMember(member.id)}
                            disabled={updatingMemberId === member.id}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {updatingMemberId === member.id
                              ? "Updating..."
                              : "Make member"}
                          </button>
                        )}

                        {canRemove && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={updatingMemberId === member.id}
                            className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            {updatingMemberId === member.id
                              ? "Removing..."
                              : "Remove member"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default OrganizationPage;