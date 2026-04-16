import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Phone,
  Video,
  MoreHorizontal,
  Send,
  Paperclip,
  Smile,
  LoaderCircle,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import {
  fetchConversationMessages,
  fetchConversationSummaries,
  markConversationRead,
  sendConversationMessage,
  subscribeToMessages,
  type ConversationSummary,
  type MessageRow,
} from "@/lib/messages";
import { getStoredSupabaseSession, getSupabaseConfig, type SupabaseSession } from "@/lib/supabase";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
});

function formatShortRelative(isoDate: string) {
  const timestamp = new Date(isoDate).getTime();
  const diff = Date.now() - timestamp;

  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))}h`;
  return `${Math.max(1, Math.floor(diff / 86_400_000))}d`;
}

function formatMessageTime(isoDate: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function avatarLetters(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "AS";
}

function displayName(summary: ConversationSummary) {
  return summary.conversation.title || summary.otherParticipant?.full_name || summary.otherParticipant?.username || "Untitled thread";
}

function displayHandle(summary: ConversationSummary) {
  const username = summary.otherParticipant?.username;
  if (username) return `@${username}`;
  return summary.conversation.kind === "organization" ? "Organization" : summary.otherParticipant?.primary_role || "Direct message";
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary glow-brand-sm">
          <MessageCircle className="h-5 w-5" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function MessagesPage() {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isConfigured } = getSupabaseConfig();

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const filteredConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return conversations;

    return conversations.filter((conversation) => {
      const name = displayName(conversation).toLowerCase();
      const handle = displayHandle(conversation).toLowerCase();
      const lastMessage = conversation.lastMessage?.body.toLowerCase() ?? "";
      return name.includes(normalizedQuery) || handle.includes(normalizedQuery) || lastMessage.includes(normalizedQuery);
    });
  }, [conversations, searchQuery]);

  useEffect(() => {
    const storedSession = getStoredSupabaseSession();
    setSession(storedSession);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadConversations(activeSession: SupabaseSession) {
      setIsLoading(true);
      setError(null);

      try {
        const nextConversations = await fetchConversationSummaries(activeSession);

        if (isCancelled) return;

        setConversations(nextConversations);
        setSelectedConversationId((current) => {
          if (current && nextConversations.some((conversation) => conversation.conversation.id === current)) {
            return current;
          }
          return nextConversations[0]?.conversation.id ?? null;
        });
      } catch (loadError) {
        if (isCancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    if (!session || !isConfigured) {
      setIsLoading(false);
      return;
    }

    loadConversations(session);

    return () => {
      isCancelled = true;
    };
  }, [session, isConfigured]);

  useEffect(() => {
    let isCancelled = false;

    async function loadMessages(activeSession: SupabaseSession, conversationId: string) {
      setIsLoadingMessages(true);
      setError(null);

      try {
        const nextMessages = await fetchConversationMessages(activeSession, conversationId);
        if (isCancelled) return;
        setMessages(nextMessages);
        await markConversationRead(activeSession, conversationId);
        if (isCancelled) return;
        setConversations((current) =>
          current.map((conversation) =>
            conversation.conversation.id === conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
      } catch (loadError) {
        if (isCancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to open this conversation.");
      } finally {
        if (!isCancelled) {
          setIsLoadingMessages(false);
        }
      }
    }

    if (!session || !selectedConversationId) {
      setMessages([]);
      return;
    }

    loadMessages(session, selectedConversationId);

    return () => {
      isCancelled = true;
    };
  }, [session, selectedConversationId]);

  useEffect(() => {
    if (!session) return;

    return subscribeToMessages(
      session,
      (incomingMessage) => {
        setConversations((current) => {
          const matchingConversation = current.find(
            (conversation) => conversation.conversation.id === incomingMessage.conversation_id,
          );

          if (!matchingConversation) {
            return current;
          }

          const nextUnreadCount =
            incomingMessage.sender_id === session.user.id || selectedConversationId === incomingMessage.conversation_id
              ? 0
              : matchingConversation.unreadCount + 1;

          const nextItems = current.map((conversation) =>
            conversation.conversation.id === incomingMessage.conversation_id
              ? {
                  ...conversation,
                  conversation: {
                    ...conversation.conversation,
                    updated_at: incomingMessage.created_at,
                  },
                  lastMessage: incomingMessage,
                  unreadCount: nextUnreadCount,
                  online: true,
                }
              : conversation,
          );

          return nextItems.sort((left, right) => {
            const leftTimestamp = left.lastMessage?.created_at ?? left.conversation.updated_at;
            const rightTimestamp = right.lastMessage?.created_at ?? right.conversation.updated_at;
            return new Date(rightTimestamp).getTime() - new Date(leftTimestamp).getTime();
          });
        });

        if (selectedConversationId === incomingMessage.conversation_id) {
          setMessages((current) => {
            if (current.some((message) => message.id === incomingMessage.id)) {
              return current;
            }
            return [...current, incomingMessage];
          });

          void markConversationRead(session, incomingMessage.conversation_id);
        }
      },
      (realtimeError) => {
        setError(realtimeError);
      },
    );
  }, [session, selectedConversationId]);

  async function handleSendMessage() {
    if (!session || !selectedConversationId || !draft.trim() || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);
    const body = draft.trim();

    try {
      const message = await sendConversationMessage(session, selectedConversationId, body);
      setDraft("");
      setMessages((current) => [...current, message]);
      setConversations((current) =>
        current
          .map((conversation) =>
            conversation.conversation.id === selectedConversationId
              ? {
                  ...conversation,
                  conversation: {
                    ...conversation.conversation,
                    updated_at: message.created_at,
                  },
                  lastMessage: message,
                  unreadCount: 0,
                }
              : conversation,
          )
          .sort((left, right) => {
            const leftTimestamp = left.lastMessage?.created_at ?? left.conversation.updated_at;
            const rightTimestamp = right.lastMessage?.created_at ?? right.conversation.updated_at;
            return new Date(rightTimestamp).getTime() - new Date(leftTimestamp).getTime();
          }),
      );
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send the message.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AppLayout>
      <div className="rounded-2xl border border-border bg-card overflow-hidden elevation-1" style={{ height: "calc(100vh - 10rem)" }}>
        <div className="flex h-full">
          <div className="w-80 border-r border-border flex flex-col bg-card">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-heading text-base font-semibold text-foreground">Messages</h2>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-warm/20 bg-warm/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-warm">
                  <Sparkles className="h-3 w-3" />
                  Live
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/40 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!isConfigured ? (
                <EmptyState
                  title="Supabase not connected"
                  description="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to activate live conversations."
                />
              ) : !session ? (
                <EmptyState
                  title="No active session"
                  description="Log in with Supabase Auth first. This page will automatically use the stored session."
                />
              ) : isLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <EmptyState
                  title={conversations.length ? "No matches" : "No conversations yet"}
                  description={conversations.length ? "Try a different search." : "When a coach, player, or organization messages you, it will appear here."}
                />
              ) : (
                filteredConversations.map((conversation) => {
                  const active = conversation.conversation.id === selectedConversationId;
                  const name = displayName(conversation);
                  const handle = displayHandle(conversation);

                  return (
                    <button
                      key={conversation.conversation.id}
                      onClick={() => setSelectedConversationId(conversation.conversation.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left ${
                        active ? "bg-primary/5 border-l-2 border-primary" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full avatar-gradient flex items-center justify-center text-[11px] font-semibold text-primary-foreground overflow-hidden">
                          {conversation.otherParticipant?.avatar_url ? (
                            <img src={conversation.otherParticipant.avatar_url} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            avatarLetters(name)
                          )}
                        </div>
                        {conversation.online ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-foreground truncate">{name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {conversation.lastMessage ? formatShortRelative(conversation.lastMessage.created_at) : "new"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{conversation.lastMessage?.body ?? handle}</p>
                        <p className="text-[10px] text-primary/80 mt-1 truncate">{handle}</p>
                      </div>

                      {conversation.unreadCount > 0 ? (
                        <div className="w-5 h-5 rounded-full bg-warm flex items-center justify-center shrink-0 glow-warm">
                          <span className="text-[10px] font-bold text-warm-foreground">{conversation.unreadCount}</span>
                        </div>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-muted/10">
            {selectedConversation && session ? (
              <>
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full avatar-gradient flex items-center justify-center text-[10px] font-semibold text-primary-foreground overflow-hidden">
                        {selectedConversation.otherParticipant?.avatar_url ? (
                          <img
                            src={selectedConversation.otherParticipant.avatar_url}
                            alt={displayName(selectedConversation)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          avatarLetters(displayName(selectedConversation))
                        )}
                      </div>
                      {selectedConversation.online ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-card" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-foreground truncate">{displayName(selectedConversation)}</h3>
                      <p className="text-[10px] text-primary truncate">
                        {selectedConversation.online ? "Active now" : displayHandle(selectedConversation)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors" type="button">
                      <Phone className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors" type="button">
                      <Video className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors" type="button">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-muted/15">
                  {isLoadingMessages ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyState
                      title="Conversation is ready"
                      description="Send the first message and keep the connection moving."
                    />
                  ) : (
                    messages.map((message) => {
                      const isMine = message.sender_id === session.user.id;

                      return (
                        <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-[13px] shadow-sm ${
                              isMine
                                ? "gradient-brand text-primary-foreground rounded-br-md"
                                : "bg-card border border-border text-foreground rounded-bl-md"
                            }`}
                          >
                            <p className="leading-relaxed">{message.body}</p>
                            <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="px-5 py-3 border-t border-border bg-card">
                  {error ? (
                    <div className="mb-3 rounded-xl border border-warm/20 bg-warm/10 px-3 py-2 text-[12px] text-warm">
                      {error}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors" type="button">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="w-full px-4 py-2.5 rounded-xl bg-muted/30 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground" type="button">
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      className="p-2.5 rounded-xl gradient-brand text-primary-foreground hover:opacity-90 transition-all disabled:opacity-60"
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={!draft.trim() || isSending}
                    >
                      {isSending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                title="Choose a conversation"
                description="Open a player, coach, or organization thread to start chatting live."
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
