type Post = {
  id: number;
  author: string;
  meta: string;
  content: string;
};

type FeedCardProps = {
  posts: Post[];
};

function FeedCard({ posts }: FeedCardProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Share a result, achievement, photo, transfer update, or community news...
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Post
          </button>
          <button className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Photo
          </button>
          <button className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Result
          </button>
          <button className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Tag team
          </button>
        </div>
      </div>

      {posts.map((post) => (
        <div key={post.id} className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{post.author}</h3>
              <p className="mt-1 text-sm text-slate-500">{post.meta}</p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Update
            </span>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-700">{post.content}</p>

          <div className="mt-5 h-56 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200" />

          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>{Math.floor(40 + post.id * 18)} likes</span>
            <span>{Math.floor(6 + post.id * 3)} comments</span>
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
      ))}
    </div>
  );
}

export default FeedCard;