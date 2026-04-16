import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Conversation = {
  id: number;
  conversation_type: string;
  created_at: string | null;
  updated_at: string | null;
  last_message_at: string | null;
};

type ConversationParticipantRow = {
  conversation_id: number;
  user_id: string;
  profiles:
    | {
        full_name: string | null;
        role: string | null;
      }
    | {
        full_name: string | null;
        role: string | null;
      }[]
    | null;
};

type Message = {
  id: number;
  conversation_id: number;
  sender_user_id: string;
  body: string;
  created_at: string | null;
};

type ConversationListItem = {
  id: number;
  title: string;
  subtitle: string;
  preview: string;
  timeLabel: string;
  lastMessageAt: string | null;
  otherUserId: string | null;
};

type RpcConversationId = number | string;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatTimeLabel(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  return date.toLocaleDateString();
}

function MessagesPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get("with");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingConversation, setOpeningConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [pageError, setPageError] = useState("");
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<number, Message[]>>({});
  const [draft, setDraft] = useState("");

  useEffect(() => {
    async function loadAuthUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);
    }

    void loadAuthUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    if (!targetUserId) {
      void loadMessagesPage(currentUserId);
      return;
    }

    if (targetUserId === currentUserId) {
      navigate("/messages", { replace: true });
      return;
    }

    let cancelled = false;
    const userId = currentUserId;

    async function openOrCreateConversation() {
      setOpeningConversation(true);
      setPageError("");

      const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
        p_other_user_id: targetUserId,
      });

      if (cancelled) return;

      if (error) {
        console.error("Error opening conversation:", error.message);
        setPageError(`Error opening conversation: ${error.message}`);
        setOpeningConversation(false);
        await loadMessagesPage(userId);
        return;
      }

      const resolvedConversationId = Array.isArray(data)
        ? Number((data[0] as RpcConversationId | undefined) ?? 0)
        : Number((data as RpcConversationId | null) ?? 0);

      await loadMessagesPage(userId);
      setOpeningConversation(false);

      if (resolvedConversationId) {
        navigate(`/messages/${resolvedConversationId}`, { replace: true });
      } else {
        navigate("/messages", { replace: true });
      }
    }

    void openOrCreateConversation();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, targetUserId, navigate]);

  useEffect(() => {
    if (!currentUserId || targetUserId) return;
    if (conversationId) return;
    if (conversations.length === 0) return;

    navigate(`/messages/${conversations[0].id}`, { replace: true });
  }, [currentUserId, targetUserId, conversationId, conversations, navigate]);

  async function loadMessagesPage(userId: string) {
    setLoading(true);
    setPageError("");

    const { data: myParticipantRows, error: myParticipantError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (myParticipantError) {
      console.error("Error loading conversation participants:", myParticipantError.message);
      setPageError(`Chat is not ready yet in this environment. ${myParticipantError.message}`);
      setConversations([]);
      setMessagesByConversation({});
      setLoading(false);
      return;
    }

    const conversationIds = Array.from(
      new Set(((myParticipantRows as { conversation_id: number }[]) || []).map((row) => row.conversation_id))
    );

    if (conversationIds.length === 0) {
      setConversations([]);
      setMessagesByConversation({});
      setLoading(false);
      return;
    }

    const { data: conversationRows, error: conversationError } = await supabase
      .from("conversations")
      .select("id, conversation_type, created_at, updated_at, last_message_at")
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (conversationError) {
      console.error("Error loading conversations:", conversationError.message);
      setPageError(`Error loading conversations: ${conversationError.message}`);
      setConversations([]);
      setMessagesByConversation({});
      setLoading(false);
      return;
    }

    const typedConversations = (conversationRows as Conversation[]) || [];

    const { data: participantRows, error: participantError } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, profiles(full_name, role)")
      .in("conversation_id", conversationIds);

    if (participantError) {
      console.error("Error loading participant rows:", participantError.message);
      setPageError(`Error loading conversation participants: ${participantError.message}`);
      setConversations([]);
      setMessagesByConversation({});
      setLoading(false);
      return;
    }

    const typedParticipantRows = (participantRows as ConversationParticipantRow[]) || [];
    const participantsByConversation = typedParticipantRows.reduce((acc, row) => {
      acc[row.conversation_id] = [...(acc[row.conversation_id] || []), row];
      return acc;
    }, {} as Record<number, ConversationParticipantRow[]>);

    const { data: messageRows, error: messageError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_user_id, body, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    if (messageError) {
      console.error("Error loading messages:", messageError.message);
      setPageError(`Error loading messages: ${messageError.message}`);
      setConversations([]);
      setMessagesByConversation({});
      setLoading(false);
      return;
    }

    const typedMessages = (messageRows as Message[]) || [];
    const groupedMessages = typedMessages.reduce((acc, row) => {
      acc[row.conversation_id] = [...(acc[row.conversation_id] || []), row];
      return acc;
    }, {} as Record<number, Message[]>);

    const conversationItems: ConversationListItem[] = typedConversations.map((conversation) => {
      const participants = participantsByConversation[conversation.id] || [];
      const otherParticipant = participants.find((participant) => participant.user_id !== userId) || null;
      const otherProfile = firstRelation(otherParticipant?.profiles);
      const conversationMessages = groupedMessages[conversation.id] || [];
      const latestMessage = conversationMessages[conversationMessages.length - 1] || null;
      const latestTimestamp = latestMessage?.created_at || conversation.last_message_at || conversation.created_at;

      return {
        id: conversation.id,
        title: otherProfile?.full_name || "Asobu member",
        subtitle: otherProfile?.role || "Member on Asobu",
        preview: latestMessage?.body || "No messages yet. Start the conversation.",
        timeLabel: formatTimeLabel(latestTimestamp),
        lastMessageAt: latestTimestamp,
        otherUserId: otherParticipant?.user_id || null,
      };
    });

    setConversations(conversationItems);
    setMessagesByConversation(groupedMessages);
    setLoading(false);
  }

  const activeConversationId = Number(conversationId || conversations[0]?.id || 0) || null;
  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );
  const activeMessages = activeConversationId ? messagesByConversation[activeConversationId] || [] : [];

  async function handleSendMessage() {
    if (!currentUserId || !activeConversationId || !draft.trim()) return;

    setSending(true);
    setPageError("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      sender_user_id: currentUserId,
      body: draft.trim(),
    });

    if (error) {
      console.error("Error sending message:", error.message);
      setPageError(`Error sending message: ${error.message}`);
      setSending(false);
      return;
    }

    setDraft("");
    await loadMessagesPage(currentUserId);
    setSending(false);
  }

  return (
    <main className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <section className="rounded-[32px] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Inbox</h2>
                
              </div>

            </div>

            {pageError && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {pageError}
              </div>
            )}

            {openingConversation && (
              <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                Opening conversation...
              </div>
            )}

            {loading ? (
              <p className="text-sm text-slate-500">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 p-6 text-center">
                <h3 className="text-lg font-semibold text-slate-900">No conversations yet</h3>
                <div className="mt-4">
                  <Link to="/discover" className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                    Go to discover
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === activeConversationId;
                  return (
                    <Link
                      key={conversation.id}
                      to={`/messages/${conversation.id}`}
                      className={`block rounded-[20px] p-3 transition ${
                        isActive ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold">{conversation.title}</h3>
                          <p className={`mt-1 text-xs uppercase tracking-[0.16em] ${isActive ? "text-white/60" : "text-slate-400"}`}>
                            {conversation.subtitle}
                          </p>
                          <p className={`mt-2 truncate text-sm ${isActive ? "text-white/85" : "text-slate-600"}`}>
                            {conversation.preview}
                          </p>
                        </div>
                        <span className={`shrink-0 text-xs ${isActive ? "text-white/70" : "text-slate-400"}`}>{conversation.timeLabel}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-[32px] bg-white shadow-sm">
            {loading ? (
              <div className="p-6 text-sm text-slate-500">Loading thread...</div>
            ) : !activeConversation ? (
              <div className="flex min-h-[500px] items-center justify-center p-8 text-center">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Select a conversation</h2>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{activeConversation.title}</h2>

                    </div>

                    {activeConversation.otherUserId && (
                      <Link
                        to={`/profiles/${activeConversation.otherUserId}`}
                        className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open profile
                      </Link>
                    )}
                  </div>
                </div>

                <div className="min-h-[380px] space-y-4 px-6 py-6">
                  {activeMessages.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
No messages yet.
                    </div>
                  ) : (
                    activeMessages.map((message) => {
                      const isMine = message.sender_user_id === currentUserId;
                      return (
                        <div
                          key={message.id}
                          className={`max-w-[78%] rounded-[24px] px-4 py-3 text-sm leading-7 shadow-sm ${
                            isMine ? "ml-auto bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <p>{message.body}</p>
                          <p className={`mt-2 text-[11px] ${isMine ? "text-white/70" : "text-slate-400"}`}>
                            {message.created_at ? new Date(message.created_at).toLocaleString() : "Just now"}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-slate-100 bg-white px-6 py-5">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Write a message..."
                      className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
                    />
                    <button type="button"
                      onClick={handleSendMessage}
                      disabled={sending || !draft.trim()}
                      className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default MessagesPage;
