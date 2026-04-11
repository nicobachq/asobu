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
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
        Share a result, achievement, photo, or update...
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-2xl border border-slate-200 p-4"
          >
            <h3 className="text-base font-semibold text-slate-900">{post.author}</h3>
            <p className="mt-1 text-sm text-slate-500">{post.meta}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{post.content}</p>

            <div className="mt-4 flex gap-4 text-sm text-slate-500">
              <button className="hover:text-slate-900">Like</button>
              <button className="hover:text-slate-900">Comment</button>
              <button className="hover:text-slate-900">Share</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FeedCard;