export interface SupabaseSessionUser {
  id: string;
  email?: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: SupabaseSessionUser;
}

function parseSessionCandidate(raw: string | null): SupabaseSession | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const objectCandidate = parsed as Record<string, unknown>;
    const directSession = normalizeSessionShape(objectCandidate);
    if (directSession) return directSession;

    const nestedCurrentSession = normalizeSessionShape(objectCandidate.currentSession);
    if (nestedCurrentSession) return nestedCurrentSession;

    const nestedSession = normalizeSessionShape(objectCandidate.session);
    if (nestedSession) return nestedSession;
  } catch {
    return null;
  }

  return null;
}

function normalizeSessionShape(candidate: unknown): SupabaseSession | null {
  if (!candidate || typeof candidate !== "object") return null;

  const session = candidate as Record<string, unknown>;
  const accessToken = typeof session.access_token === "string" ? session.access_token : null;
  const user = session.user && typeof session.user === "object" ? (session.user as Record<string, unknown>) : null;
  const userId = user && typeof user.id === "string" ? user.id : null;

  if (!accessToken || !userId) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: typeof session.refresh_token === "string" ? session.refresh_token : undefined,
    expires_at: typeof session.expires_at === "number" ? session.expires_at : undefined,
    user: {
      id: userId,
      email: typeof user?.email === "string" ? user.email : undefined,
    },
  };
}

export function getStoredSupabaseSession(): SupabaseSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const explicitKeys = [
    "asobu.supabase.session",
    "supabase.auth.token",
  ];

  for (const key of explicitKeys) {
    const parsed = parseSessionCandidate(window.localStorage.getItem(key));
    if (parsed) return parsed;
  }

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;

    const looksLikeSupabaseAuthKey =
      key.includes("supabase.auth.token") ||
      (key.startsWith("sb-") && key.endsWith("-auth-token"));

    if (!looksLikeSupabaseAuthKey) continue;

    const parsed = parseSessionCandidate(window.localStorage.getItem(key));
    if (parsed) return parsed;
  }

  return null;
}

export function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}

export function createSupabaseHeaders(session?: SupabaseSession, includeJson = true): HeadersInit {
  const { anonKey } = getSupabaseConfig();

  const headers: Record<string, string> = {
    apikey: anonKey ?? "",
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function supabaseRestFetch<T>(
  path: string,
  init: RequestInit = {},
  session?: SupabaseSession,
): Promise<T> {
  const { url, isConfigured } = getSupabaseConfig();

  if (!isConfigured || !url) {
    throw new Error("Supabase environment variables are missing.");
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...createSupabaseHeaders(session, init.body !== undefined || init.method !== "GET"),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function buildRealtimeUrl(): string {
  const { url, anonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured || !url || !anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const websocketBase = url.replace(/^http/i, "ws");
  return `${websocketBase}/realtime/v1/websocket?apikey=${encodeURIComponent(anonKey)}&vsn=1.0.0`;
}
