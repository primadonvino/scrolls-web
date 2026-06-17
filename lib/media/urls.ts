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
  return (
    user.avatarRef ??
    user.avatar_ref ??
    objectURL(user.avatarBucket ?? user.avatar_bucket, user.avatarObjectKey ?? user.avatar_object_key)
  );
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
