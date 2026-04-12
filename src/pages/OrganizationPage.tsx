import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ProfileCard from "../components/ProfileCard";

type DbProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
};

type ProfileCardData = {
  name: string;
  role: string;
  location: string;
  sports: string[];
  organization: string;
  openTo: string[];
};

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

type MembershipLookupRow = {
  organization_id: number;
};

type OrganizationNameRow = {
  name: string;
};

type RelatedProfile = {
  full_name: string | null;
  role: string | null;
  location?: string | null;
  main_sport?: string | null;
};

type RelatedCommentProfile = {
  full_name: string | null;
};

type RelatedOrganization = {
  id: number;
  name: string;
  organization_type: string | null;
};

type RawPost = {
  id: number;
  user_id: string;
  organization_id: number | null;
  content: string;
  created_at: string | null;
  profiles: RelatedProfile | RelatedProfile[] | null;
  organizations: RelatedOrganization | RelatedOrganization[] | null;
};

type Post = {
  id: number;
  user_id: string;
  organization_id: number | null;
  content: string;
  created_at: string | null;
  profiles: RelatedProfile | null;
  organizations: RelatedOrganization | null;
};

type PostLike = {
  id: number;
  post_id: number;
  user_id: string;
};

type RawPostComment = {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string | null;
  profiles: RelatedCommentProfile | RelatedCommentProfile[] | null;
};

type PostComment = {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string | null;
  profiles: RelatedCommentProfile | null;
};

type RawOrganizationMember = {
  id: number;
  user_id: string;
  member_role: string | null;
  created_at: string | null;
  profiles: RelatedProfile | RelatedProfile[] | null;
};

type OrganizationMember = {
  id: number;
  user_id: string;
  member_role: string;
  created_at: string | null;
  profiles: RelatedProfile | null;
};

type JoinRequestRow = {
  id: number;
  organization_id: number;
  user_id: string;
  status: string;
  created_at: string | null;
};

type JoinRequest = {
  id: number;
  organization_id: number;
  user_id: string;
  status: string;
  created_at: string | null;
  profiles: RelatedProfile | null;
};

type ProfileLookupRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function OrganizationPage() {
  const { id } = useParams();
  const organizationId = Number(id);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileCardData>({
    name: "Loading...",
    role: "Loading...",
    location: "Loading...",
    sports: [],
    organization: "No organization yet",
    openTo: ["Teams", "Clubs", "Communities"],
  });

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [myMembershipRole, setMyMembershipRole] = useState<string | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  const [editMode, setEditMode] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("community");
  const [orgSport, setOrgSport] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [savingOrganization, setSavingOrganization] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newPost, setNewPost] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});

  const [creatingPost, setCreatingPost] = useState(false);
  const [joiningOrganization, setJoiningOrganization] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);
  const [processingMemberId, setProcessingMemberId] = useState<number | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [likingPostId, setLikingPostId] = useState<number | null>(null);
  const [commentingPostId, setCommentingPostId] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  const canManageOrganization =
    myMembershipRole === "owner" || myMembershipRole === "admin";
  const canEditOrganization = canManageOrganization;
  const canManageMembers = myMembershipRole === "owner";

  useEffect(() => {
    let isMounted = true;

    async function getCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;
      setAuthUserId(user?.id ?? null);
    }

    getCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadPage() {
      if (!organizationId || Number.isNaN(organizationId)) {
        setPageError("Invalid organization id.");
        setLoading(false);
        return;
      }

      if (!authUserId) {
        setPageError("You must be logged in to view this page.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setPageError("");
      setPageMessage("");

      await Promise.all([
        loadCurrentUserProfile(authUserId),
        loadOrganizationData(organizationId, authUserId),
        loadOrganizationPosts(organizationId),
        loadLikes(),
        loadComments(),
      ]);

      setLoading(false);
    }

    loadPage();
  }, [organizationId, authUserId]);

  async function loadCurrentUserProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading profile card data:", error.message);
      return;
    }

    const dbProfile = data as DbProfile;

    let firstOrganization = "No organization yet";

    const { data: membershipData, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error("Error loading first membership:", membershipError.message);
    } else if (membershipData) {
      const membership = membershipData as MembershipLookupRow;

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", membership.organization_id)
        .single();

      if (orgError) {
        console.error("Error loading first organization:", orgError.message);
      } else if (orgData) {
        const org = orgData as OrganizationNameRow;
        firstOrganization = org.name;
      }
    }

    setProfile({
      name: dbProfile.full_name || "No name yet",
      role: dbProfile.role || "No role yet",
      location: dbProfile.location || "No location yet",
      sports: dbProfile.main_sport ? [dbProfile.main_sport] : [],
      organization: firstOrganization,
      openTo: ["Teams", "Clubs", "Communities"],
    });
  }

  async function loadOrganizationData(orgId: number, userId: string) {
    const { data: organizationData, error: organizationError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();

    if (organizationError) {
      console.error("Error loading organization:", organizationError.message);
      setOrganization(null);
      setPageError(`Error loading organization: ${organizationError.message}`);
      setMembers([]);
      setJoinRequests([]);
      setMyMembershipRole(null);
      setHasPendingRequest(false);
      return;
    }

    if (!organizationData) {
      setOrganization(null);
      setPageError("Organization not found.");
      setMembers([]);
      setJoinRequests([]);
      setMyMembershipRole(null);
      setHasPendingRequest(false);
      return;
    }

    const typedOrganization = organizationData as Organization;
    setOrganization(typedOrganization);
    setOrgName(typedOrganization.name || "");
    setOrgType(typedOrganization.organization_type || "community");
    setOrgSport(typedOrganization.sport || "");
    setOrgLocation(typedOrganization.location || "");
    setOrgDescription(typedOrganization.description || "");

    const { data: membershipData, error: membershipError } = await supabase
      .from("organization_members")
      .select("member_role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      console.error("Error loading my membership:", membershipError.message);
      setMyMembershipRole(null);
    } else {
      setMyMembershipRole(
        membershipData ? (membershipData.member_role as string | null) || "member" : null
      );
    }

    const { data: pendingRequestRows, error: pendingRequestError } = await supabase
      .from("organization_join_requests")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (pendingRequestError) {
      console.error(
        "Error loading my pending join request:",
        pendingRequestError.message
      );
      setHasPendingRequest(false);
    } else {
      setHasPendingRequest(((pendingRequestRows as { id: number }[]) || []).length > 0);
    }

    const { data: memberRows, error: memberError } = await supabase
      .from("organization_members")
      .select("id, user_id, member_role, created_at, profiles(full_name, role, location, main_sport)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });

    if (memberError) {
      console.error("Error loading members:", memberError.message);
      setMembers([]);
    } else {
      const normalizedMembers: OrganizationMember[] = (
        (memberRows as RawOrganizationMember[]) || []
      ).map((row) => ({
        ...row,
        member_role: row.member_role || "member",
        profiles: firstRelation(row.profiles),
      }));

      setMembers(normalizedMembers);
    }

    const isManager =
      membershipData && ["owner", "admin"].includes(membershipData.member_role || "");

    if (isManager) {
      const { data: joinRequestRows, error: joinRequestError } = await supabase
        .from("organization_join_requests")
        .select("id, organization_id, user_id, status, created_at")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (joinRequestError) {
        console.error("Error loading join requests:", joinRequestError.message);
        setPageError(`Error loading pending requests: ${joinRequestError.message}`);
        setJoinRequests([]);
      } else {
        const typedRows = (joinRequestRows as JoinRequestRow[]) || [];
        const requesterIds = [...new Set(typedRows.map((row) => row.user_id))];

        let profilesById: Record<string, RelatedProfile> = {};

        if (requesterIds.length > 0) {
          const { data: requesterProfiles, error: requesterProfilesError } = await supabase
            .from("profiles")
            .select("id, full_name, role, location, main_sport")
            .in("id", requesterIds);

          if (requesterProfilesError) {
            console.error(
              "Error loading requester profiles:",
              requesterProfilesError.message
            );
          } else {
            profilesById = ((requesterProfiles as ProfileLookupRow[]) || []).reduce(
              (acc, row) => {
                acc[row.id] = {
                  full_name: row.full_name,
                  role: row.role,
                  location: row.location,
                  main_sport: row.main_sport,
                };
                return acc;
              },
              {} as Record<string, RelatedProfile>
            );
          }
        }

        const normalizedRequests: JoinRequest[] = typedRows.map((row) => ({
          ...row,
          profiles: profilesById[row.user_id] || null,
        }));

        setJoinRequests(normalizedRequests);
      }
    } else {
      setJoinRequests([]);
    }
  }

  async function loadOrganizationPosts(orgId: number) {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, user_id, organization_id, content, created_at, profiles(full_name, role), organizations(id, name, organization_type)"
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading organization posts:", error.message);
      setPosts([]);
      return;
    }

    const normalizedPosts: Post[] = ((data as RawPost[]) || []).map((post) => ({
      ...post,
      profiles: firstRelation(post.profiles),
      organizations: firstRelation(post.organizations),
    }));

    setPosts(normalizedPosts);
  }

  async function loadLikes() {
    const { data, error } = await supabase.from("post_likes").select("*");

    if (error) {
      console.error("Error loading likes:", error.message);
      setLikes([]);
      return;
    }

    setLikes((data as PostLike[]) || []);
  }

  async function loadComments() {
    const { data, error } = await supabase
      .from("post_comments")
      .select("id, post_id, user_id, content, created_at, profiles(full_name)")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading comments:", error.message);
      setComments([]);
      return;
    }

    const normalizedComments: PostComment[] = ((data as RawPostComment[]) || []).map(
      (comment) => ({
        ...comment,
        profiles: firstRelation(comment.profiles),
      })
    );

    setComments(normalizedComments);
  }

  async function refreshOrganizationSection() {
    if (!authUserId || !organizationId) return;
    await loadOrganizationData(organizationId, authUserId);
  }

  async function handleSaveOrganization() {
    if (!organizationId || !organization || !canEditOrganization || !orgName.trim()) {
      return;
    }

    setSavingOrganization(true);
    setPageError("");
    setPageMessage("");

    const { error } = await supabase
      .from("organizations")
      .update({
        name: orgName.trim(),
        organization_type: orgType,
        sport: orgSport.trim() || null,
        location: orgLocation.trim() || null,
        description: orgDescription.trim() || null,
      })
      .eq("id", organizationId);

    if (error) {
      console.error("Error updating organization:", error.message);
      setPageError(`Error: ${error.message}`);
      setSavingOrganization(false);
      return;
    }

    setPageMessage("Organization updated successfully.");
    setEditMode(false);
    await refreshOrganizationSection();
    setSavingOrganization(false);
  }

  function handleCancelOrganizationEdit() {
    if (!organization) return;

    setOrgName(organization.name || "");
    setOrgType(organization.organization_type || "community");
    setOrgSport(organization.sport || "");
    setOrgLocation(organization.location || "");
    setOrgDescription(organization.description || "");
    setEditMode(false);
    setPageError("");
    setPageMessage("");
  }

  async function handleJoinRequest() {
    if (!authUserId || !organizationId || myMembershipRole || hasPendingRequest) return;

    setJoiningOrganization(true);
    setPageMessage("");
    setPageError("");

    const { data: pendingRows, error: pendingError } = await supabase
      .from("organization_join_requests")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", authUserId)
      .eq("status", "pending");

    if (pendingError) {
      console.error("Error checking pending join request:", pendingError.message);
      setPageError(`Error: ${pendingError.message}`);
      setJoiningOrganization(false);
      return;
    }

    if (((pendingRows as { id: number }[]) || []).length > 0) {
      setHasPendingRequest(true);
      setPageMessage("Join request already pending.");
      setJoiningOrganization(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("organization_join_requests")
      .insert({
        organization_id: organizationId,
        user_id: authUserId,
        status: "pending",
      });

    if (insertError) {
      console.error("Error creating join request:", insertError.message);
      setPageError(`Error: ${insertError.message}`);
      setJoiningOrganization(false);
      return;
    }

    setHasPendingRequest(true);
    setPageMessage("Join request sent.");
    await refreshOrganizationSection();
    setJoiningOrganization(false);
  }

  async function handleApproveRequest(request: JoinRequest) {
    if (!canManageOrganization || !organizationId) return;

    setProcessingRequestId(request.id);
    setPageMessage("");
    setPageError("");

    const { data: existingMembership, error: existingMembershipError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", request.user_id)
      .maybeSingle();

    if (existingMembershipError) {
      console.error(
        "Error checking existing membership:",
        existingMembershipError.message
      );
      setPageError(`Error: ${existingMembershipError.message}`);
      setProcessingRequestId(null);
      return;
    }

    if (!existingMembership) {
      const { error: insertMemberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: organizationId,
          user_id: request.user_id,
          member_role: "member",
        });

      if (insertMemberError) {
        console.error("Error approving member:", insertMemberError.message);
        setPageError(`Error: ${insertMemberError.message}`);
        setProcessingRequestId(null);
        return;
      }
    }

    const { error: updateRequestError } = await supabase
      .from("organization_join_requests")
      .update({ status: "approved" })
      .eq("id", request.id);

    if (updateRequestError) {
      console.error("Error updating request:", updateRequestError.message);
      setPageError(`Error: ${updateRequestError.message}`);
      setProcessingRequestId(null);
      return;
    }

    setPageMessage("Join request approved.");
    await refreshOrganizationSection();
    setProcessingRequestId(null);
  }

  async function handleDeclineRequest(requestId: number) {
    if (!canManageOrganization) return;

    setProcessingRequestId(requestId);
    setPageMessage("");
    setPageError("");

    const { error } = await supabase
      .from("organization_join_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      console.error("Error declining request:", error.message);
      setPageError(`Error: ${error.message}`);
      setProcessingRequestId(null);
      return;
    }

    setPageMessage("Join request declined.");
    await refreshOrganizationSection();
    setProcessingRequestId(null);
  }

  async function handleChangeMemberRole(memberId: number, nextRole: "member" | "admin") {
    if (!canManageMembers) return;

    setProcessingMemberId(memberId);
    setPageMessage("");
    setPageError("");

    const { error } = await supabase
      .from("organization_members")
      .update({ member_role: nextRole })
      .eq("id", memberId);

    if (error) {
      console.error("Error updating member role:", error.message);
      setPageError(`Error: ${error.message}`);
      setProcessingMemberId(null);
      return;
    }

    setPageMessage(`Member role updated to ${nextRole}.`);
    await refreshOrganizationSection();
    setProcessingMemberId(null);
  }

  async function handleRemoveMember(memberId: number) {
    if (!canManageMembers) return;

    setProcessingMemberId(memberId);
    setPageMessage("");
    setPageError("");

    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.error("Error removing member:", error.message);
      setPageError(`Error: ${error.message}`);
      setProcessingMemberId(null);
      return;
    }

    setPageMessage("Member removed from organization.");
    await refreshOrganizationSection();
    setProcessingMemberId(null);
  }

  async function handleCreateOrganizationPost() {
    if (!authUserId || !organizationId || !newPost.trim() || !canManageOrganization) {
      return;
    }

    setCreatingPost(true);
    setPageMessage("");
    setPageError("");

    const { error } = await supabase.from("posts").insert({
      user_id: authUserId,
      organization_id: organizationId,
      content: newPost.trim(),
    });

    if (error) {
      console.error("Error creating organization post:", error.message);
      setPageError(`Error: ${error.message}`);
      setCreatingPost(false);
      return;
    }

    setNewPost("");
    await loadOrganizationPosts(organizationId);
    setCreatingPost(false);
  }

  async function handleDeletePost(postId: number) {
    if (!authUserId) return;

    setDeletingPostId(postId);

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", authUserId);

    if (error) {
      console.error("Error deleting post:", error.message);
      setPageError(`Error: ${error.message}`);
      setDeletingPostId(null);
      return;
    }

    if (organizationId) {
      await Promise.all([
        loadOrganizationPosts(organizationId),
        loadLikes(),
        loadComments(),
      ]);
    }

    setDeletingPostId(null);
  }

  async function handleToggleLike(postId: number) {
    if (!authUserId) return;

    setLikingPostId(postId);

    const existingLike = likes.find(
      (like) => like.post_id === postId && like.user_id === authUserId
    );

    if (existingLike) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("id", existingLike.id)
        .eq("user_id", authUserId);

      if (error) {
        console.error("Error deleting like:", error.message);
        setPageError(`Error: ${error.message}`);
        setLikingPostId(null);
        return;
      }
    } else {
      const { error } = await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: authUserId,
      });

      if (error) {
        console.error("Error creating like:", error.message);
        setPageError(`Error: ${error.message}`);
        setLikingPostId(null);
        return;
      }
    }

    await loadLikes();
    setLikingPostId(null);
  }

  async function handleAddComment(postId: number) {
    if (!authUserId) return;

    const content = (commentDrafts[postId] || "").trim();
    if (!content) return;

    setCommentingPostId(postId);

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: authUserId,
      content,
    });

    if (error) {
      console.error("Error creating comment:", error.message);
      setPageError(`Error: ${error.message}`);
      setCommentingPostId(null);
      return;
    }

    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: "",
    }));

    await loadComments();
    setCommentingPostId(null);
  }

  async function handleDeleteComment(commentId: number) {
    if (!authUserId) return;

    setDeletingCommentId(commentId);

    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", authUserId);

    if (error) {
      console.error("Error deleting comment:", error.message);
      setPageError(`Error: ${error.message}`);
      setDeletingCommentId(null);
      return;
    }

    await loadComments();
    setDeletingCommentId(null);
  }

  const memberCount = members.length;
  const ownerNames = members
    .filter((member) => member.member_role === "owner")
    .map((member) => member.profiles?.full_name || "Owner");

  const sidebarStatusLabel = useMemo(() => {
    if (myMembershipRole) return `You are ${myMembershipRole}`;
    if (hasPendingRequest) return "Your join request is pending";
    return "You are not a member yet";
  }, [myMembershipRole, hasPendingRequest]);

  if (loading) {
    return (
      <main className="px-6 py-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm">
          Loading organization...
        </div>
      </main>
    );
  }

  if (!organization) {
    return (
      <main className="px-6 py-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Organization page</h1>
          <p className="mt-3 text-sm text-slate-600">
            {pageError || "Organization not found."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/organizations"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Back to organizations
            </Link>
            <Link
              to="/"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to feed
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-[290px_minmax(0,1fr)_280px]">
      <div>
        <ProfileCard profile={profile} />
      </div>

      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="h-36 bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500" />

          <div className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                  Organization
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                  {organization.name}
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {organization.organization_type}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {organization.location || "No location yet"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {myMembershipRole ? (
                  <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
                    {myMembershipRole}
                  </span>
                ) : hasPendingRequest ? (
                  <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
                    pending request
                  </span>
                ) : (
                  <button
                    onClick={handleJoinRequest}
                    disabled={joiningOrganization}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {joiningOrganization ? "Sending..." : "Request to join"}
                  </button>
                )}

                {canEditOrganization && !editMode && (
                  <button
                    onClick={() => {
                      setEditMode(true);
                      setPageError("");
                      setPageMessage("");
                    }}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit organization
                  </button>
                )}

                <Link
                  to="/organizations"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  All organizations
                </Link>
              </div>
            </div>

            <p className="mt-6 text-sm leading-7 text-slate-700">
              {organization.description || "No description yet."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {organization.sport && (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                  {organization.sport}
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
              {ownerNames.map((ownerName) => (
                <span
                  key={ownerName}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                >
                  Owner · {ownerName}
                </span>
              ))}
            </div>
          </div>
        </section>

        {(pageError || pageMessage) && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            {pageError && <p className="text-sm text-red-600">{pageError}</p>}
            {pageMessage && (
              <p className={`text-sm ${pageError ? "mt-2" : ""} text-slate-600`}>
                {pageMessage}
              </p>
            )}
          </section>
        )}

        {canEditOrganization && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Organization settings
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Update the main details people see on this page.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {editMode ? "editing" : "ready"}
              </span>
            </div>

            {editMode ? (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Organization name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-300"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Organization type
                  </label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-300"
                  >
                    <option value="community">Community</option>
                    <option value="club">Club</option>
                    <option value="team">Team</option>
                    <option value="academy">Academy</option>
                    <option value="federation">Federation</option>
                    <option value="brand">Brand</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Main sport
                  </label>
                  <input
                    type="text"
                    value={orgSport}
                    onChange={(e) => setOrgSport(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Location
                  </label>
                  <input
                    type="text"
                    value={orgLocation}
                    onChange={(e) => setOrgLocation(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    rows={5}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap justify-end gap-3">
                  <button
                    onClick={handleCancelOrganizationEdit}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveOrganization}
                    disabled={savingOrganization || !orgName.trim()}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingOrganization ? "Saving..." : "Save organization"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="mt-2 font-medium text-slate-900">{organization.name}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="mt-2 font-medium text-slate-900">
                    {organization.organization_type}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Sport</p>
                  <p className="mt-2 font-medium text-slate-900">
                    {organization.sport || "Not specified"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="mt-2 font-medium text-slate-900">
                    {organization.location || "Not specified"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="mt-2 font-medium text-slate-900">
                    {organization.description || "No description yet."}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {canManageOrganization && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Pending join requests
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Approve or decline people who want to join this organization.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {joinRequests.length} pending
              </span>
            </div>

            {joinRequests.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No pending requests.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {joinRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {request.profiles?.full_name || request.user_id}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {request.profiles?.role || "No role yet"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Requested{" "}
                          {request.created_at
                            ? new Date(request.created_at).toLocaleString()
                            : "recently"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleApproveRequest(request)}
                          disabled={processingRequestId === request.id}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          {processingRequestId === request.id ? "Working..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request.id)}
                          disabled={processingRequestId === request.id}
                          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Members</h2>
              <p className="mt-2 text-sm text-slate-500">
                People currently inside this organization.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {memberCount}
            </span>
          </div>

          {members.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No members found.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {members.map((member) => {
                const isThisUser = member.user_id === authUserId;
                const canPromote = canManageMembers && !isThisUser && member.member_role === "member";
                const canDemote = canManageMembers && !isThisUser && member.member_role === "admin";
                const canRemove =
                  canManageMembers && !isThisUser && member.member_role !== "owner";

                return (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {member.profiles?.full_name || "Member"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {member.profiles?.role || "No role yet"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {member.profiles?.location || "No location yet"}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {member.member_role}
                      </span>
                    </div>

                    {member.profiles?.main_sport && (
                      <div className="mt-3">
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                          {member.profiles.main_sport}
                        </span>
                      </div>
                    )}

                    {(canPromote || canDemote || canRemove) && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        {canPromote && (
                          <button
                            onClick={() => handleChangeMemberRole(member.id, "admin")}
                            disabled={processingMemberId === member.id}
                            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            {processingMemberId === member.id ? "Working..." : "Promote to admin"}
                          </button>
                        )}

                        {canDemote && (
                          <button
                            onClick={() => handleChangeMemberRole(member.id, "member")}
                            disabled={processingMemberId === member.id}
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {processingMemberId === member.id ? "Working..." : "Demote to member"}
                          </button>
                        )}

                        {canRemove && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={processingMemberId === member.id}
                            className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            {processingMemberId === member.id ? "Working..." : "Remove member"}
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

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Organization posts
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Only owners and admins can publish as this organization.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {posts.length} posts
            </span>
          </div>

          {canManageOrganization ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Post as {organization.name}
              </label>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share a result, announcement, event, or organization update..."
                className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCreateOrganizationPost}
                  disabled={creatingPost || !newPost.trim()}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {creatingPost ? "Posting..." : "Publish organization post"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              You can read, like, and comment here. To publish as this organization,
              you must be an owner or admin.
            </div>
          )}

          <div className="mt-5 space-y-4">
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No organization posts yet.
              </div>
            ) : (
              posts.map((post) => {
                const author = post.profiles;
                const organizationInfo = post.organizations;
                const isOwner = authUserId === post.user_id;
                const postLikes = likes.filter((like) => like.post_id === post.id);
                const likedByMe = postLikes.some(
                  (like) => like.user_id === authUserId
                );
                const postComments = comments.filter(
                  (comment) => comment.post_id === post.id
                );

                return (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {organizationInfo?.name || organization.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {organizationInfo?.organization_type || organization.organization_type} · posted by {author?.full_name || "member"} · {post.created_at ? new Date(post.created_at).toLocaleString() : "Just now"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          Organization post
                        </span>
                        {isOwner && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingPostId === post.id}
                            className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingPostId === post.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-700">
                      {post.content}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                      <span>{postLikes.length} likes</span>
                      <span>{postComments.length} comments</span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        disabled={likingPostId === post.id}
                        className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {likingPostId === post.id
                          ? "..."
                          : likedByMe
                          ? "Unlike"
                          : "Like"}
                      </button>
                      <button className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        Comment
                      </button>
                      <button className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        Share
                      </button>
                    </div>

                    <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                      {postComments.map((comment) => {
                        const canDeleteComment = authUserId === comment.user_id;

                        return (
                          <div
                            key={comment.id}
                            className="rounded-2xl bg-slate-50 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {comment.profiles?.full_name || "Member"}
                                </p>
                                <p className="mt-1 text-sm text-slate-700">
                                  {comment.content}
                                </p>
                              </div>

                              {canDeleteComment && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={deletingCommentId === comment.id}
                                  className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingCommentId === comment.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          placeholder="Write a comment..."
                          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={
                            commentingPostId === post.id ||
                            !(commentDrafts[post.id] || "").trim()
                          }
                          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          {commentingPostId === post.id ? "..." : "Comment"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Your status</h2>
          <p className="mt-3 text-sm text-slate-600">{sidebarStatusLabel}</p>

          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Organization type:</span>{" "}
              {organization.organization_type}
            </p>
            <p>
              <span className="font-semibold">Sport:</span>{" "}
              {organization.sport || "Not specified"}
            </p>
            <p>
              <span className="font-semibold">Location:</span>{" "}
              {organization.location || "Not specified"}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Management</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-slate-50 px-3 py-4">
              <p className="text-2xl font-bold text-slate-900">{memberCount}</p>
              <p className="text-xs text-slate-500">Members</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-4">
              <p className="text-2xl font-bold text-slate-900">{joinRequests.length}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            {canManageMembers
              ? "You can edit organization details, review join requests, promote or remove members, and publish organization posts on this page."
              : canManageOrganization
              ? "You can edit organization details, review join requests, and publish organization posts on this page. Member role changes stay limited to the owner."
              : "You can read the organization page and interact with posts, but management actions stay limited to admins and owners."}
          </div>
        </section>
      </div>
    </main>
  );
}

export default OrganizationPage;