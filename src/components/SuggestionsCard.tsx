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
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Suggestions</h2>

      <div className="space-y-3">
        {suggestions.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 p-3"
          >
            <h3 className="text-sm font-semibold text-slate-900">{item.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SuggestionsCard;