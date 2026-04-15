import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getFileFromInputEvent, revokeObjectUrl, uploadPostImage, validatePostImageFile } from "../lib/media";
import ProfileCard from "../components/ProfileCard";
import EventCard from "../components/EventCard";
import ExternalMediaCard from "../components/ExternalMediaCard";
import {
  formatOrganizationTypeLabel,
  getOrganizationTypeDescription,
  normalizeOrganizationType,
  ORGANIZATION_REGISTRATION_OPTIONS,
} from "../lib/identity";
import { getExternalMediaPreview } from "../lib/externalMedia";
import { buildAbsoluteUrl, shareOrCopy } from "../lib/share";

type DbProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
};

type ProfileCardData = {
  name: string;
  role: string;
  location: string;
  sports: string[];
  organization: string;
  openTo: string[];
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
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
  logo_url: string | null;
  cover_image_url: string | null;
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
  avatar_url?: string | null;
  cover_image_url?: string | null;
};

type RelatedCommentProfile = {
  full_name: string | null;
};

type RelatedOrganization = {
  id: number;
  name: string;
  organization_type: string | null;
  logo_url: string | null;
};

type RawPost = {
  id: number;
  user_id: string;
  organization_id: number | null;
  content: string;
  image_url: string | null;
  created_at: string | null;
  profiles: RelatedProfile | RelatedProfile[] | null;
  organizations: RelatedOrganization | RelatedOrganization[] | null;
};

