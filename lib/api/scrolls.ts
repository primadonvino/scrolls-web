import { buildMusicCaption, type MusicReleaseType, type MusicTrack, type MusicTrackCredit } from "@/lib/music/markers";
import type {
  AdDeliveryItem,
  AdSubmission,
  AuthSession,
  CreatePostResponse,
  CuratedAdSlot,
  FeedResponse,
  NotificationsResponse,
  ProfileUpdate,
  ScrollsComment,
  ScrollsNotification,
  ScrollsCircle,
  ScrollsMoment,
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

/** City-scoped feed (GET /search/city-posts), mirroring the app's city selector. */
export async function fetchCityPosts(city: string, token?: string) {
  const params = new URLSearchParams({ city, limit: "60" });
  const result = await request<FeedResponse | ScrollsPost[]>(
    `/search/city-posts?${params}`,
    { cache: "no-store" },
    token
  );
  if (Array.isArray(result)) return { posts: result, nextCursor: null };
  return {
    posts: result.posts ?? result.items ?? [],
    nextCursor: result.nextCursor ?? result.next_cursor ?? null
  };
}

/** Active moments + live sessions for the user's graph (GET /moments). */
export async function fetchMoments(userID?: string, token?: string) {
  const params = new URLSearchParams();
  if (userID) params.set("user_id", userID);
  const qs = params.toString();
  return request<ScrollsMoment[]>(`/moments${qs ? `?${qs}` : ""}`, { cache: "no-store" }, token);
}

/** The signed-in user's circles (GET /me/circles). Returns a plain array. */
export async function fetchCircles(userID?: string, token?: string) {
  const params = new URLSearchParams();
  if (userID) params.set("user_id", userID);
  const qs = params.toString();
  return request<ScrollsCircle[]>(`/me/circles${qs ? `?${qs}` : ""}`, { cache: "no-store" }, token);
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
  // The backend matches author_id case-sensitively on a lowercased UUID
  // (mirrors the iOS/Android clients); not lowercasing returns an empty list.
  const params = new URLSearchParams({ author_id: authorID.toLowerCase(), limit: "40" });
  const result = await request<{ posts?: ScrollsPost[]; items?: ScrollsPost[] } | ScrollsPost[]>(
    `/posts/by-author?${params}`,
    { cache: "no-store" },
    token
  );
  if (Array.isArray(result)) return result;
  return result.posts ?? result.items ?? [];
}

/**
 * Lists a user's rescrolls from the backend (feed-shaped). Throws if the
 * endpoint isn't available so callers can fall back to a direct table read.
 */
export async function fetchRescrollsByAuthor(authorID: string, token?: string): Promise<ScrollsPost[]> {
  const params = new URLSearchParams({ author_id: authorID.toLowerCase(), limit: "60" });
  const result = await request<{ posts?: ScrollsPost[]; items?: ScrollsPost[] } | ScrollsPost[]>(
    `/posts/rescrolls-by-author?${params}`,
    { cache: "no-store" },
    token
  );
  if (Array.isArray(result)) return result;
  return result.posts ?? result.items ?? [];
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

/**
 * Builds per-file progress callbacks that aggregate into one overall fraction
 * across a multi-file upload (file `index` of `total`).
 */
function stepProgress(total: number, onProgress?: UploadProgress) {
  return (index: number): UploadProgress | undefined =>
    onProgress ? (fraction) => onProgress((index + fraction) / total) : undefined;
}

/** Upload a photo or video for a post, returning the R2 reference fields. */
export async function uploadPostMedia(
  token: string,
  userID: string,
  file: File,
  onProgress?: UploadProgress
): Promise<{ provider: string; bucket: string; objectKey: string; publicURL: string; contentType: string }> {
  const contentType = file.type || "application/octet-stream";
  const ext = POST_MEDIA_EXT[contentType] ?? "bin";
  const objectKey = `posts/${userID}/${crypto.randomUUID()}.${ext}`;
  const maxBytes = contentType.startsWith("video/") ? 500 * 1024 * 1024 : 25 * 1024 * 1024;
  const uploadToken = await requestUploadToken(token, { contentType, objectKey, maxBytes });
  const publicURL = await uploadFileToR2(uploadToken, file, onProgress);
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

const AUDIO_EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a"
};

export type MusicTrackUpload = {
  file: File;
  title: string;
  isExplicit: boolean;
  lyrics?: string | null;
  durationSeconds?: number | null;
};

/**
 * Publishes a music post. Mirrors the iOS/Android music flow: upload the cover
 * art + each track's audio to R2 under `music/<owner>/<postId>/…`, assemble the
 * `[MUSIC] …` caption markers, and create a TEXT post with the cover attached.
 * No new backend support is required — it reuses /upload-token and /posts.
 */
export async function createMusicPost(
  params: {
    authorID: string;
    caption?: string | null;
    releaseType?: MusicReleaseType | null;
    releaseDate?: string | null;
    recordLabel?: string | null;
    genre?: string | null;
    linerNotes?: string | null;
    cover: File;
    tracks: MusicTrackUpload[];
  },
  token: string,
  onProgress?: UploadProgress
): Promise<CreatePostResponse> {
  if (!params.tracks.length) throw new Error("Add at least one audio track.");
  const postID = crypto.randomUUID();
  const owner = params.authorID.toLowerCase();
  const step = stepProgress(1 + params.tracks.length, onProgress);

  // Cover art → R2.
  const coverType = params.cover.type || "image/jpeg";
  const coverExt = coverType.includes("png") ? "png" : "jpg";
  const coverToken = await requestUploadToken(token, {
    contentType: coverType,
    objectKey: `music/${owner}/${postID}/cover/${postID}.${coverExt}`,
    maxBytes: 25 * 1024 * 1024
  });
  await uploadFileToR2(coverToken, params.cover, step(0));

  // Each track's audio → R2, collecting public URLs for the caption payload.
  const trackMeta: MusicTrack[] = [];
  for (let index = 0; index < params.tracks.length; index++) {
    const track = params.tracks[index];
    const contentType = track.file.type || "audio/mpeg";
    const ext = AUDIO_EXT[contentType] ?? "m4a";
    const trackToken = await requestUploadToken(token, {
      contentType,
      objectKey: `music/${owner}/${postID}/tracks/${postID}-${index}.${ext}`,
      maxBytes: 60 * 1024 * 1024
    });
    const publicURL = await uploadFileToR2(trackToken, track.file, step(1 + index));
    trackMeta.push({
      id: crypto.randomUUID(),
      title: track.title.trim() || `Track ${index + 1}`,
      audioURL: publicURL,
      durationSeconds: track.durationSeconds ?? null,
      lyrics: track.lyrics?.trim() || null,
      isExplicit: track.isExplicit
    });
  }

  const caption = buildMusicCaption({
    isPodcast: false,
    caption: params.caption ?? null,
    releaseType: params.releaseType ?? null,
    tracks: trackMeta,
    releaseDate: params.releaseDate ?? null,
    recordLabel: params.recordLabel ?? null,
    genre: params.genre ?? null,
    linerNotes: params.linerNotes ?? null
  });

  return request<CreatePostResponse>("/posts", {
    method: "POST",
    body: JSON.stringify({
      id: postID,
      authorID: params.authorID,
      user_id: params.authorID,
      type: "text",
      caption,
      websiteURL: null,
      locationCity: null,
      textBody: null,
      assetProvider: null,
      assetBucket: null,
      assetObjectKey: null,
      coverProvider: coverToken.provider,
      coverBucket: coverToken.bucket,
      coverObjectKey: coverToken.objectKey,
      aspectRatio: null,
      createdAt: new Date().toISOString()
    })
  }, token);
}

/**
 * Publishes a podcast. Mirrors the iOS `publishPodcast` flow: the audio is the
 * post asset (type "audio"), the caption is `[PODCAST] {title}`, and the cover
 * art goes in the cover fields. No new backend support.
 */
export async function createPodcastPost(
  params: { authorID: string; caption?: string | null; cover: File; audio: File },
  token: string,
  onProgress?: UploadProgress
): Promise<CreatePostResponse> {
  const postID = crypto.randomUUID();
  const owner = params.authorID.toLowerCase();
  const step = stepProgress(2, onProgress);

  const coverType = params.cover.type || "image/jpeg";
  const coverExt = coverType.includes("png") ? "png" : "jpg";
  const coverToken = await requestUploadToken(token, {
    contentType: coverType,
    objectKey: `posts/${owner}/${postID}/cover/${postID}.${coverExt}`,
    maxBytes: 25 * 1024 * 1024
  });
  await uploadFileToR2(coverToken, params.cover, step(0));

  const audioType = params.audio.type || "audio/mpeg";
  const audioExt = AUDIO_EXT[audioType] ?? "m4a";
  const assetToken = await requestUploadToken(token, {
    contentType: audioType,
    objectKey: `posts/${owner}/${postID}/asset/${postID}.${audioExt}`,
    maxBytes: 200 * 1024 * 1024
  });
  await uploadFileToR2(assetToken, params.audio, step(1));

  const caption = buildMusicCaption({ isPodcast: true, caption: params.caption ?? null, tracks: [] });

  return request<CreatePostResponse>("/posts", {
    method: "POST",
    body: JSON.stringify({
      id: postID,
      authorID: params.authorID,
      user_id: params.authorID,
      type: "audio",
      caption,
      websiteURL: null,
      locationCity: null,
      textBody: null,
      assetProvider: assetToken.provider,
      assetBucket: assetToken.bucket,
      assetObjectKey: assetToken.objectKey,
      coverProvider: coverToken.provider,
      coverBucket: coverToken.bucket,
      coverObjectKey: coverToken.objectKey,
      aspectRatio: null,
      createdAt: new Date().toISOString()
    })
  }, token);
}

export type ArticleBlockInput = { id: string; kind: "paragraph" | "subheadline" | "sectionHeading"; text: string };

/**
 * Publishes a long-form article. Mirrors the iOS/Android flow: upload the cover,
 * encode the payload into the text body behind `[ARTICLE_JSON]`, and create a
 * TEXT post captioned `[ARTICLE] {headline}`.
 */
export async function createArticlePost(
  params: { authorID: string; headline: string; blocks: ArticleBlockInput[]; cover: File },
  token: string,
  onProgress?: UploadProgress
): Promise<CreatePostResponse> {
  const headline = params.headline.trim();
  if (!headline) throw new Error("Articles need a headline.");
  const blocks = params.blocks
    .map((block) => ({ ...block, text: block.text.trim() }))
    .filter((block) => block.text.length > 0);
  if (!blocks.length) throw new Error("Articles need content.");

  const postID = crypto.randomUUID();
  const owner = params.authorID.toLowerCase();

  const coverType = params.cover.type || "image/jpeg";
  const coverExt = coverType.includes("png") ? "png" : "jpg";
  const coverToken = await requestUploadToken(token, {
    contentType: coverType,
    objectKey: `posts/${owner}/${postID}/cover/${postID}.${coverExt}`,
    maxBytes: 25 * 1024 * 1024
  });
  const coverURL = await uploadFileToR2(coverToken, params.cover, onProgress);

  const textBody = `[ARTICLE_JSON]${JSON.stringify({
    headline,
    blocks,
    coverImageRef: coverURL,
    coverImageAspectRatio: null
  })}`;

  return request<CreatePostResponse>("/posts", {
    method: "POST",
    body: JSON.stringify({
      id: postID,
      authorID: params.authorID,
      user_id: params.authorID,
      type: "text",
      caption: `[ARTICLE] ${headline}`,
      websiteURL: null,
      locationCity: null,
      textBody,
      assetProvider: null,
      assetBucket: null,
      assetObjectKey: null,
      coverProvider: coverToken.provider,
      coverBucket: coverToken.bucket,
      coverObjectKey: coverToken.objectKey,
      aspectRatio: null,
      createdAt: new Date().toISOString()
    })
  }, token);
}

export type MusicTrackEdit = {
  /** Stable id of an existing track; omitted/null for newly added tracks. */
  id?: string | null;
  title: string;
  isExplicit: boolean;
  lyrics?: string | null;
  durationSeconds?: number | null;
  /** New audio file to upload (added or replacement track). */
  file?: File | null;
  /** Existing track's audio URL, kept when no new file is supplied. */
  existingAudioURL?: string | null;
  /** Featured-artist credits, preserved through edits (set on iOS). */
  collaboratorCredits?: MusicTrackCredit[];
};

/**
 * Edits an existing music post. Uploads any newly added track audio to R2,
 * preserves existing tracks' URLs, reassembles the `[MUSIC] …` caption, and
 * saves it through the already-wired /posts/caption PATCH. Cover art is left
 * unchanged (no cover-replacement endpoint is wired on web yet).
 */
export async function updateMusicPost(
  params: {
    postID: string;
    authorID: string;
    caption?: string | null;
    releaseType?: MusicReleaseType | null;
    releaseDate?: string | null;
    recordLabel?: string | null;
    genre?: string | null;
    linerNotes?: string | null;
    tracks: MusicTrackEdit[];
  },
  token: string
): Promise<{ ok: boolean }> {
  if (!params.tracks.length) throw new Error("A release needs at least one track.");
  const owner = params.authorID.toLowerCase();

  const trackMeta: MusicTrack[] = [];
  for (const track of params.tracks) {
    let audioURL = track.existingAudioURL ?? null;
    if (track.file) {
      const contentType = track.file.type || "audio/mpeg";
      const ext = AUDIO_EXT[contentType] ?? "m4a";
      const trackToken = await requestUploadToken(token, {
        contentType,
        objectKey: `music/${owner}/${params.postID}/tracks/${crypto.randomUUID()}.${ext}`,
        maxBytes: 60 * 1024 * 1024
      });
      audioURL = await uploadFileToR2(trackToken, track.file);
    }
    trackMeta.push({
      id: track.id || crypto.randomUUID(),
      title: track.title.trim() || "Untitled",
      audioURL,
      durationSeconds: track.durationSeconds ?? null,
      lyrics: track.lyrics?.trim() || null,
      isExplicit: track.isExplicit,
      collaboratorCredits: track.collaboratorCredits
    });
  }

  const caption = buildMusicCaption({
    isPodcast: false,
    caption: params.caption ?? null,
    releaseType: params.releaseType ?? null,
    tracks: trackMeta,
    releaseDate: params.releaseDate ?? null,
    recordLabel: params.recordLabel ?? null,
    genre: params.genre ?? null,
    linerNotes: params.linerNotes ?? null
  });

  return updateCaption(params.postID, params.authorID, caption, token);
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

export async function createComment(
  postID: string,
  authorID: string,
  body: string,
  token: string,
  parentCommentID?: string | null
) {
  return request<{ ok: boolean; id?: string }>("/comments", {
    method: "POST",
    body: JSON.stringify({
      id: crypto.randomUUID(),
      postID,
      authorID,
      parentCommentID: parentCommentID ?? null,
      body
    })
  }, token);
}

export async function likeComment(commentID: string, userID: string, token: string) {
  return request<{ ok: boolean }>("/comments/like", {
    method: "POST",
    body: JSON.stringify({ commentID, userID })
  }, token);
}

export async function unlikeComment(commentID: string, userID: string, token: string) {
  return request<{ ok: boolean }>("/comments/unlike", {
    method: "POST",
    body: JSON.stringify({ commentID, userID })
  }, token);
}

export async function deleteComment(commentID: string, requesterID: string, token: string) {
  return request<{ ok: boolean }>("/comments/delete", {
    method: "DELETE",
    body: JSON.stringify({ commentID, requesterID })
  }, token);
}

/** Decodes the `sub` claim from a JWT — the Supabase auth user id. */
function jwtSubject(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { sub?: string };
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function createRescroll(
  userID: string,
  originalPostID: string,
  token: string,
  quoteText?: string | null
) {
  // The /rescrolls function strictly requires userID === the token's auth id,
  // so send the token's own subject (which getUser returns) to avoid any
  // session.user.id mismatch causing an Unauthorized.
  const authedUserID = jwtSubject(token) ?? userID;
  return request<{ ok: boolean }>("/rescrolls", {
    method: "POST",
    body: JSON.stringify({ userID: authedUserID, originalPostID, quoteText: quoteText?.trim() || null })
  }, token);
}

export async function followUser(followerID: string, followeeID: string, token: string) {
  return request<{ ok: boolean; status?: string; requested?: boolean; following?: boolean }>("/follows", {
    method: "POST",
    body: JSON.stringify({ followerID, followeeID })
  }, token);
}

export async function unfollowUser(followerID: string, followeeID: string, token: string) {
  return request<{ ok: boolean; required?: boolean }>("/follows/delete", {
    method: "DELETE",
    body: JSON.stringify({ followerID, followeeID })
  }, token);
}

export async function respondToFollowRequest(followeeID: string, followerID: string, accept: boolean, token: string) {
  return request<{ ok: boolean; status?: string }>("/follows/respond", {
    method: "POST",
    body: JSON.stringify({ followeeID, followerID, accept })
  }, token);
}

export async function fetchFollowing(userID: string, token?: string) {
  const params = new URLSearchParams({ user_id: userID });
  return request<ScrollsUser[]>(`/me/following?${params}`, { cache: "no-store" }, token);
}

export async function fetchFollowers(userID: string, token?: string) {
  const params = new URLSearchParams({ user_id: userID });
  return request<ScrollsUser[]>(`/me/followers?${params}`, { cache: "no-store" }, token);
}

export async function fetchFollowRequests(token: string) {
  return request<ScrollsUser[]>("/me/follow-requests", { cache: "no-store" }, token);
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

// ── Ads / Founder terminal ─────────────────────────────────────────────────

export async function fetchAdDelivery(city?: string | null, token?: string, limit = 8) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (city) params.set("city", city);
  return request<AdDeliveryItem[]>(`/ads/delivery?${params}`, { cache: "no-store" }, token);
}

export async function fetchAdSubmissions(
  token: string,
  filters: {
    status?: string;
    city?: string;
    businessUserID?: string;
    minReportCount?: number;
    limit?: number;
  } = {}
) {
  const params = new URLSearchParams({ limit: String(filters.limit ?? 80) });
  if (filters.status) params.set("status", filters.status);
  if (filters.city) params.set("city", filters.city);
  if (filters.businessUserID) params.set("business_user_id", filters.businessUserID);
  if (filters.minReportCount != null) params.set("min_report_count", String(filters.minReportCount));
  return request<AdSubmission[]>(`/ads/submissions?${params}`, { cache: "no-store" }, token);
}

export async function reviewAdSubmission(
  submissionID: string,
  status: "approved" | "rejected" | "paused",
  token: string,
  reviewNotes?: string
) {
  return request<AdSubmission>(`/ads/${encodeURIComponent(submissionID)}/review`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      reviewNotes: reviewNotes?.trim() || undefined
    })
  }, token);
}

export async function fetchCuratedAdSlots(token: string) {
  return request<CuratedAdSlot[]>("/ads/curated-slots", { cache: "no-store" }, token);
}

export async function updateCuratedAdSlots(slots: Array<{ slotIndex: number; postID: string | null }>, token: string) {
  return request<CuratedAdSlot[]>("/ads/curated-slots", {
    method: "POST",
    body: JSON.stringify({ slots })
  }, token);
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

/** Reports upload progress as a fraction in [0, 1]. */
export type UploadProgress = (fraction: number) => void;

/**
 * Step 2: PUT the bytes directly to R2 with the headers the token requires.
 * This goes to Cloudflare R2, NOT the Supabase function, so it must not carry
 * the Supabase apikey/Authorization headers. Uses XMLHttpRequest so callers can
 * show real upload progress (fetch can't report request-body progress).
 */
export function uploadFileToR2(
  uploadToken: UploadToken,
  file: Blob,
  onProgress?: UploadProgress
): Promise<string> {
  const headers: Record<string, string> = { ...(uploadToken.requiredHeaders ?? {}) };
  if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
    headers["Content-Type"] = uploadToken.contentType;
  }

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadToken.uploadURL, true);
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve(uploadToken.publicURL);
      } else {
        reject(new Error(`Upload failed (${xhr.status}). The media bucket may not allow web uploads yet.`));
      }
    };
    // A failed cross-origin PUT (no readable status) is almost always the R2
    // bucket's CORS policy not allowing PUT from this web origin.
    xhr.onerror = () =>
      reject(
        new Error(
          "Couldn't upload the media: the storage bucket blocked the request (CORS). " +
            "The R2 bucket needs to allow PUT uploads from scrolls.adastra.love."
        )
      );
    xhr.ontimeout = () => reject(new Error("Upload timed out — try a smaller file or a faster connection."));
    xhr.send(file);
  });
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
