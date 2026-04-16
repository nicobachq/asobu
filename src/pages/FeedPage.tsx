import { useEffect, useState, type ChangeEvent } from "react";
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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
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
  const [manageableOrganizations, setManageableOrganizations] = useState<
    ManageableOrganization[]
  >([]);
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

      if (error) {
        console.error("Error loading feed profile:", error.message);
      } else if (data) {
        const dbProfile = data as DbProfile;

        let firstOrganization = "No organization yet";

        const { data: membershipData, error: membershipError } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          console.error("Error loading membership:", membershipError.message);
        } else if (membershipData) {
          const membership = membershipData as MembershipRow;

          const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", membership.organization_id)
            .single();

          if (orgError) {
            console.error("Error loading organization:", orgError.message);
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

      const { data: manageableData, error: manageableError } = await supabase
        .from("organization_members")
        .select(
          "organization_id, member_role, organizations(id, name, organization_type, logo_url)"
        )
        .eq("user_id", user.id)
        .in("member_role", ["owner", "admin"]);

      if (manageableError) {
        console.error(
          "Error loading manageable organizations:",
          manageableError.message
        );
        setManageableOrganizations([]);
      } else {
        const mappedOrganizations: ManageableOrganization[] = (
          (manageableData as RawManageableMembershipRow[]) || []
        )
          .map((row) => firstRelation(row.organizations))
          .filter(Boolean) as ManageableOrganization[];

        setManageableOrganizations(mappedOrganizations);
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

    const normalizedComments: PostComment[] = ((data as RawPostComment[]) || []).map(
      (comment) => ({
        ...comment,
        profiles: firstRelation(comment.profiles),
      })
    );

    setComments(normalizedComments);
  }

  function handlePostImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = getFileFromInputEvent(event);
    event.target.value = "";

    if (!file) return;

    const validationError = validatePostImageFile(file);
    if (validationError) {
      console.error(validationError);
      return;
    }

    revokeObjectUrl(postImagePreviewUrl);
    const previewUrl = URL.createObjectURL(file);
    setPostImageFile(file);
    setPostImagePreviewUrl(previewUrl);
  }

  function handleRemovePostImage() {
    revokeObjectUrl(postImagePreviewUrl);
    setPostImageFile(null);
    setPostImagePreviewUrl("");
  }

  async function handleCreatePost() {
    if (!currentUserId || (!newPost.trim() && !postImageFile)) return;

    setCreating(true);

    let organizationId: number | null = null;
    let uploadedImageUrl: string | null = null;

    if (selectedPublisher.startsWith("org-")) {
      organizationId = Number(selectedPublisher.replace("org-", ""));
    }

    try {
      if (postImageFile) {
        uploadedImageUrl = await uploadPostImage(postImageFile, currentUserId);
      }

      const { error } = await supabase.from("posts").insert({
        user_id: currentUserId,
        organization_id: organizationId,
        content: newPost.trim(),
        image_url: uploadedImageUrl,
      });

      if (error) {
        console.error("Error creating post:", error.message);
        setCreating(false);
        return;
      }

      setNewPost("");
      handleRemovePostImage();
      await loadPosts();
    } catch (error) {
      console.error(
        "Error creating post:",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePost(postId: number) {
    if (!currentUserId) return;

    setDeletingPostId(postId);

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Error deleting post:", error.message);
      setDeletingPostId(null);
      return;
    }

    await Promise.all([loadPosts(), loadLikes(), loadComments()]);
    setDeletingPostId(null);
  }

  async function handleToggleLike(postId: number) {
    if (!currentUserId) return;

    setLikingPostId(postId);

    const existingLike = likes.find(
      (like) => like.post_id === postId && like.user_id === currentUserId
    );

    if (existingLike) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("id", existingLike.id)
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Error deleting like:", error.message);
        setLikingPostId(null);
        return;
      }
    } else {
      const { error } = await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: currentUserId,
      });

      if (error) {
        console.error("Error creating like:", error.message);
        setLikingPostId(null);
        return;
      }
    }

    await loadLikes();
    setLikingPostId(null);
  }

  async function handleAddComment(postId: number) {
    if (!currentUserId) return;

    const content = (commentDrafts[postId] || "").trim();
    if (!content) return;

    setCommentingPostId(postId);

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content,
    });

    if (error) {
      console.error("Error creating comment:", error.message);
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
    if (!currentUserId) return;

    setDeletingCommentId(commentId);

    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Error deleting comment:", error.message);
      setDeletingCommentId(null);
      return;
    }

    await loadComments();
    setDeletingCommentId(null);
  }

  return (
    <main className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
          <ProfileCard profile={profile} />
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
            message=""
            error=""
          />
          <SuggestionsCard manageableOrganizations={manageableOrganizations} />
        </div>
      </div>
    </main>
  );
}

export default FeedPage;
