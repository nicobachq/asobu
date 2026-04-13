import type { ChangeEvent, Dispatch, SetStateAction } from "react";

type Post = {
  id: number;
  user_id: string;
  organization_id: number | null;
  content: string;
  image_url: string | null;
  created_at: string | null;
  profiles: {
    full_name: string | null;
    role: string | null;
  } | null;
  organizations: {
    name: string;
    organization_type: string | null;
    logo_url: string | null;
  } | null;
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
  } | null;
};

type ManageableOrganization = {
  id: number;
  name: string;
  organization_type: string | null;
  logo_url: string | null;
};

type FeedCardProps = {
  posts: Post[];
  likes: PostLike[];
  comments: PostComment[];
  manageableOrganizations: ManageableOrganization[];
  selectedPublisher: string;
  setSelectedPublisher: (value: string) => void;
  currentProfileName: string;
  newPost: string;
  setNewPost: (value: string) => void;
  postImagePreviewUrl: string;
  postImageFileName: string;
  onPostImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePostImage: () => void;
  onCreatePost: () => void;
  onDeletePost: (postId: number) => void;
  onToggleLike: (postId: number) => void;
  onAddComment: (postId: number) => void;
  onDeleteComment: (commentId: number) => void;
  commentDrafts: Record<number, string>;
  setCommentDrafts: Dispatch<SetStateAction<Record<number, string>>>;
  creating: boolean;
  deletingPostId: number | null;
  likingPostId: number | null;
  commentingPostId: number | null;
  deletingCommentId: number | null;
  currentUserId: string | null;
};

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "A"
  );
}

function FeedCard({
  posts,
  likes,
  comments,
  manageableOrganizations,
  selectedPublisher,
  setSelectedPublisher,
  currentProfileName,
  newPost,
  setNewPost,
  postImagePreviewUrl,
  postImageFileName,
  onPostImageChange,
  onRemovePostImage,
  onCreatePost,
  onDeletePost,
  onToggleLike,
  onAddComment,
  onDeleteComment,
  commentDrafts,
  setCommentDrafts,
  creating,
  deletingPostId,
  likingPostId,
  commentingPostId,
  deletingCommentId,
  currentUserId,
}: FeedCardProps) {
  const selectedOrganization = selectedPublisher.startsWith("org-")
    ? manageableOrganizations.find(
        (organization) => organization.id === Number(selectedPublisher.replace("org-", ""))
      ) || null
    : null;

  const canPublish = Boolean(newPost.trim() || postImagePreviewUrl);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Publish as
            </label>
            <select
              value={selectedPublisher}
              onChange={(e) => setSelectedPublisher(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
            >
              <option value="me">Me · {currentProfileName}</option>
              {manageableOrganizations.map((organization) => (
                <option key={organization.id} value={`org-${organization.id}`}>
                  Organization · {organization.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Post content
            </label>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share a result, achievement, photo, transfer update, or community news..."
              className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
            />
          </div>
        </div>

        {selectedOrganization && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white">
              {selectedOrganization.logo_url ? (
                <img
                  src={selectedOrganization.logo_url}
                  alt={selectedOrganization.name}
                  className="h-full w-full rounded-full object-contain p-1.5"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {getInitials(selectedOrganization.name)}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-900">
                Posting as {selectedOrganization.name}
              </p>
              <p className="text-xs text-slate-500">
                {selectedOrganization.organization_type || "organization"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100">
              Add image
              <input type="file" accept="image/*" className="hidden" onChange={onPostImageChange} />
            </label>

            {postImagePreviewUrl && (
              <button
                type="button"
                onClick={onRemovePostImage}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
              >
                Remove image
              </button>
            )}
          </div>

          {postImageFileName && (
            <p className="mt-3 text-xs text-slate-500">Selected image: {postImageFileName}</p>
          )}

          {postImagePreviewUrl && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <img
                src={postImagePreviewUrl}
                alt="Post preview"
                className="max-h-[420px] w-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700">
              Post
            </span>
            <span className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700">
              Media
            </span>
          </div>

          <button
            onClick={onCreatePost}
            disabled={creating || !canPublish}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {creating ? "Posting..." : "Publish"}
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">
          No posts yet.
        </div>
      ) : (
        posts.map((post) => {
          const author = post.profiles;
          const organization = post.organizations;
          const isOwner = currentUserId === post.user_id;

          const postLikes = likes.filter((like) => like.post_id === post.id);
          const likedByMe = postLikes.some((like) => like.user_id === currentUserId);

          const postComments = comments.filter(
            (comment) => comment.post_id === post.id
          );

          const displayName = organization?.name || author?.full_name || "Athlete";

          const metaLine = organization
            ? `${organization.organization_type || "organization"} · posted by ${
                author?.full_name || "member"
              }`
            : author?.role || "member";

          return (
            <div key={post.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                    {organization?.logo_url ? (
                      <img
                        src={organization.logo_url}
                        alt={organization.name}
                        className="h-full w-full rounded-full object-contain p-1.5"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {getInitials(displayName)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-slate-900">
                      {displayName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {metaLine} ·{" "}
                      {post.created_at
                        ? new Date(post.created_at).toLocaleString()
                        : "Just now"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {organization ? "Organization post" : "Post"}
                  </span>

                  {isOwner && (
                    <button
                      onClick={() => onDeletePost(post.id)}
                      disabled={deletingPostId === post.id}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingPostId === post.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </div>

              {post.content && (
                <p className="mt-4 text-sm leading-7 text-slate-700">{post.content}</p>
              )}

              {post.image_url && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <img
                    src={post.image_url}
                    alt={post.content || `${displayName} post image`}
                    className="max-h-[520px] w-full object-cover"
                  />
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>{postLikes.length} likes</span>
                <span>{postComments.length} comments</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                <button
                  onClick={() => onToggleLike(post.id)}
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
                  const commentAuthor = comment.profiles;
                  const canDeleteComment = currentUserId === comment.user_id;

                  return (
                    <div
                      key={comment.id}
                      className="rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {commentAuthor?.full_name || "Member"}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {comment.content}
                          </p>
                        </div>

                        {canDeleteComment && (
                          <button
                            onClick={() => onDeleteComment(comment.id)}
                            disabled={deletingCommentId === comment.id}
                            className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingCommentId === comment.id ? "Deleting..." : "Delete"}
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
                    onClick={() => onAddComment(post.id)}
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
  );
}

export default FeedCard;
