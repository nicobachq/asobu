import { buildRealtimeUrl, getSupabaseConfig, supabaseRestFetch, type SupabaseSession } from "@/lib/supabase";

export interface ConversationRow {
  id: string;
  kind: "direct" | "group" | "organization";
  title: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipantRow {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  primary_role: string | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface ConversationSummary {
  conversation: ConversationRow;
  participants: ConversationParticipantRow[];
  profiles: ProfileRow[];
  lastMessage: MessageRow | null;
  unreadCount: number;
  otherParticipant: ProfileRow | null;
  online: boolean;
}

function buildInFilter(values: string[]): string {
  return `in.(${values.join(",")})`;
}

function withSearchParams(base: string, searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, value);
    }
  });

  return `${base}?${params.toString()}`;
}

export async function fetchConversationSummaries(session: SupabaseSession): Promise<ConversationSummary[]> {
  const ownParticipantRows = await supabaseRestFetch<ConversationParticipantRow[]>(
    withSearchParams("conversation_participants", {
      select: "conversation_id,user_id,joined_at,last_read_at",
      user_id: `eq.${session.user.id}`,
    }),
    { method: "GET" },
    session,
  );

  if (!ownParticipantRows.length) {
    return [];
  }

  const conversationIds = [...new Set(ownParticipantRows.map((row) => row.conversation_id))];

  const [conversations, allParticipants, messages] = await Promise.all([
    supabaseRestFetch<ConversationRow[]>(
      withSearchParams("conversations", {
        select: "id,kind,title,created_by,created_at,updated_at",
        id: buildInFilter(conversationIds),
        order: "updated_at.desc",
      }),
      { method: "GET" },
      session,
    ),
    supabaseRestFetch<ConversationParticipantRow[]>(
      withSearchParams("conversation_participants", {
        select: "conversation_id,user_id,joined_at,last_read_at",
        conversation_id: buildInFilter(conversationIds),
      }),
      { method: "GET" },
      session,
    ),
    supabaseRestFetch<MessageRow[]>(
      withSearchParams("messages", {
        select: "id,conversation_id,sender_id,body,created_at",
        conversation_id: buildInFilter(conversationIds),
        order: "created_at.desc",
      }),
      { method: "GET" },
      session,
    ),
  ]);

  const profileIds = [...new Set(allParticipants.map((row) => row.user_id))];
  const profiles = profileIds.length
    ? await supabaseRestFetch<ProfileRow[]>(
        withSearchParams("profiles", {
          select: "id,full_name,username,avatar_url,primary_role",
          id: buildInFilter(profileIds),
        }),
        { method: "GET" },
        session,
      )
    : [];

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const participantMap = new Map<string, ConversationParticipantRow[]>();
  const messagesMap = new Map<string, MessageRow[]>();
  const ownParticipantMap = new Map(ownParticipantRows.map((row) => [row.conversation_id, row]));

  allParticipants.forEach((row) => {
    const currentRows = participantMap.get(row.conversation_id) ?? [];
    currentRows.push(row);
    participantMap.set(row.conversation_id, currentRows);
  });

  messages.forEach((row) => {
    const currentRows = messagesMap.get(row.conversation_id) ?? [];
    currentRows.push(row);
    messagesMap.set(row.conversation_id, currentRows);
  });

  return conversations
    .map((conversation) => {
      const participants = participantMap.get(conversation.id) ?? [];
      const orderedMessages = messagesMap.get(conversation.id) ?? [];
      const lastMessage = orderedMessages[0] ?? null;
      const ownParticipant = ownParticipantMap.get(conversation.id);
      const visibleProfiles = participants
        .map((participant) => profileMap.get(participant.user_id))
        .filter((profile): profile is ProfileRow => Boolean(profile));
      const otherParticipant =
        visibleProfiles.find((profile) => profile.id !== session.user.id) ?? visibleProfiles[0] ?? null;

      const unreadCount = orderedMessages.filter((message) => {
        if (message.sender_id === session.user.id) return false;
        if (!ownParticipant?.last_read_at) return true;
        return new Date(message.created_at).getTime() > new Date(ownParticipant.last_read_at).getTime();
      }).length;

      const activeTimestamp = lastMessage?.created_at ?? conversation.updated_at;
      const online = Date.now() - new Date(activeTimestamp).getTime() < 1000 * 60 * 10;

      return {
        conversation,
        participants,
        profiles: visibleProfiles,
        lastMessage,
        unreadCount,
        otherParticipant,
        online,
      } satisfies ConversationSummary;
    })
    .sort((left, right) => {
      const leftTimestamp = left.lastMessage?.created_at ?? left.conversation.updated_at;
      const rightTimestamp = right.lastMessage?.created_at ?? right.conversation.updated_at;
      return new Date(rightTimestamp).getTime() - new Date(leftTimestamp).getTime();
    });
}

