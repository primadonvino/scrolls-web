import type { AuthSession, FeedResponse, ScrollsPost, ScrollsUser } from "@/lib/types/scrolls";

const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasAPIConfig() {
  return Boolean(supabaseURL && anonKey && !anonKey.includes("replace-with"));
}

function endpoint(path: string) {
  if (!supabaseURL) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
  return `${supabaseURL.replace(/\/$/, "")}/functions/v1${path}`;
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
  const headers = new Headers(init.headers);
  headers.set("apikey", anonKey);
  headers.set("Authorization", `Bearer ${token ?? anonKey}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(endpoint(path), {
    ...init,
    headers,
    cache: init.method && init.method !== "GET" ? "no-store" : init.cache
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(body?.error ?? body?.message ?? `Scrolls request failed (${response.status}).`);
  }
  return body as T;
}

export async function login(identifier: string, password: string) {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password })
  });
}

export async function refresh(refreshToken: string) {
  return request<AuthSession>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken })
  });
}

export async function fetchFeed(token?: string, userID?: string, cursor?: string | null) {
  const params = new URLSearchParams({ limit: "20" });
  if (userID) params.set("user_id", userID);
  if (cursor) params.set("cursor", cursor);
  const result = await request<FeedResponse | ScrollsPost[]>(`/feed?${params}`, { cache: "no-store" }, token);
  if (Array.isArray(result)) return { posts: result, nextCursor: null };
  return {
    posts: result.posts ?? result.items ?? [],
    nextCursor: result.nextCursor ?? result.next_cursor ?? null
  };
}

export async function fetchProfile(username: string, token?: string) {
  return request<ScrollsUser>(`/users/by-username/${encodeURIComponent(username)}`, { cache: "no-store" }, token);
}

export async function fetchAuthorPosts(authorID: string, token?: string) {
  const params = new URLSearchParams({ author_id: authorID, limit: "40" });
  const result = await request<{ posts?: ScrollsPost[] } | ScrollsPost[]>(`/posts/by-author?${params}`, { cache: "no-store" }, token);
  return Array.isArray(result) ? result : result.posts ?? [];
}

export async function fetchPost(postID: string, token?: string) {
  const params = new URLSearchParams({ id: postID });
  const result = await request<{ post?: ScrollsPost } | ScrollsPost>(`/posts/by-id?${params}`, { cache: "no-store" }, token);
  return "post" in result ? result.post ?? null : result;
}

export async function reportPost(postID: string, reason = "spam", token?: string) {
  return request<{ ok: boolean }>("/posts/report", {
    method: "POST",
    body: JSON.stringify({ postID, reason })
  }, token);
}

export async function blockUser(targetUserID: string, token?: string) {
  return request<{ ok: boolean }>("/me/block", {
    method: "POST",
    body: JSON.stringify({ targetUserID })
  }, token);
}
