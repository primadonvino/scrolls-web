import type { ScrollsPost, ScrollsUser } from "@/lib/types/scrolls";

const mediaBase = "https://media.scrolls-manna.tech";

export function objectURL(bucket?: string | null, objectKey?: string | null) {
  if (!objectKey) return null;
  if (/^https?:\/\//i.test(objectKey)) return objectKey;
  if (bucket && bucket !== "scrolls-media") {
    return `${mediaBase}/${bucket}/${objectKey}`;
  }
  return `${mediaBase}/${objectKey}`;
}

export function userAvatarURL(user?: ScrollsUser | null) {
  if (!user) return null;
  const base =
    user.avatarRef ??
    user.avatar_ref ??
    objectURL(user.avatarBucket ?? user.avatar_bucket, user.avatarObjectKey ?? user.avatar_object_key);
  if (!base) return null;
  // Cache-bust on profile updates so a changed avatar syncs across the web
  // instead of serving a stale cached image.
  const version = user.updatedAt ?? user.updated_at ?? user.writeVersion;
  if (version && !base.includes("?")) return `${base}?v=${encodeURIComponent(String(version))}`;
  return base;
}

/** Normalizes a stored ref/object-key into an absolute media URL. */
export function normalizedAssetURL(ref?: string | null) {
  const trimmed = ref?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${mediaBase}/${trimmed.replace(/^\//, "")}`;
}

/** A profile's looping video avatar, when one is set. */
export function userAvatarVideoURL(user?: ScrollsUser | null) {
  if (!user) return null;
  return normalizedAssetURL(user.avatarVideoRef ?? user.avatar_video_ref);
}

/** A profile's signature image overlay, when one is set. */
export function userSignatureURL(user?: ScrollsUser | null) {
  if (!user) return null;
  return normalizedAssetURL(user.signatureRef ?? user.signature_ref);
}

export function postMediaURL(post: ScrollsPost) {
  const preview = post.mediaPreview;
  return (
    preview?.video?.url ??
    preview?.photo?.fileURL ??
    preview?.photo?.url ??
    preview?.audio?.url ??
    post.assetRef ??
    post.asset_ref ??
    objectURL(post.assetBucket ?? post.asset_bucket, post.assetObjectKey ?? post.asset_object_key)
  );
}

export function postCoverURL(post: ScrollsPost) {
  return (
    post.coverImageRef ??
    post.cover_image_ref ??
    objectURL(post.coverBucket ?? post.cover_bucket, post.coverObjectKey ?? post.cover_object_key) ??
    postMediaURL(post)
  );
}

/**
 * An image-safe thumbnail URL for a post — the cover, or the photo for photo
 * posts. Returns null for videos without a cover (so we don't try to render a
 * video URL inside an <img>) and for text posts.
 */
export function postPosterURL(post: ScrollsPost): string | null {
  const cover =
    post.coverImageRef ??
    post.cover_image_ref ??
    objectURL(post.coverBucket ?? post.cover_bucket, post.coverObjectKey ?? post.cover_object_key);
  if (cover) return cover;
  const type = post.mediaPreview?.type ?? post.type;
  if (type === "photo") {
    const url = postMediaURL(post);
    return url && !/\.(mp4|mov)($|\?)/i.test(url) ? url : null;
  }
  return null;
}