type Post = {
  id: number;
  user_id: string;
  organization_id: number | null;
  content: string;
  image_url: string | null;
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

type EventLinkedOrganization = {
  id: number;
  name: string;
  organization_type: string | null;
};

type RawOrganizationEvent = {
  id: number;
  title: string;
  event_type: string;
  status: string;
  visibility: string;
  sport: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  competition_name: string | null;
  opponent_name: string | null;
  score_for: number | null;
  score_against: number | null;
  created_by: string;
  related_organization_id: number | null;
  opponent_organization_id: number | null;
  related_organization: EventLinkedOrganization | EventLinkedOrganization[] | null;
  opponent_organization: EventLinkedOrganization | EventLinkedOrganization[] | null;
};

type OrganizationEvent = Omit<RawOrganizationEvent, 'related_organization' | 'opponent_organization'> & {
  related_organization: EventLinkedOrganization | null;
  opponent_organization: EventLinkedOrganization | null;
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

type TransferOwnershipRpcResponse = {
  success: boolean;
};

const ORGANIZATION_MEDIA_BUCKET = "organization-media";
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

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

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "image";
}

function safeRevokeObjectUrl(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function OrganizationPage() {
  const { id } = useParams();
  const organizationId = Number(id);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [openMediaMenu, setOpenMediaMenu] = useState<"logo" | "cover" | null>(null);
  const [savingMedia, setSavingMedia] = useState<"logo" | "cover" | null>(null);

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
  const [orgLogoUrl, setOrgLogoUrl] = useState("");
  const [orgCoverImageUrl, setOrgCoverImageUrl] = useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [leavingOrganization, setLeavingOrganization] = useState(false);
  const [transferTargetUserId, setTransferTargetUserId] = useState("");
  const [transferringOwnership, setTransferringOwnership] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [organizationEvents, setOrganizationEvents] = useState<OrganizationEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventScope, setEventScope] = useState<"upcoming" | "past" | "all">("upcoming");
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newPost, setNewPost] = useState("");
  const [orgPostImageFile, setOrgPostImageFile] = useState<File | null>(null);
  const [orgPostImagePreviewUrl, setOrgPostImagePreviewUrl] = useState("");
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
  const canSelfLeave = myMembershipRole === "member" || myMembershipRole === "admin";

  const organizationExternalMedia = getExternalMediaPreview(newPost);

  const ownershipTransferCandidates = useMemo(
    () =>
      members.filter(
        (member) => member.user_id !== authUserId && member.member_role !== "owner"
      ),
    [members, authUserId]
  );

  useEffect(() => {
    if (ownershipTransferCandidates.length === 0) {
      setTransferTargetUserId("");
      return;
    }

    setTransferTargetUserId((current) => {
      const stillExists = ownershipTransferCandidates.some(
        (member) => member.user_id === current
      );
      return stillExists ? current : ownershipTransferCandidates[0].user_id;
    });
  }, [ownershipTransferCandidates]);

  useEffect(() => {
    return () => {
      safeRevokeObjectUrl(logoPreviewUrl);
      safeRevokeObjectUrl(coverPreviewUrl);
      revokeObjectUrl(orgPostImagePreviewUrl);
    };
  }, [logoPreviewUrl, coverPreviewUrl, orgPostImagePreviewUrl]);

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
        loadOrganizationEvents(organizationId, authUserId),
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
      avatarUrl: dbProfile.avatar_url || null,
      coverImageUrl: dbProfile.cover_image_url || null,
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
    setOrgType(normalizeOrganizationType(typedOrganization.organization_type) || "community");
    setOrgSport(typedOrganization.sport || "");
    setOrgLocation(typedOrganization.location || "");
    setOrgDescription(typedOrganization.description || "");
    setOrgLogoUrl(typedOrganization.logo_url || "");
    setOrgCoverImageUrl(typedOrganization.cover_image_url || "");
    setLogoPreviewUrl(typedOrganization.logo_url || "");
    setCoverPreviewUrl(typedOrganization.cover_image_url || "");
    setLogoFile(null);
    setCoverFile(null);

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
      .select(
        "id, user_id, member_role, created_at, profiles(full_name, role, location, main_sport, avatar_url, cover_image_url)"
      )
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
          const { data: requesterProfiles, error: requesterProfilesError } =
            await supabase
              .from("profiles")
              .select("id, full_name, role, location, main_sport, avatar_url, cover_image_url")
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
        "id, user_id, organization_id, content, image_url, created_at, profiles(full_name, role), organizations(id, name, organization_type, logo_url)"
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

  async function loadOrganizationEvents(orgId: number, userId: string | null) {
    setEventsLoading(true);

    const eventSelect =
      "id, title, event_type, status, visibility, sport, starts_at, ends_at, location, description, competition_name, opponent_name, score_for, score_against, created_by, related_organization_id, opponent_organization_id, related_organization:organizations!events_related_organization_id_fkey(id, name, organization_type), opponent_organization:organizations!events_opponent_organization_id_fkey(id, name, organization_type)";

    const publicEventsPromise = supabase
      .from("events")
      .select(eventSelect)
      .eq("visibility", "public")
      .or(`related_organization_id.eq.${orgId},opponent_organization_id.eq.${orgId}`)
      .order("starts_at", { ascending: true });

    const privateOwnEventsPromise = userId
      ? supabase
          .from("events")
          .select(eventSelect)
          .eq("visibility", "private")
          .eq("created_by", userId)
          .or(`related_organization_id.eq.${orgId},opponent_organization_id.eq.${orgId}`)
          .order("starts_at", { ascending: true })
      : Promise.resolve({ data: [], error: null } as const);

    const [publicEventsResponse, privateOwnEventsResponse] = await Promise.all([
      publicEventsPromise,
      privateOwnEventsPromise,
    ]);

    if (publicEventsResponse.error) {
      console.error("Error loading organization events:", publicEventsResponse.error.message);
      setOrganizationEvents([]);
      setEventsLoading(false);
      return;
    }

    if (privateOwnEventsResponse.error) {
      console.error("Error loading private organization events:", privateOwnEventsResponse.error.message);
    }

    const normalizeEvent = (event: RawOrganizationEvent): OrganizationEvent => ({
      ...event,
      related_organization: firstRelation(event.related_organization),
      opponent_organization: firstRelation(event.opponent_organization),
    });

    const mergedEvents = [
      ...(((publicEventsResponse.data as RawOrganizationEvent[]) || []).map(normalizeEvent)),
      ...((((privateOwnEventsResponse.data || []) as RawOrganizationEvent[]) || []).map(normalizeEvent)),
    ];

    const uniqueEvents = Array.from(new Map(mergedEvents.map((event) => [event.id, event])).values()).sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );

    setOrganizationEvents(uniqueEvents);
    setEventsLoading(false);
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

  function handleCancelOrganizationEdit() {
    if (!organization) return;

    safeRevokeObjectUrl(logoPreviewUrl);
    safeRevokeObjectUrl(coverPreviewUrl);

    setOrgName(organization.name || "");
    setOrgType(normalizeOrganizationType(organization.organization_type) || "community");
    setOrgSport(organization.sport || "");
    setOrgLocation(organization.location || "");
    setOrgDescription(organization.description || "");
    setOrgLogoUrl(organization.logo_url || "");
    setOrgCoverImageUrl(organization.cover_image_url || "");
    setLogoPreviewUrl(organization.logo_url || "");
    setCoverPreviewUrl(organization.cover_image_url || "");
    setLogoFile(null);
    setCoverFile(null);
    setEditMode(false);
    setPageError("");
    setPageMessage("");
  }

  function triggerOrganizationLogoPicker() {
    setOpenMediaMenu(null);
    logoInputRef.current?.click();
  }

  function triggerOrganizationCoverPicker() {
    setOpenMediaMenu(null);
    coverInputRef.current?.click();
  }

  async function persistOrganizationMedia(options: { target: "logo" | "cover"; file?: File | null; remove?: boolean }) {
    if (!organizationId || !organization || !canEditOrganization) return;

    const { target, file, remove } = options;
    const label = target === "logo" ? "Organization logo" : "Organization banner";
    const existingUrl = target === "logo" ? orgLogoUrl : orgCoverImageUrl;

    setSavingMedia(target);
    setOpenMediaMenu(null);
    setPageError("");
    setPageMessage("");

    try {
      let nextUrl: string | null = remove ? null : existingUrl.trim() || null;
      if (!remove && file) {
        nextUrl = await uploadOrganizationMedia(file, target);
      }
      const updates = target === "logo" ? { logo_url: nextUrl } : { cover_image_url: nextUrl };
      const { error } = await supabase.from("organizations").update(updates).eq("id", organizationId);
      if (error) throw new Error(error.message);

      setOrganization((prev) => (prev ? { ...prev, ...updates } : prev));
      if (target === "logo") {
        safeRevokeObjectUrl(logoPreviewUrl);
        setOrgLogoUrl(nextUrl || "");
        setLogoPreviewUrl(nextUrl || "");
      } else {
        safeRevokeObjectUrl(coverPreviewUrl);
        setOrgCoverImageUrl(nextUrl || "");
        setCoverPreviewUrl(nextUrl || "");
      }
      setPageMessage(remove ? `${label} removed.` : `${label} updated.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Error updating ${label.toLowerCase()}.`;
      console.error(`Error updating ${label.toLowerCase()}:`, message);
      setPageError(`Error: ${message}`);
    } finally {
      setSavingMedia(null);
    }
  }

  function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPageError("Logo must be an image file.");
      return;
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setPageError("Logo is too large. Maximum size is 2 MB.");
      return;
    }

    setPageError("");
    void persistOrganizationMedia({ target: "logo", file });
  }

  function handleCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPageError("Cover must be an image file.");
      return;
    }

    if (file.size > MAX_COVER_SIZE_BYTES) {
      setPageError("Cover is too large. Maximum size is 5 MB.");
      return;
    }

    setPageError("");
    void persistOrganizationMedia({ target: "cover", file });
  }

  function handleRemoveLogo() {
    void persistOrganizationMedia({ target: "logo", remove: true });
  }

  function handleRemoveCover() {
    void persistOrganizationMedia({ target: "cover", remove: true });
  }

  async function uploadOrganizationMedia(
    file: File,
    kind: "logo" | "cover"
  ): Promise<string> {
    if (!organizationId) {
      throw new Error("Organization id is missing.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
    const filePath = `org-${organizationId}/${kind}-${Date.now()}-${safeName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(ORGANIZATION_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(ORGANIZATION_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  async function handleSaveOrganization() {
    if (!organizationId || !organization || !canEditOrganization || !orgName.trim()) {
      return;
    }

    setSavingOrganization(true);
    setPageError("");
    setPageMessage("");

    try {
      let nextLogoUrl: string | null = orgLogoUrl.trim() || null;
      let nextCoverUrl: string | null = orgCoverImageUrl.trim() || null;

      if (logoFile) {
        nextLogoUrl = await uploadOrganizationMedia(logoFile, "logo");
      }

      if (coverFile) {
        nextCoverUrl = await uploadOrganizationMedia(coverFile, "cover");
      }

      const { error } = await supabase
        .from("organizations")
        .update({
          name: orgName.trim(),
          organization_type: orgType,
          sport: orgSport.trim() || null,
          location: orgLocation.trim() || null,
          description: orgDescription.trim() || null,
          logo_url: nextLogoUrl,
          cover_image_url: nextCoverUrl,
        })
        .eq("id", organizationId);

      if (error) {
        throw new Error(error.message);
      }

      setOrgLogoUrl(nextLogoUrl || "");
      setOrgCoverImageUrl(nextCoverUrl || "");
      setLogoPreviewUrl(nextLogoUrl || "");
      setCoverPreviewUrl(nextCoverUrl || "");
      setLogoFile(null);
      setCoverFile(null);
      setEditMode(false);
      setPageMessage("Organization updated successfully.");
      await refreshOrganizationSection();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown upload error.";
      console.error("Error updating organization:", message);
      setPageError(`Error: ${message}`);
    } finally {
      setSavingOrganization(false);
    }
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

  async function handleTransferOwnership() {
    if (!organizationId || !canManageMembers || !transferTargetUserId) return;

    setTransferringOwnership(true);
    setPageError("");
    setPageMessage("");

    const { data, error } = await supabase.rpc("transfer_organization_ownership", {
      p_organization_id: organizationId,
      p_new_owner_user_id: transferTargetUserId,
    });

    if (error) {
      console.error("Error transferring ownership:", error.message);
      setPageError(`Error: ${error.message}`);
      setTransferringOwnership(false);
      return;
    }

    const rpcResponse = Array.isArray(data)
      ? ((data[0] as TransferOwnershipRpcResponse | undefined) ?? { success: true })
      : ((data as TransferOwnershipRpcResponse | null) ?? { success: true });

    if (!rpcResponse.success) {
      setPageError("Ownership transfer failed.");
      setTransferringOwnership(false);
      return;
    }

    setPageMessage(
      "Ownership transferred. You are now an admin and can leave the organization if needed."
    );
    await Promise.all([
      refreshOrganizationSection(),
      authUserId ? loadCurrentUserProfile(authUserId) : Promise.resolve(),
    ]);
    setTransferringOwnership(false);
  }

  async function handleLeaveOrganization() {
    if (!authUserId || !organizationId || !canSelfLeave) return;

    setLeavingOrganization(true);
    setPageMessage("");
    setPageError("");
    setEditMode(false);

    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", authUserId);

    if (error) {
      console.error("Error leaving organization:", error.message);
      setPageError(`Error: ${error.message}`);
      setLeavingOrganization(false);
      return;
    }

    setPageMessage("You left the organization.");
    await Promise.all([
      refreshOrganizationSection(),
      loadCurrentUserProfile(authUserId),
    ]);
    setLeavingOrganization(false);
  }

  function handleOrganizationPostImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = getFileFromInputEvent(event);
    event.target.value = "";

    if (!file) return;

    const validationError = validatePostImageFile(file);
    if (validationError) {
      setPageError(validationError);
      return;
    }

    setPageError("");
    revokeObjectUrl(orgPostImagePreviewUrl);
    const previewUrl = URL.createObjectURL(file);
    setOrgPostImageFile(file);
    setOrgPostImagePreviewUrl(previewUrl);
  }

  function handleRemoveOrganizationPostImage() {
    revokeObjectUrl(orgPostImagePreviewUrl);
    setOrgPostImageFile(null);
    setOrgPostImagePreviewUrl("");
  }

  function focusCommentInput(postId: number) {
    const input = document.getElementById(`organization-comment-input-${postId}`) as HTMLInputElement | null;
    input?.focus();
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function handleShareOrganization() {
    if (!organization) return;

    const result = await shareOrCopy({
      title: `${organization.name} on Asobu`,
      text: `${formatOrganizationTypeLabel(organization.organization_type)}${organization.sport ? ` · ${organization.sport}` : ''}\n\nShared from Asobu`,
      url: buildAbsoluteUrl(`/organizations/${organization.id}`),
    });

    if (result === "copied") {
      setPageMessage("Organization link copied.");
    } else if (result === "shared") {
      setPageMessage("Organization shared.");
    }
  }

  async function handleSharePost(post: Post) {
    const shareUrl = buildAbsoluteUrl(`/organizations/${organizationId}#post-${post.id}`);
    const result = await shareOrCopy({
      title: `${organization?.name || 'Organization'} on Asobu`,
      text: post.content?.trim()
        ? `${post.content.trim()}\n\nShared from Asobu`
        : "Shared from Asobu",
      url: shareUrl,
    });

    if (result === "copied") {
      setPageMessage("Post link copied.");
    } else if (result === "shared") {
      setPageMessage("Post shared.");
    }
  }

  async function handleCreateOrganizationPost() {
    if (!authUserId || !organizationId || (!newPost.trim() && !orgPostImageFile) || !canManageOrganization) {
      return;
    }

    setCreatingPost(true);
    setPageMessage("");
    setPageError("");

    try {
      let uploadedImageUrl: string | null = null;

      if (orgPostImageFile) {
        uploadedImageUrl = await uploadPostImage(orgPostImageFile, authUserId);
      }

      const { error } = await supabase.from("posts").insert({
        user_id: authUserId,
        organization_id: organizationId,
        content: newPost.trim(),
        image_url: uploadedImageUrl,
      });

      if (error) {
        console.error("Error creating organization post:", error.message);
        setPageError(`Error: ${error.message}`);
        setCreatingPost(false);
        return;
      }

      setNewPost("");
      handleRemoveOrganizationPostImage();
      await loadOrganizationPosts(organizationId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown upload error.";
      console.error("Error creating organization post:", message);
      setPageError(`Error: ${message}`);
    } finally {
      setCreatingPost(false);
    }
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

  const upcomingOrganizationEvents = useMemo(
    () =>
      organizationEvents.filter(
        (event) => event.status !== "canceled" && new Date(event.starts_at).getTime() >= Date.now()
      ),
    [organizationEvents]
  );

  const pastOrganizationEvents = useMemo(
    () =>
      organizationEvents
        .filter(
          (event) => event.status === "completed" || new Date(event.starts_at).getTime() < Date.now()
        )
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
    [organizationEvents]
  );

  const visibleOrganizationEvents = useMemo(() => {
    if (eventScope === "upcoming") {
      return upcomingOrganizationEvents;
    }

    if (eventScope === "past") {
      return pastOrganizationEvents;
    }

    return [...organizationEvents].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [eventScope, organizationEvents, pastOrganizationEvents, upcomingOrganizationEvents]);

  const solidSecondaryButton =
    "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50";
  const solidPrimaryButton =
    "rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60";
  const smallPrimaryButton =
    "rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60";
  const smallSecondaryButton =
    "rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60";
  const smallDangerButton =
    "rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-60";
  const heroGhostButton =
    "rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white backdrop-blur hover:bg-white/15";
  const heroGhostDangerButton =
    "rounded-2xl border border-red-200/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-white backdrop-blur hover:bg-red-500/20";

  if (loading) {
    return (
      <main className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="mx-auto max-w-[1500px] rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          Loading organization...
        </div>
      </main>
    );
  }

  if (!organization) {
    return (
      <main className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <h1 className="text-2xl font-bold text-slate-900">Organization page</h1>
          <p className="mt-3 text-sm text-slate-600">
            {pageError || "Organization not found."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/organizations" className={solidPrimaryButton}>
              Back to organizations
            </Link>
            <Link to="/" className={solidSecondaryButton}>
              Back to feed
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-3 py-3 sm:gap-6 sm:px-4 sm:py-4 lg:px-6 lg:py-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <div>
        <ProfileCard profile={profile} />
      </div>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-white shadow-sm">
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
          <div
            className="group relative h-[360px] bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500"
            style={
              (coverPreviewUrl || organization.cover_image_url)
                ? {
                    backgroundImage: `url(${coverPreviewUrl || organization.cover_image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-900/10" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-6">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white backdrop-blur">
                Organization
              </span>

              <div className="flex flex-wrap justify-end gap-2">
                {myMembershipRole ? (
                  <span className="rounded-full border border-emerald-200/40 bg-emerald-400/20 px-4 py-2 text-sm font-medium text-white backdrop-blur">
                    {myMembershipRole}
                  </span>
                ) : hasPendingRequest ? (
                  <span className="rounded-full border border-amber-200/40 bg-amber-400/20 px-4 py-2 text-sm font-medium text-white backdrop-blur">
                    pending request
                  </span>
                ) : (
                  <button type="button"
                    onClick={handleJoinRequest}
                    disabled={joiningOrganization}
                    className={heroGhostButton + " disabled:opacity-60"}
                  >
                    {joiningOrganization ? "Sending..." : "Request to join"}
                  </button>
                )}

                {canEditOrganization && !editMode && (
                  <button type="button"
                    onClick={() => {
                      setEditMode(true);
                      setPageError("");
                      setPageMessage("");
                    }}
                    className={heroGhostButton}
                  >
                    Edit details
                  </button>
                )}

                {canSelfLeave && (
                  <button type="button"
                    onClick={handleLeaveOrganization}
                    disabled={leavingOrganization}
                    className={heroGhostDangerButton + " disabled:opacity-60"}
                  >
                    {leavingOrganization ? "Leaving..." : "Leave organization"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void handleShareOrganization()}
                  className={heroGhostButton}
                >
                  Share
                </button>

                <Link to="/organizations" className={heroGhostButton}>
                  All organizations
                </Link>
              </div>
            </div>

            {canEditOrganization ? (
              <div className="absolute right-6 top-20 z-10">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMediaMenu((current) => (current === "cover" ? null : "cover"))}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/95 text-slate-700 shadow-lg transition sm:opacity-0 sm:group-hover:opacity-100 ${openMediaMenu === "cover" || savingMedia === "cover" ? "opacity-100" : ""}`}
                    aria-label="Edit organization banner"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      <path d="M4.5 7.5h3l1.5-2h6l1.5 2h3A1.5 1.5 0 0 1 21 9v8.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5V9A1.5 1.5 0 0 1 4.5 7.5Z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                  </button>
                  {openMediaMenu === "cover" ? (
                    <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      <button type="button" onClick={triggerOrganizationCoverPicker} className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                        {savingMedia === "cover" ? "Uploading…" : "Change banner"}
                      </button>
                      {(coverPreviewUrl || organization.cover_image_url) ? (
                        <button type="button" onClick={handleRemoveCover} className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50">
                          {savingMedia === "cover" ? "Removing…" : "Remove banner"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex min-w-0 items-end gap-4">
                  <div className="group relative">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-xl sm:h-28 sm:w-28 sm:rounded-[28px]">
                      {organization.logo_url ? (
                        <img
                          src={organization.logo_url}
                          alt={organization.name}
                          className="h-full w-full rounded-[20px] object-contain p-2 sm:rounded-[24px] sm:p-2.5"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-[20px] bg-slate-900 text-lg font-semibold text-white sm:rounded-[24px] sm:text-2xl">
                          {getInitials(organization.name)}
                        </div>
                      )}
                    </div>
                    {canEditOrganization ? (
                      <div className="absolute bottom-1 right-1 z-10">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMediaMenu((current) => (current === "logo" ? null : "logo"))}
                            className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/95 text-slate-700 shadow-lg transition sm:opacity-0 sm:group-hover:opacity-100 ${openMediaMenu === "logo" || savingMedia === "logo" ? "opacity-100" : ""}`}
                            aria-label="Edit organization logo"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
                              <path d="M4.5 7.5h3l1.5-2h6l1.5 2h3A1.5 1.5 0 0 1 21 9v8.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5V9A1.5 1.5 0 0 1 4.5 7.5Z" />
                              <circle cx="12" cy="13" r="3.5" />
                            </svg>
                          </button>
                          {openMediaMenu === "logo" ? (
                            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                              <button type="button" onClick={triggerOrganizationLogoPicker} className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                {savingMedia === "logo" ? "Uploading…" : "Change logo"}
                              </button>
                              {(logoPreviewUrl || organization.logo_url) ? (
                                <button type="button" onClick={handleRemoveLogo} className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50">
                                  {savingMedia === "logo" ? "Removing…" : "Remove logo"}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <h1 className="max-w-3xl text-2xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                      {organization.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85">
                      <span className="font-medium">
                        {formatOrganizationTypeLabel(organization.organization_type)}
                      </span>
                      <span>•</span>
                      <span>{organization.location || "No location yet"}</span>
                      {organization.sport && (
                        <>
                          <span>•</span>
                          <span>{organization.sport}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-[28px] border border-white/15 bg-white/10 p-4 text-white backdrop-blur md:min-w-[280px]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                      Members
                    </p>
                    <p className="mt-2 text-3xl font-bold">{memberCount}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                      Pending
                    </p>
                    <p className="mt-2 text-3xl font-bold">{joinRequests.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <p className="text-base leading-8 text-slate-700">
                {organization.description || "No description yet."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                  {formatOrganizationTypeLabel(organization.organization_type)}
                </span>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Status</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {sidebarStatusLabel}
                </p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Type</p>
                <p className="mt-2 font-semibold capitalize text-slate-900">
                  {formatOrganizationTypeLabel(organization.organization_type)}
                </p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Location</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {organization.location || "Not specified"}
                </p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Founded on Asobu</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {organization.created_at
                    ? new Date(organization.created_at).toLocaleDateString()
                    : "Recently"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {(pageError || pageMessage) && (
          <section className="rounded-[32px] bg-white p-5 shadow-sm">
            {pageError && <p className="text-sm text-red-600">{pageError}</p>}
            {pageMessage && (
              <p className={`text-sm ${pageError ? "mt-2" : ""} text-slate-600`}>
                {pageMessage}
              </p>
            )}
          </section>
        )}

        <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Organization events</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Calendar activity</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Upcoming events and recent results linked to this organization.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to={`/calendar?organization=${organization.id}`}
                className={smallSecondaryButton}
              >
                Open calendar
              </Link>
              {myMembershipRole ? (
                <Link
                  to={`/calendar?organization=${organization.id}&prefillOrganization=${organization.id}&compose=1`}
                  className={smallPrimaryButton}
                >
                  Create linked event
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { value: "upcoming", label: "Upcoming", count: upcomingOrganizationEvents.length },
              { value: "past", label: "Past & results", count: pastOrganizationEvents.length },
              { value: "all", label: "All", count: organizationEvents.length },
            ].map((option) => {
              const active = eventScope === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEventScope(option.value as "upcoming" | "past" | "all")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label} · {option.count}
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-4">
            {eventsLoading ? (
              <p className="text-sm text-slate-500">Loading organization events…</p>
            ) : visibleOrganizationEvents.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                {eventScope === "upcoming"
                  ? "No upcoming public events are linked to this organization yet."
                  : eventScope === "past"
                    ? "No completed or past events are linked to this organization yet."
                    : "No events are linked to this organization yet."}
              </div>
            ) : (
              visibleOrganizationEvents.map((organizationEvent) => (
                <EventCard
                  key={organizationEvent.id}
                  event={organizationEvent}
                  currentUserId={authUserId}
                  perspectiveOrganizationId={organization.id}
                />
              ))
            )}
          </div>
        </section>

        {canEditOrganization && (
          <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  Organization settings
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Update the main details for this organization.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {editMode ? "editing" : "ready"}
              </span>
            </div>

            {editMode ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    {ORGANIZATION_REGISTRATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {getOrganizationTypeDescription(orgType)}
                  </p>
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

                <div className="md:col-span-2 rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Update logo and banner directly from the header media above.
                </div>

                <div className="md:col-span-2 flex flex-wrap justify-end gap-3">
                  <button type="button"
                    onClick={handleCancelOrganizationEdit}
                    className={solidSecondaryButton}
                  >
                    Cancel
                  </button>
                  <button type="button"
                    onClick={handleSaveOrganization}
                    disabled={savingOrganization || !orgName.trim()}
                    className={solidPrimaryButton}
                  >
                    {savingOrganization ? "Saving..." : "Save organization"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="mt-2 font-medium text-slate-900">{organization.name}</p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="mt-2 font-medium text-slate-900">
                    {formatOrganizationTypeLabel(organization.organization_type)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Sport</p>
                  <p className="mt-2 font-medium text-slate-900">
                    {organization.sport || "Not specified"}
                  </p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="mt-2 font-medium text-slate-900">
                    {organization.location || "Not specified"}
                  </p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-4 md:col-span-2">
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="mt-2 font-medium text-slate-900">
                    {organization.description || "No description yet."}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {canManageMembers && (
          <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  Ownership transfer
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Transfer this organization to an existing member or admin. After
                  transfer, you become an admin and can leave the organization if needed.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                owner only
              </span>
            </div>

            {ownershipTransferCandidates.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                You need at least one other member or admin before you can transfer
                ownership.
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    New owner
                  </label>
                  <select
                    value={transferTargetUserId}
                    onChange={(e) => setTransferTargetUserId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-300"
                  >
                    {ownershipTransferCandidates.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {(member.profiles?.full_name || member.user_id) +
                          ` — ${member.member_role}`}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="button"
                  onClick={handleTransferOwnership}
                  disabled={transferringOwnership || !transferTargetUserId}
                  className={solidPrimaryButton}
                >
                  {transferringOwnership ? "Transferring..." : "Transfer ownership"}
                </button>
              </div>
            )}
          </section>
        )}

        {canManageOrganization && (
          <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
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
                    className="rounded-[24px] border border-slate-200 p-4"
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
                        <button type="button"
                          onClick={() => handleApproveRequest(request)}
                          disabled={processingRequestId === request.id}
                          className={smallPrimaryButton}
                        >
                          {processingRequestId === request.id ? "Working..." : "Approve"}
                        </button>
                        <button type="button"
                          onClick={() => handleDeclineRequest(request.id)}
                          disabled={processingRequestId === request.id}
                          className={smallSecondaryButton}
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

        <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Members</h2>
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
                const canPromote =
                  canManageMembers && !isThisUser && member.member_role === "member";
                const canDemote =
                  canManageMembers && !isThisUser && member.member_role === "admin";
                const canRemove =
                  canManageMembers && !isThisUser && member.member_role !== "owner";

                return (
                  <div
                    key={member.id}
                    className="rounded-[24px] border border-slate-200 p-4"
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
                          <button type="button"
                            onClick={() => handleChangeMemberRole(member.id, "admin")}
                            disabled={processingMemberId === member.id}
                            className={smallPrimaryButton}
                          >
                            {processingMemberId === member.id
                              ? "Working..."
                              : "Promote to admin"}
                          </button>
                        )}

                        {canDemote && (
                          <button type="button"
                            onClick={() => handleChangeMemberRole(member.id, "member")}
                            disabled={processingMemberId === member.id}
                            className={smallSecondaryButton}
                          >
                            {processingMemberId === member.id
                              ? "Working..."
                              : "Demote to member"}
                          </button>
                        )}

                        {canRemove && (
                          <button type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={processingMemberId === member.id}
                            className={smallDangerButton}
                          >
                            {processingMemberId === member.id
                              ? "Working..."
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

        <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
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

          {canManageOrganization && (
            <div className="mt-5 rounded-[28px] border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      className="h-full w-full rounded-full object-contain p-1.5"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {getInitials(organization.name)}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Post as {organization.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatOrganizationTypeLabel(organization.organization_type)}
                  </p>
                </div>
              </div>

              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share a result, announcement, photo, YouTube link, social link, event, or organization update..."
                className="mt-4 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
              />

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <label className={smallSecondaryButton + " cursor-pointer"}>
                    Add image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleOrganizationPostImageChange}
                    />
                  </label>

                  {orgPostImagePreviewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveOrganizationPostImage}
                      className={smallSecondaryButton}
                    >
                      Remove image
                    </button>
                  )}

                  <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                    {organizationExternalMedia ? "Media link detected" : "Media ready"}
                  </span>
                </div>

                {orgPostImageFile && (
                  <p className="mt-3 text-xs text-slate-500">Selected image: {orgPostImageFile.name}</p>
                )}

                {organizationExternalMedia && (
                  <div className="mt-4">
                    <ExternalMediaCard content={newPost} previewLabel="Detected link preview" />
                  </div>
                )}

                {orgPostImagePreviewUrl && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <img
                      src={orgPostImagePreviewUrl}
                      alt="Organization post preview"
                      className="max-h-[420px] w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button type="button"
                  onClick={handleCreateOrganizationPost}
                  disabled={creatingPost || (!newPost.trim() && !orgPostImagePreviewUrl)}
                  className={solidPrimaryButton}
                >
                  {creatingPost ? "Publishing..." : "Publish organization post"}
                </button>
              </div>
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
                    id={`post-${post.id}`}
                    key={post.id}
                    className="rounded-[28px] border border-slate-200 p-5 scroll-mt-24"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white">
                          {organizationInfo?.logo_url ? (
                            <img
                              src={organizationInfo.logo_url}
                              alt={organizationInfo.name}
                              className="h-full w-full rounded-full object-contain p-1.5"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                              {getInitials(organizationInfo?.name || organization.name)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {organizationInfo?.name || organization.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatOrganizationTypeLabel(organizationInfo?.organization_type || organization.organization_type)}{" "}
                            · posted by {author?.full_name || "member"} ·{" "}
                            {post.created_at
                              ? new Date(post.created_at).toLocaleString()
                              : "Just now"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          Organization post
                        </span>
                        {isOwner && (
                          <button type="button"
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingPostId === post.id}
                            className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingPostId === post.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </div>

                    {post.content && (
                      <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-slate-700">
                        {post.content}
                      </p>
                    )}

                    {getExternalMediaPreview(post.content) && (
                      <div className="mt-4">
                        <ExternalMediaCard content={post.content} />
                      </div>
                    )}

                    {post.image_url && (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <img
                          src={post.image_url}
                          alt={post.content || `${organizationInfo?.name || organization.name} post image`}
                          className="max-h-[520px] w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                      <span>{postLikes.length} likes</span>
                      <span>{postComments.length} comments</span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                      <button type="button"
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
                      <button
                        type="button"
                        onClick={() => focusCommentInput(post.id)}
                        className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Comment
                      </button>
                      <button type="button"
                        onClick={() => void handleSharePost(post)}
                        className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
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
                                <button type="button"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={deletingCommentId === comment.id}
                                  className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
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
                        <button type="button"
                          onClick={() => handleAddComment(post.id)}
                          disabled={
                            commentingPostId === post.id ||
                            !(commentDrafts[post.id] || "").trim()
                          }
                          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
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

      <div className="space-y-6">
        <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Quick overview</h2>
          <p className="mt-3 text-sm text-slate-600">{sidebarStatusLabel}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] bg-slate-50 px-4 py-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Members
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {memberCount}
              </p>
            </div>
            <div className="rounded-[24px] bg-slate-50 px-4 py-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Pending
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {joinRequests.length}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Organization type:</span>{" "}
              {formatOrganizationTypeLabel(organization.organization_type)}
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

        <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Media preview</h2>
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm text-slate-500">Logo</p>
              <div className="mt-2 flex h-28 w-28 items-center justify-center rounded-[24px] border border-slate-200 bg-white">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="h-full w-full rounded-[20px] object-contain p-2"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-[20px] bg-slate-900 text-lg font-semibold text-white">
                    {getInitials(organization.name)}
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500">Cover</p>
              <div
                className="mt-2 h-28 rounded-[24px] bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500"
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
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Access</h2>

          <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            {canManageMembers
              ? "Manage details, media, requests, and ownership from this page."
              : canManageOrganization
              ? "Edit details, update media, and review requests from this page."
              : canSelfLeave
              ? "You are a member of this organization and can leave it at any time from the top action buttons."
              : myMembershipRole === "owner"
              ? "You are the owner of this organization. Transfer ownership first if you want to leave later."
              : "You can view the organization and interact with its activity."}
          </div>
        </section>
      </div>
    </main>
  );
}

export default OrganizationPage;