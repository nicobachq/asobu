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

type FeedCardProps = {
  posts: Post[];
  newPost: string;
  setNewPost: (value: string) => void;
  onCreatePost: () => void;
  onDeletePost: (postId: number) => void;
  creating: boolean;
  deletingPostId: number | null;
  currentUserId: string | null;
};

function FeedCard({
  posts,
  newPost,
  setNewPost,
  onCreatePost,
  onDeletePost,
  creating,
  deletingPostId,
  currentUserId,
}: FeedCardProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Share a result, achievement, photo, transfer update, or community news..."
          className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
        />

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700">
              Post
            </span>
            <span className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700">
              Result
            </span>
          </div>

          <button
            onClick={onCreatePost}
            disabled={creating || !newPost.trim()}
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
          const author = post.profiles?.[0];
          const isOwner = currentUserId === post.user_id;

          return (
            <div key={post.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {author?.full_name || "Athlete"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {author?.role || "member"} ·{" "}
                    {post.created_at
                      ? new Date(post.created_at).toLocaleString()
                      : "Just now"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Post
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

              <p className="mt-4 text-sm leading-7 text-slate-700">
                {post.content}
              </p>

              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>0 likes</span>
                <span>0 comments</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                <button className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Like
                </button>
                <button className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Comment
                </button>
                <button className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Share
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default FeedCard;