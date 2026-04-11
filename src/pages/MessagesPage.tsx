function MessagesPage() {
  const conversations = [
    {
      id: 1,
      name: "Coach Elena Rossi",
      preview: "Thanks for sharing your profile.",
      time: "2m",
      active: true,
    },
    {
      id: 2,
      name: "FC Lugano U21",
      preview: "We would like to know more about your experience.",
      time: "1h",
      active: false,
    },
    {
      id: 3,
      name: "Padel Brothers Ticino",
      preview: "Sunday session confirmed.",
      time: "3h",
      active: false,
    },
  ];

  const messages = [
    {
      id: 1,
      sender: "other",
      text: "Hi Nicolas, thanks for sharing your profile.",
    },
    {
      id: 2,
      sender: "me",
      text: "Thank you. Happy to connect and share more details.",
    },
    {
      id: 3,
      sender: "other",
      text: "We are looking for motivated athletes with strong discipline and attitude.",
    },
    {
      id: 4,
      sender: "me",
      text: "That sounds great. I would be happy to send more information and highlights.",
    },
  ];

  return (
    <main className="px-6 py-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Messages</h2>
            <p className="mt-1 text-sm text-slate-500">
              Conversations with coaches, teams, and communities
            </p>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
            />
          </div>

          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`rounded-2xl border p-4 ${
                  conversation.active
                    ? "border-sky-200 bg-sky-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {conversation.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {conversation.preview}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {conversation.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Coach Elena Rossi
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Volleyball Coach · Switzerland
            </p>
          </div>

          <div className="space-y-4 px-6 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.sender === "me"
                    ? "ml-auto bg-sky-100 text-slate-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 px-6 py-5">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Write a message..."
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
              />
              <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default MessagesPage;