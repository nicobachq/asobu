import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import ExternalMediaCard from "./ExternalMediaCard";
import { getExternalMediaPreview } from "../lib/externalMedia";
import { buildAbsoluteUrl, shareOrCopy } from "../lib/share";

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
    id?: number;
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
  message: string;
  error: string;
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
  message,
  error,
}: FeedCardProps) {
  const [shareFeedback, setShareFeedback] = useState("");

  const selectedOrganization = selectedPublisher.startsWith("org-")
    ? manageableOrganizations.find(
        (organization) => organization.id === Number(selectedPublisher.replace("org-", ""))
      ) || null
    : null;

  const canPublish = Boolean(newPost.trim() || postImagePreviewUrl);
  const composerExternalMedia = getExternalMediaPreview(newPost);

  function focusCommentInput(postId: number) {
    const input = document.getElementById(`feed-comment-input-${postId}`) as HTMLInputElement | null;
    input?.focus();
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function handleSharePost(post: Post) {
    const organization = post.organizations;
    const shareUrl = organization?.id
      ? buildAbsoluteUrl(`/organizations/${organization.id}#post-${post.id}`)
      : buildAbsoluteUrl(`/#post-${post.id}`);

    const result = await shareOrCopy({
      title: `${organization?.name || post.profiles?.full_name || "Asobu member"} on Asobu`,
      text: post.content?.trim()
        ? `${post.content.trim()}\n\nShared from Asobu`
        : "Shared from Asobu",
      url: shareUrl,
    });

    if (result === "copied") {
      setShareFeedback("Post link copied.");
    } else if (result === "shared") {
      setShareFeedback("Post shared.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 px-6 py-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                Share on Asobu
              </p>
              <h2 className="mt-2 text-2xl font-bold">Build visibility with every post</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/75">
                Publish as yourself or as one of your organizations. Text, images, and external media links all become part of your sports identity.
              </p>
            </div>
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
              {selectedOrganization ? `Publishing as ${selectedOrganization.name}` : `Publishing as ${currentProfileName}`}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
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
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Story / update
              </label>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share a result, achievement, photo, YouTube link, social post, transfer update, or community news..."
                className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
              />
            </div>
          </div>

          {selectedOrganization && (
            <div className="mt-5 flex items-center gap-4 rounded-[24px] bg-slate-50 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                {selectedOrganization.logo_url ? (
                  <img
                    src={selectedOrganization.logo_url}
                    alt={selectedOrganization.name}
                    className="h-full w-full rounded-2xl object-contain p-1.5"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {getInitials(selectedOrganization.name)}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">Posting as {selectedOrganization.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                  {selectedOrganization.organization_type || "organization"}
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100">
                Add image
                <input type="file" accept="image/*" className="hidden" onChange={onPostImageChange} />
              </label>

              {postImagePreviewUrl && (
                <button
                  type="button"
                  onClick={onRemovePostImage}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                >
                  Remove image
                </button>
              )}

              <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                {composerExternalMedia ? "Media link detected" : "Media ready"}
              </span>
            </div>

            {postImageFileName && (
              <p className="mt-3 text-xs text-slate-500">Selected image: {postImageFileName}</p>
            )}

            {composerExternalMedia && (
              <div className="mt-4">
                <ExternalMediaCard content={newPost} previewLabel="Detected link preview" />
              </div>
            )}

            {postImagePreviewUrl && (
              <div className="mt-4 overflow-hidden rounded-[24px] bg-white">
                <img
                  src={postImagePreviewUrl}
                  alt="Post preview"
                  className="max-h-[520px] w-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Identity post
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Images + links
              </span>
            </div>

            <button
              type="button"
              onClick={onCreatePost}
              disabled={creating || !canPublish}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? "Posting..." : "Publish on Asobu"}
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {!error && message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}
          {shareFeedback && <p className="mt-4 text-sm text-emerald-600">{shareFeedback}</p>}
        </div>
      </section>

      {posts.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
          No posts yet.
        </div>
      ) : (
        posts.map((post) => {
          const author = post.profiles;
          const organization = post.organizations;
          const isOwner = currentUserId === post.user_id;
          const postLikes = likes.filter((like) => like.post_id === post.id);
          const likedByMe = postLikes.some((like) => like.user_id === currentUserId);
          const postComments = comments.filter((comment) => comment.post_id === post.id);
          const displayName = organization?.name || author?.full_name || "Athlete";
          const metaLine = organization
            ? `${organization.organization_type || "organization"} · posted by ${author?.full_name || "member"}`
            : author?.role || "member";

          return (
            <article id={`post-${post.id}`} key={post.id} className="overflow-hidden rounded-[32px] bg-white shadow-sm scroll-mt-24">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                      {organization?.logo_url ? (
                        <img
                          src={organization.logo_url}
                          alt={organization.name}
                          className="h-full w-full rounded-2xl object-contain p-1.5"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                          {getInitials(displayName)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-bold text-slate-900">{displayName}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {metaLine} · {post.created_at ? new Date(post.created_at).toLocaleString() : "Just now"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {organization && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                        Organization post
                      </span>
                    )}
                    {isOwner && (
                      <button type="button"
                        onClick={() => onDeletePost(post.id)}
                        disabled={deletingPostId === post.id}
                        className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        {deletingPostId === post.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                </div>

                {post.content && (
                  <p className="mt-5 whitespace-pre-line break-words text-sm leading-7 text-slate-700">{post.content}</p>
                )}

                {getExternalMediaPreview(post.content) && (
                  <div className="mt-5">
                    <ExternalMediaCard content={post.content} />
                  </div>
                )}
              </div>

              {post.image_url && (
                <div className="overflow-hidden bg-slate-100">
                  <img src={post.image_url} alt={post.content || `${displayName} post`} className="max-h-[620px] w-full object-cover" />
                </div>
              )}

              <div className="border-t border-slate-100 px-6 py-5">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{postLikes.length} likes</span>
                  <span>{postComments.length} comments</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <button type="button"
                    onClick={() => onToggleLike(post.id)}
                    disabled={likingPostId === post.id}
                    className="rounded-full bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {likingPostId === post.id ? "..." : likedByMe ? "Unlike" : "Like"}
                  </button>
                  <button
                    type="button"
                    onClick={() => focusCommentInput(post.id)}
                    className="rounded-full bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Comment
                  </button>
                  <button type="button"
                    onClick={() => void handleSharePost(post)}
                    className="rounded-full bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Share
                  </button>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                  {postComments.map((comment) => {
                    const canDeleteComment = currentUserId === comment.user_id;
                    return (
                      <div key={comment.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {comment.profiles?.full_name || "Member"}
                            </p>
                            <p className="mt-1 text-sm text-slate-700">{comment.content}</p>
                          </div>
                          {canDeleteComment && (
                            <button type="button"
                              onClick={() => onDeleteComment(comment.id)}
                              disabled={deletingCommentId === comment.id}
                              className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
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
                      id={`feed-comment-input-${post.id}`}
                      type="text"
                      value={commentDrafts[post.id] || ""}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      placeholder="Write a comment..."
                      className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
                    />
                    <button type="button"
                      onClick={() => onAddComment(post.id)}
                      disabled={commentingPostId === post.id || !(commentDrafts[post.id] || "").trim()}
                      className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {commentingPostId === post.id ? "..." : "Comment"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}

export default FeedCard;
