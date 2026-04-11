function MessagesPage() {
  return (
    <main className="px-6 py-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Conversations
          </h2>

          <div className="border-b border-slate-200 py-3">
            <p className="font-semibold text-slate-900">Coach Elena Rossi</p>
            <p className="mt-1 text-sm text-slate-500">
              Thanks for sharing your profile.
            </p>
          </div>

          <div className="border-b border-slate-200 py-3">
            <p className="font-semibold text-slate-900">FC Lugano U21</p>
            <p className="mt-1 text-sm text-slate-500">
              We would like to know more about your experience.
            </p>
          </div>

          <div className="py-3">
            <p className="font-semibold text-slate-900">Padel Brothers Ticino</p>
            <p className="mt-1 text-sm text-slate-500">
              Sunday session confirmed.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">Chat</h2>

          <div className="mb-3 max-w-[70%] rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            Hi Nicolas, thanks for sharing your profile.
          </div>

          <div className="mb-6 ml-auto max-w-[70%] rounded-2xl bg-blue-100 px-4 py-3 text-sm text-slate-800">
            Thank you. Happy to connect and share more details.
          </div>

          <div className="mt-10 rounded-xl border border-slate-200 px-4 py-4 text-sm text-slate-500">
            Write a message...
          </div>
        </div>
      </div>
    </main>
  );
}

export default MessagesPage;