type Suggestion = {
  id: number;
  name: string;
  meta: string;
};

type SuggestionsCardProps = {
  suggestions: Suggestion[];
};

function SuggestionsCard({ suggestions }: SuggestionsCardProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Suggested connections</h2>

        <div className="mt-4 space-y-3">
          {suggestions.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 p-3"
            >
              <h3 className="text-sm font-semibold text-slate-900">{item.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
              <button className="mt-3 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Trending</h2>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="font-semibold text-slate-800">#OpenTrialsTicino</p>
            <p className="text-slate-500">124 new posts</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">#PlayerTransfers</p>
            <p className="text-slate-500">86 new posts</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">#PadelCommunity</p>
            <p className="text-slate-500">58 new posts</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuggestionsCard;