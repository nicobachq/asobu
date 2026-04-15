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
  const [composerExpanded, setComposerExpanded] = useState(false);

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
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSharePost(post: Post) {
    const organization = post.organizations;
    const shareUrl = organization?.id
      ? buildAbsoluteUrl(`/organizations/${organization.id}#post-${post.id}`)
      : buildAbsoluteUrl(`/#post-${post.id}`);

    const result = await shareOrCopy({
      title: `${organization?.name || post.profiles?.full_name || "Asobu member"} on Asobu`,
      text: post.content?.trim() ? `${post.content.trim()}\n\nShared from Asobu` : "Shared from Asobu",
      url: shareUrl,
    });

    if (result === "copied") setShareFeedback("Post link copied.");
    if (result === "shared") setShareFeedback("Post shared.");
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200/70">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Post</h2>
              <p className="mt-1 text-sm text-slate-500">Share an update, image, or link.</p>
            </div>
            {selectedOrganization ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Posting as {selectedOrganization.name}
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-5">
          {manageableOrganizations.length > 0 && composerExpanded ? (
            <div className="mb-4 max-w-xs">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Post as
              </label>
              <select
                value={selectedPublisher}
                onChange={(e) => setSelectedPublisher(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="me">Me · {currentProfileName}</option>
                {manageableOrganizations.map((organization) => (
                  <option key={organization.id} value={`org-${organization.id}`}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <textarea
            value={newPost}
            onFocus={() => setComposerExpanded(true)}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share an update"
            className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 ${
              composerExpanded ? "min-h-[140px]" : "min-h-[96px]"
            }`}
          />

          {(composerExpanded || postImagePreviewUrl || composerExternalMedia) && (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]">
                  Add image
                  <input type="file" accept="image/*" className="hidden" onChange={onPostImageChange} />
                </label>

                {postImagePreviewUrl ? (
                  <button
                    type="button"
                    onClick={onRemovePostImage}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
                  >
                    Remove image
                  </button>
                ) : null}

                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerExpanded(false);
                      setNewPost("");
                      onRemovePostImage();
                    }}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={onCreatePost}
                    disabled={creating || !canPublish}
                    className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creating ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>

              {postImageFileName ? <p className="mt-3 text-xs text-slate-500">{postImageFileName}</p> : null}

              {composerExternalMedia ? (
                <div className="mt-4">
                  <ExternalMediaCard content={newPost} previewLabel="Link preview" />
                </div>
              ) : null}

              {postImagePreviewUrl ? (
                <div className="mt-4 overflow-hidden rounded-2xl bg-slate-100">
                  <img src={postImagePreviewUrl} alt="Post preview" className="max-h-[520px] w-full object-cover" />
                </div>
              ) : null}
            </>
          )}

          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          {!error && message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
          {shareFeedback ? <p className="mt-4 text-sm text-emerald-600">{shareFeedback}</p> : null}
        </div>
      </section>

      {posts.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
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
            ? `${author?.full_name || "Member"} · ${post.created_at ? new Date(post.created_at).toLocaleString() : "Just now"}`
            : `${author?.role || "Member"} · ${post.created_at ? new Date(post.created_at).toLocaleString() : "Just now"}`;

          return (
            <article id={`post-${post.id}`} key={post.id} className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200/70 scroll-mt-24">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      {organization?.logo_url ? (
                        <img src={organization.logo_url} alt={organization.name} className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                          {getInitials(displayName)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="break-words text-base font-semibold text-slate-900">{displayName}</h3>
                      <p className="mt-1 break-words text-sm text-slate-500">{metaLine}</p>
                    </div>
                  </div>

                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => onDeletePost(post.id)}
                      disabled={deletingPostId === post.id}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50"
                    >
                      {deletingPostId === post.id ? "Deleting..." : "Delete"}
                    </button>
                  ) : null}
                </div>

                {post.content ? (
                  <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-slate-700">{post.content}</p>
                ) : null}

                {getExternalMediaPreview(post.content) ? (
                  <div className="mt-4">
                    <ExternalMediaCard content={post.content} />
                  </div>
                ) : null}
              </div>

              {post.image_url ? (
                <div className="overflow-hidden bg-slate-100">
                  <img src={post.image_url} alt={post.content || `${displayName} post`} className="max-h-[620px] w-full object-cover" />
                </div>
              ) : null}

              <div className="border-t border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{postLikes.length} likes</span>
                  <span>{postComments.length} comments</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleLike(post.id)}
                    disabled={likingPostId === post.id}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition active:scale-[0.99] disabled:opacity-50 ${
                      likedByMe ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {likingPostId === post.id ? "..." : likedByMe ? "Liked" : "Like"}
                  </button>
                  <button
                    type="button"
                    onClick={() => focusCommentInput(post.id)}
                    className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 active:scale-[0.99]"
                  >
                    Comment
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSharePost(post)}
                    className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 active:scale-[0.99]"
                  >
                    Share
                  </button>
                </div>

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {postComments.map((comment) => {
                    const canDeleteComment = currentUserId === comment.user_id;
                    return (
                      <div key={comment.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{comment.profiles?.full_name || "Member"}</p>
                            <p className="mt-1 break-words text-sm text-slate-700">{comment.content}</p>
                          </div>
                          {canDeleteComment ? (
                            <button
                              type="button"
                              onClick={() => onDeleteComment(comment.id)}
                              disabled={deletingCommentId === comment.id}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50"
                            >
                              {deletingCommentId === comment.id ? "Deleting..." : "Delete"}
                            </button>
                          ) : null}
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
                      placeholder="Write a comment"
                      className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => onAddComment(post.id)}
                      disabled={commentingPostId === post.id || !(commentDrafts[post.id] || "").trim()}
                      className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50"
                    >
                      {commentingPostId === post.id ? "..." : "Send"}
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
