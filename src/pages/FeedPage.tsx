import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
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

type Post = {
  id: number;
  user_id: string;
  content: string;
  created_at: string | null;
  profiles: {
    full_name: string | null;
    role: string | null;
  }[];
};

type PostLike = {
  id: number;
  post_id: number;
  user_id: string;
};

type PostComment = {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string | null;
  profiles: {
    full_name: string | null;
  }[];
};

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
  const [newPost, setNewPost] = useState("");
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

        setProfile({
          name: dbProfile.full_name || "No name yet",
          role: dbProfile.role || "No role yet",
          location: dbProfile.location || "No location yet",
          sports: dbProfile.main_sport ? [dbProfile.main_sport] : [],
          organization: "No organization yet",
          openTo: ["Teams", "Clubs", "Communities"],
        });
      }

      await Promise.all([loadPosts(), loadLikes(), loadComments()]);
    }

    loadFeedData();
  }, []);

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("id, user_id, content, created_at, profiles(full_name, role)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading posts:", error.message);
      return;
    }

    setPosts((data as Post[]) || []);
  }

  async function loadLikes() {
    const { data, error } = await supabase
      .from("post_likes")
      .select("*");

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

    setComments((data as PostComment[]) || []);
  }

  async function handleCreatePost() {
    if (!newPost.trim() || !currentUserId) return;

    setCreating(true);

    const { error } = await supabase.from("posts").insert({
      user_id: currentUserId,
      content: newPost.trim(),
    });

    if (error) {
      console.error("Error creating post:", error.message);
      setCreating(false);
      return;
    }

    setNewPost("");
    await loadPosts();
    setCreating(false);
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

  const suggestions = [
    {
      id: 1,
      name: "FC Lugano U21",
      meta: "Football Team · Lugano",
    },
    {
      id: 2,
      name: "Padel Brothers Ticino",
      meta: "Community · Lugano",
    },
    {
      id: 3,
      name: "Coach Elena Rossi",
      meta: "Volleyball Coach · Switzerland",
    },
  ];

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-[290px_minmax(0,1fr)_280px]">
      <ProfileCard profile={profile} />
      <FeedCard
        posts={posts}
        likes={likes}
        comments={comments}
        newPost={newPost}
        setNewPost={setNewPost}
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
      />
      <SuggestionsCard suggestions={suggestions} />
    </main>
  );
}

export default FeedPage;