export async function fetchConversationMessages(session: SupabaseSession, conversationId: string): Promise<MessageRow[]> {
  return supabaseRestFetch<MessageRow[]>(
    withSearchParams("messages", {
      select: "id,conversation_id,sender_id,body,created_at",
      conversation_id: `eq.${conversationId}`,
      order: "created_at.asc",
    }),
    { method: "GET" },
    session,
  );
}

export async function sendConversationMessage(
  session: SupabaseSession,
  conversationId: string,
  body: string,
): Promise<MessageRow> {
  const [message] = await supabaseRestFetch<MessageRow[]>(
    "messages",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          conversation_id: conversationId,
          sender_id: session.user.id,
          body,
        },
      ]),
    },
    session,
  );

  await markConversationRead(session, conversationId);

  return message;
}

export async function markConversationRead(session: SupabaseSession, conversationId: string): Promise<void> {
  await supabaseRestFetch<void>(
    withSearchParams("conversation_participants", {
      conversation_id: `eq.${conversationId}`,
      user_id: `eq.${session.user.id}`,
    }),
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        last_read_at: new Date().toISOString(),
      }),
    },
    session,
  );
}

export function subscribeToMessages(
  session: SupabaseSession,
  onInsert: (message: MessageRow) => void,
  onError?: (error: string) => void,
) {
  const { isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    return () => undefined;
  }

  const socket = new WebSocket(buildRealtimeUrl());
  let reference = 1;
  let heartbeatTimer: number | undefined;

  const nextRef = () => `${reference++}`;

  const sendFrame = (event: string, payload: Record<string, unknown>, topic = "realtime:public:messages") => {
    socket.send(
      JSON.stringify({
        topic,
        event,
        payload,
        ref: nextRef(),
      }),
    );
  };

  socket.addEventListener("open", () => {
    sendFrame("phx_join", {
      config: {
        broadcast: { ack: false, self: true },
        presence: { key: session.user.id },
        private: false,
        postgres_changes: [
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
        ],
      },
      access_token: session.access_token,
    });

    heartbeatTimer = window.setInterval(() => {
      sendFrame("heartbeat", {}, "phoenix");
    }, 25_000);
  });

  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data) as {
        event?: string;
        payload?: {
          data?: {
            type?: string;
            record?: MessageRow;
          };
          type?: string;
          record?: MessageRow;
          message?: string;
          response?: { message?: string };
        };
      };

      if (payload.event === "postgres_changes") {
        const eventType = payload.payload?.data?.type ?? payload.payload?.type;
        const record = payload.payload?.data?.record ?? payload.payload?.record;

        if (eventType === "INSERT" && record) {
          onInsert(record);
        }
      }

      if (payload.event === "phx_error") {
        onError?.(payload.payload?.message ?? payload.payload?.response?.message ?? "Realtime connection failed.");
      }
    } catch {
      onError?.("Realtime connection returned an invalid payload.");
    }
  });

  socket.addEventListener("error", () => {
    onError?.("Realtime connection failed.");
  });

  return () => {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer);
    }
    socket.close();
  };
}
