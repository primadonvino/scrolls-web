import type {
  AuthSession,
  CreatePostResponse,
  FeedResponse,
  NotificationsResponse,
  ProfileUpdate,
  ScrollsComment,
  ScrollsNotification,
  ScrollsPost,
  ScrollsUser,
  SearchPostsResponse,
  SignupPayload,
  UploadToken
} from "@/lib/types/scrolls";

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

export async function signup(payload: SignupPayload) {
  return request<AuthSession>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      username: payload.username,
      email: payload.email,
      password: payload.password,
      dateOfBirth: payload.dateOfBirth,
      accountType: payload.accountType ?? "personal",
      parentalControls: payload.parentalControls ?? null
    })
  });
}

export async function requestPasswordReset(identifier: string) {
  return request<{ message?: string }>("/auth/password-reset", {
    method: "POST",
    body: JSON.stringify({ identifier })
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

export async function searchUsers(query: string, token?: string) {
  const params = new URLSearchParams({ q: query, limit: "30" });
  return request<ScrollsUser[]>(`/search/users?${params}`, { cache: "no-store" }, token);
}

export async function searchPosts(query: string, token?: string) {
  const params = new URLSearchParams({ q: query, limit: "24" });
  const result = await request<SearchPostsResponse>(`/search/posts?${params}`, { cache: "no-store" }, token);
  return {
    relevant: result.relevant ?? [],
    recent: result.recent ?? []
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

function isWrappedPostResponse(
  value: { post?: ScrollsPost | null } | ScrollsPost
): value is { post?: ScrollsPost | null } {
  return "post" in value;
}

export async function fetchPost(postID: string, token?: string): Promise<ScrollsPost | null> {
  const params = new URLSearchParams({ id: postID });
  const result = await request<{ post?: ScrollsPost | null } | ScrollsPost | null>(
    `/posts/by-id?${params}`,
    { cache: "no-store" },
    token
  );
  if (!result) return null;
  return isWrappedPostResponse(result) ? result.post ?? null : result;
}

export async function createTextPost(authorID: string, textBody: string, token: string) {
  return request<CreatePostResponse>("/posts", {
    method: "POST",
    body: JSON.stringify({
      id: crypto.randomUUID(),
      authorID,
      user_id: authorID,
      type: "text",
      caption: null,
      websiteURL: null,
      locationCity: null,
      textBody,
      assetProvider: null,
      assetBucket: null,
      assetObjectKey: null,
      coverProvider: null,
      coverBucket: null,
      coverObjectKey: null,
      aspectRatio: null,
      createdAt: new Date().toISOString()
    })
  }, token);
}

const POST_MEDIA_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov"
};

/** Upload a photo or video for a post, returning the R2 reference fields. */
export async function uploadPostMedia(
  token: string,
  userID: string,
  file: File
): Promise<{ provider: string; bucket: string; objectKey: string; publicURL: string; contentType: string }> {
  const contentType = file.type || "application/octet-stream";
  const ext = POST_MEDIA_EXT[contentType] ?? "bin";
  const objectKey = `posts/${userID}/${crypto.randomUUID()}.${ext}`;
  const maxBytes = contentType.startsWith("video/") ? 500 * 1024 * 1024 : 25 * 1024 * 1024;
  const uploadToken = await requestUploadToken(token, { contentType, objectKey, maxBytes });
  const publicURL = await uploadFileToR2(uploadToken, file);
  return {
    provider: uploadToken.provider,
    bucket: uploadToken.bucket,
    objectKey: uploadToken.objectKey,
    publicURL,
    contentType
  };
}

export async function createMediaPost(
  params: {
    authorID: string;
    type: "photo" | "video";
    caption?: string | null;
    locationCity?: string | null;
    aspectRatio?: number | null;
    asset: { provider: string; bucket: string; objectKey: string };
    cover?: { provider: string; bucket: string; objectKey: string } | null;
  },
  token: string
) {
  return request<CreatePostResponse>("/posts", {
    method: "POST",
    body: JSON.stringify({
      id: crypto.randomUUID(),
      authorID: params.authorID,
      user_id: params.authorID,
      type: params.type,
      caption: params.caption ?? null,
      websiteURL: null,
      locationCity: params.locationCity ?? null,
      textBody: null,
      assetProvider: params.asset.provider,
      assetBucket: params.asset.bucket,
      assetObjectKey: params.asset.objectKey,
      coverProvider: params.cover?.provider ?? null,
      coverBucket: params.cover?.bucket ?? null,
      coverObjectKey: params.cover?.objectKey ?? null,
      aspectRatio: params.aspectRatio ?? null,
      createdAt: new Date().toISOString()
    })
  }, token);
}

/** Edit the caption (and optionally location) of an owned post. */
export async function updateCaption(
  postID: string,
  authorID: string,
  caption: string | null,
  token: string,
  locationCity?: string | null
) {
  const body: Record<string, unknown> = { postID, authorID, caption };
  if (locationCity !== undefined) body.locationCity = locationCity;
  return request<{ ok: boolean }>("/posts/caption", {
    method: "PATCH",
    body: JSON.stringify(body)
  }, token);
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

export async function fetchComments(postID: string, token?: string) {
  return request<ScrollsComment[]>(`/posts/${encodeURIComponent(postID)}/comments`, { cache: "no-store" }, token);
}

export async function createComment(postID: string, authorID: string, body: string, token: string) {
  return request<{ ok: boolean; id?: string }>("/comments", {
    method: "POST",
    body: JSON.stringify({
      id: crypto.randomUUID(),
      postID,
      authorID,
      body
    })
  }, token);
}

export async function createRescroll(userID: string, originalPostID: string, token: string) {
  return request<{ ok: boolean }>("/rescrolls", {
    method: "POST",
    body: JSON.stringify({ userID, originalPostID })
  }, token);
}

export async function followUser(followerID: string, followeeID: string, token: string) {
  return request<{ ok: boolean; status?: string; requested?: boolean; following?: boolean }>("/follows", {
    method: "POST",
    body: JSON.stringify({ followerID, followeeID })
  }, token);
}

export async function reportContent(
  targetType: string,
  targetID: string,
  reason = "spam",
  token?: string,
  targetOwnerID?: string
) {
  return request<{ ok: boolean }>("/me/content-report", {
    method: "POST",
    body: JSON.stringify({ targetType, targetID, targetOwnerID, reason })
  }, token);
}

export async function deleteCurrentAccount(token: string) {
  return request<{ ok: boolean }>("/users/me", { method: "DELETE" }, token);
}

// ── Notifications ──────────────────────────────────────────────────────────

export async function fetchNotifications(token: string, before?: string | null) {
  const params = new URLSearchParams({ limit: "30" });
  if (before) params.set("before", before);
  return request<NotificationsResponse>(`/me/notifications?${params}`, { cache: "no-store" }, token);
}

export async function markNotificationRead(id: string, token: string, isRead = true) {
  return request<{ ok: boolean; id: string; isRead: boolean }>("/me/mark", {
    method: "POST",
    body: JSON.stringify({ id, isRead })
  }, token);
}

export async function markAllNotificationsRead(token: string) {
  return request<{ ok: boolean }>("/me/read-all", { method: "POST" }, token);
}

export async function deleteReadNotifications(token: string) {
  return request<{ ok: boolean }>("/me/read", { method: "DELETE" }, token);
}

export function unreadNotificationCount(items: ScrollsNotification[]) {
  return items.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);
}

// ── Owner post management (Phase 3) ─────────────────────────────────────────

export async function deletePost(postID: string, authorID: string, token: string) {
  return request<{ ok: boolean }>("/posts/delete", {
    method: "DELETE",
    body: JSON.stringify({ postID, authorID })
  }, token);
}

/** Pin a post to the author's profile, or pass null to clear the pinned post. */
export async function setPinnedPost(userID: string, postID: string | null, token: string) {
  return request<{ ok: boolean }>("/users/pinned-post", {
    method: "PATCH",
    body: JSON.stringify({ userID, postID })
  }, token);
}

// ── Media upload + profile editing (Phase 3) ────────────────────────────────

/**
 * Step 1 of the browser upload flow: ask the backend for a short-lived
 * presigned R2 PUT URL. objectKey must be owner-scoped, e.g.
 * "avatars/<userID>/<uuid>.jpg".
 */
export async function requestUploadToken(
  token: string,
  params: { contentType: string; objectKey: string; maxBytes?: number }
) {
  return request<UploadToken>("/upload-token", {
    method: "POST",
    body: JSON.stringify(params)
  }, token);
}

/**
 * Step 2: PUT the bytes directly to R2 with the headers the token requires.
 * This goes to Cloudflare R2, NOT the Supabase function, so it must not carry
 * the Supabase apikey/Authorization headers.
 */
export async function uploadFileToR2(uploadToken: UploadToken, file: Blob): Promise<string> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(uploadToken.requiredHeaders ?? {})) {
    headers.set(key, value);
  }
  if (!headers.has("Content-Type")) headers.set("Content-Type", uploadToken.contentType);

  const response = await fetch(uploadToken.uploadURL, {
    method: "PUT",
    headers,
    body: file
  });
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}). The media bucket may not allow web uploads yet.`);
  }
  return uploadToken.publicURL;
}

/** Step 3 (avatars) / general profile edits: PATCH the current user's profile. */
export async function updateProfile(token: string, update: ProfileUpdate) {
  return request<ScrollsUser>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(update)
  }, token);
}

/**
 * Convenience for the full avatar flow: request token → PUT to R2 → return the
 * fields the caller should PATCH onto /users/me.
 */
export async function uploadAvatar(
  token: string,
  userID: string,
  file: File
): Promise<{ provider: string; bucket: string; objectKey: string; publicURL: string }> {
  const contentType = file.type || "image/jpeg";
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const objectKey = `avatars/${userID}/${crypto.randomUUID()}.${ext}`;
  const uploadToken = await requestUploadToken(token, { contentType, objectKey });
  const publicURL = await uploadFileToR2(uploadToken, file);
  return {
    provider: uploadToken.provider,
    bucket: uploadToken.bucket,
    objectKey: uploadToken.objectKey,
    publicURL
  };
}
