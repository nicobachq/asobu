import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getFileFromInputEvent, revokeObjectUrl, uploadPostImage, validatePostImageFile } from "../lib/media";
import ProfileCard from "../components/ProfileCard";
import FeedCard from "../components/FeedCard";
import SuggestionsCard from "../components/SuggestionsCard";

type DbProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
};

type RelatedProfile = {
  full_name: string | null;
  role: string | null;
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

type MembershipRow = {
  organization_id: number;
};

type OrganizationNameRow = {
  name: string;
};

type ManageableOrganization = {
  id: number;
  name: string;
  organization_type: string | null;
  logo_url: string | null;
};

type RawManageableMembershipRow = {
  organization_id: number;
  member_role: string | null;
  organizations: ManageableOrganization | ManageableOrganization[] | null;
};

type HomeEvent = {
  id: number;
  title: string;
  event_type: string;
  status: string;
  starts_at: string;
  related_organization_name: string | null;
  opponent_name: string | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatEventLine(event: HomeEvent) {
  const start = new Date(event.starts_at);
  const formatted = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);

  if (event.event_type === "match") {
    return `${formatted} · ${event.related_organization_name || "Your side"} vs ${event.opponent_name || "Opponent TBD"}`;
  }

  return `${formatted} · ${event.related_organization_name || "Personal activity"}`;
}

function FeedPage() {
  const [profile, setProfile] = useState({
    name: "Loading...",
    role: "Loading...",
    location: "Loading...",
    sports: [] as string[],
    organization: "No organization yet",
    openTo: ["Teams", "Clubs", "Communities"],
  });

  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [manageableOrganizations, setManageableOrganizations] = useState<ManageableOrganization[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<HomeEvent[]>([]);
  const [selectedPublisher, setSelectedPublisher] = useState("me");
  const [newPost, setNewPost] = useState("");
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreviewUrl, setPostImagePreviewUrl] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [creating, setCreating] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [likingPostId, setLikingPostId] = useState<number | null>(null);
  const [commentingPostId, setCommentingPostId] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [feedMessage, setFeedMessage] = useState("");
  const [feedError, setFeedError] = useState("");

  useEffect(() => {
    async function loadFeedData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      let membershipIds: number[] = [];

      if (error) {
        console.error("Error loading feed profile:", error.message);
      } else if (data) {
        const dbProfile = data as DbProfile;

        let firstOrganization = "No organization yet";

        const { data: membershipData, error: membershipError } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id);

        if (membershipError) {
          console.error("Error loading membership:", membershipError.message);
        } else if (membershipData) {
          membershipIds = ((membershipData as MembershipRow[]) || []).map((row) => row.organization_id);

          if (membershipIds.length > 0) {
            const { data: orgData, error: orgError } = await supabase
              .from("organizations")
              .select("name")
              .eq("id", membershipIds[0])
              .single();

            if (orgError) {
              console.error("Error loading organization:", orgError.message);
            } else if (orgData) {
              const org = orgData as OrganizationNameRow;
              firstOrganization = org.name;
            }
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

      const { data: manageableData, error: manageableError } = await supabase
        .from("organization_members")
        .select("organization_id, member_role, organizations(id, name, organization_type, logo_url)")
        .eq("user_id", user.id)
        .in("member_role", ["owner", "admin"]);

      if (manageableError) {
        console.error("Error loading manageable organizations:", manageableError.message);
        setManageableOrganizations([]);
      } else {
        const mappedOrganizations: ManageableOrganization[] = (((manageableData as RawManageableMembershipRow[]) || [])
          .map((row) => firstRelation(row.organizations))
          .filter(Boolean) as ManageableOrganization[]);

        setManageableOrganizations(mappedOrganizations);
      }

      const ownedOrMemberOrganizations = membershipIds.length
        ? membershipIds
        : (((manageableData as RawManageableMembershipRow[]) || []).map((row) => row.organization_id));

      const eventSelect =
        "id, title, event_type, status, starts_at, opponent_name, related_organization:organizations!events_related_organization_id_fkey(name)";

      let eventsQuery = supabase
        .from("events")
        .select(eventSelect)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(4);

      if (ownedOrMemberOrganizations.length > 0) {
        const ids = Array.from(new Set(ownedOrMemberOrganizations));
        eventsQuery = eventsQuery.or(`created_by.eq.${user.id},related_organization_id.in.(${ids.join(",")})`);
      } else {
        eventsQuery = eventsQuery.eq("created_by", user.id);
      }

      const { data: eventsData, error: eventsError } = await eventsQuery;
      if (eventsError) {
        console.error("Error loading home events:", eventsError.message);
      } else {
        const mappedEvents: HomeEvent[] = (((eventsData as Array<{ id: number; title: string; event_type: string; status: string; starts_at: string; opponent_name: string | null; related_organization: { name: string } | { name: string }[] | null }>) || [])).map(
          (event) => ({
            id: event.id,
            title: event.title,
            event_type: event.event_type,
            status: event.status,
            starts_at: event.starts_at,
            opponent_name: event.opponent_name,
            related_organization_name: firstRelation(event.related_organization)?.name || null,
          })
        );
        setUpcomingEvents(mappedEvents);
      }

      await Promise.all([loadPosts(), loadLikes(), loadComments()]);
    }

    loadFeedData();
  }, []);

  useEffect(() => {
    return () => {
      revokeObjectUrl(postImagePreviewUrl);
    };
  }, [postImagePreviewUrl]);

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, user_id, organization_id, content, image_url, created_at, profiles(full_name, role), organizations(id, name, organization_type, logo_url)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading posts:", error.message);
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
      return;
    }

    const normalizedComments: PostComment[] = ((data as RawPostComment[]) || []).map((comment) => ({
      ...comment,
      profiles: firstRelation(comment.profiles),
    }));

    setComments(normalizedComments);
  }

  function resetComposerState() {
    revokeObjectUrl(postImagePreviewUrl);
    setNewPost("");
    setPostImageFile(null);
    setPostImagePreviewUrl("");
  }

  async function handlePostImageChange(event: ChangeEvent<HTMLInputElement>) {
    setFeedError("");

    const selected = getFileFromInputEvent(event);
    if (!selected) {
      return;
    }

    const validationMessage = validatePostImageFile(selected);
    if (validationMessage) {
      setFeedError(validationMessage);
      event.target.value = "";
      return;
    }

    revokeObjectUrl(postImagePreviewUrl);
    const nextPreviewUrl = URL.createObjectURL(selected);
    setPostImageFile(selected);
    setPostImagePreviewUrl(nextPreviewUrl);
    event.target.value = "";
  }

  function handleRemovePostImage() {
    revokeObjectUrl(postImagePreviewUrl);
    setPostImageFile(null);
    setPostImagePreviewUrl("");
  }

  async function handleCreatePost() {
    const trimmedContent = newPost.trim();

    if (!trimmedContent && !postImageFile) {
      setFeedError("Write something or add an image before publishing.");
      setFeedMessage("");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFeedError("You need to be signed in to post.");
      setFeedMessage("");
      return;
    }

    setCreating(true);
    setFeedError("");
    setFeedMessage("");

    let uploadedImageUrl: string | null = null;

    if (postImageFile) {
      try {
        uploadedImageUrl = await uploadPostImage(postImageFile, user.id);
      } catch (uploadError) {
        setFeedError(uploadError instanceof Error ? uploadError.message : 'Could not upload the selected image.');
        setCreating(false);
        return;
      }
    }

    const publisherOrganizationId = selectedPublisher.startsWith("org-")
      ? Number(selectedPublisher.replace("org-", ""))
      : null;

    const payload = {
      user_id: user.id,
      organization_id: publisherOrganizationId,
      content: trimmedContent,
      image_url: uploadedImageUrl,
    };

    const { error } = await supabase.from("posts").insert(payload);

    if (error) {
      setFeedError(error.message);
      setCreating(false);
      return;
    }

    resetComposerState();
    setSelectedPublisher("me");
    setFeedMessage("Post published.");
    setCreating(false);
    await loadPosts();
  }

  async function handleDeletePost(postId: number) {
    setDeletingPostId(postId);
    setFeedError("");
    setFeedMessage("");

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      setFeedError(error.message);
      setDeletingPostId(null);
      return;
    }

    setFeedMessage("Post deleted.");
    setDeletingPostId(null);
    await Promise.all([loadPosts(), loadLikes(), loadComments()]);
  }

  async function handleToggleLike(postId: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setLikingPostId(postId);
    setFeedError("");
    setFeedMessage("");

    const existingLike = likes.find((like) => like.post_id === postId && like.user_id === user.id);

    if (existingLike) {
      const { error } = await supabase.from("post_likes").delete().eq("id", existingLike.id);
      if (error) {
        setFeedError(error.message);
        setLikingPostId(null);
        return;
      }
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      if (error) {
        setFeedError(error.message);
        setLikingPostId(null);
        return;
      }
    }

    setLikingPostId(null);
    await loadLikes();
  }

  async function handleAddComment(postId: number) {
    const content = (commentDrafts[postId] || "").trim();
    if (!content) {
      setFeedError("Write a comment before posting.");
      setFeedMessage("");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setCommentingPostId(postId);
    setFeedError("");
    setFeedMessage("");

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content,
    });

    if (error) {
      setFeedError(error.message);
      setCommentingPostId(postId);
      return;
    }

    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setFeedMessage("Comment added.");
    setCommentingPostId(null);
    await loadComments();
  }

  async function handleDeleteComment(commentId: number) {
    setDeletingCommentId(commentId);
    setFeedError("");
    setFeedMessage("");

    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);

    if (error) {
      setFeedError(error.message);
      setDeletingCommentId(null);
      return;
    }

    setFeedMessage("Comment deleted.");
    setDeletingCommentId(null);
    await loadComments();
  }

  const upcomingCount = upcomingEvents.filter((event) => event.status === "scheduled").length;

  return (
    <main className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="app-hero overflow-hidden rounded-[32px] px-6 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Home</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
                Keep your sports identity active, visible, and connected.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Home is your activity layer inside Asobu: share relevant updates, follow the next events in your world, and keep your profile moving forward.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/profile" className="app-button-primary rounded-full px-5 py-3 text-sm font-semibold">
                  Strengthen profile
                </Link>
                <Link to="/discover" className="app-button-secondary rounded-full px-5 py-3 text-sm font-semibold">
                  Explore network
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[460px]">
              <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Posts</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{posts.length}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Updates shaping your public sports identity.</p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Managed orgs</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{manageableOrganizations.length}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Teams, clubs, and communities you can publish for.</p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Upcoming</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{upcomingCount}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Events already connected to your sporting world.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[290px_minmax(0,1fr)_300px]">
          <ProfileCard profile={profile} />
          <div className="space-y-6">
            {upcomingEvents.length > 0 ? (
              <section className="app-card rounded-[32px] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Coming up</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Upcoming activity</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Your next visible sporting moments across personal and organization-linked events.
                    </p>
                  </div>
                  <Link to="/calendar" className="app-button-secondary rounded-full px-4 py-2.5 text-sm font-medium">
                    Open calendar
                  </Link>
                </div>
                <div className="mt-5 grid gap-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="app-card-subtle rounded-[24px] px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="app-chip-brand rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                          {event.event_type}
                        </span>
                        <span className="app-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                          {event.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{event.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{formatEventLine(event)}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <FeedCard
              posts={posts}
              likes={likes}
              comments={comments}
              manageableOrganizations={manageableOrganizations}
              selectedPublisher={selectedPublisher}
              setSelectedPublisher={setSelectedPublisher}
              currentProfileName={profile.name}
              newPost={newPost}
              setNewPost={setNewPost}
              postImagePreviewUrl={postImagePreviewUrl}
              postImageFileName={postImageFile?.name || ""}
              onPostImageChange={handlePostImageChange}
              onRemovePostImage={handleRemovePostImage}
              onCreatePost={handleCreatePost}
              onDeletePost={handleDeletePost}
              onToggleLike={handleToggleLike}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              commentDrafts={commentDrafts}
              setCommentDrafts={setCommentDrafts}
              creating={creating}
              deletingPostId={deletingPostId}
              likingPostId={likingPostId}
              commentingPostId={commentingPostId}
              deletingCommentId={deletingCommentId}
              currentUserId={currentUserId}
              message={feedMessage}
              error={feedError}
            />
          </div>
          <SuggestionsCard manageableOrganizations={manageableOrganizations} />
        </div>
      </div>
    </main>
  );
}

export default FeedPage;
