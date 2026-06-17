export type UUID = string;

export type ScrollsUser = {
  id: UUID;
  username: string;
  displayName?: string;
  display_name?: string;
  bio?: string;
  avatarRef?: string;
  avatar_ref?: string;
  avatarProvider?: string;
  avatar_provider?: string;
  avatarBucket?: string;
  avatar_bucket?: string;
  avatarObjectKey?: string;
  avatar_object_key?: string;
  isVerified?: boolean;
  is_verified?: boolean;
  isFounder?: boolean;
  is_founder?: boolean;
  subscriptionPlan?: string | null;
  subscription_plan?: string | null;
  homeCity?: string | null;
  home_city?: string | null;
  websiteURL?: string | null;
  website_url?: string | null;
  venmoURL?: string | null;
  venmo_url?: string | null;
  cashAppURL?: string | null;
  cashappURL?: string | null;
  cashapp_url?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  writeVersion?: string | null;
};

export type UploadToken = {
  provider: string;
  bucket: string;
  objectKey: string;
  contentType: string;
  uploadURL: string;
  publicURL: string;
  maxBytes?: number;
  expiresAt?: string;
  requiredHeaders?: Record<string, string>;
};

export type ProfileUpdate = {
  displayName?: string;
  bio?: string;
  websiteURL?: string | null;
  homeCity?: string | null;
  venmoURL?: string | null;
  cashAppURL?: string | null;
  avatarProvider?: string;
  avatarBucket?: string;
  avatarObjectKey?: string;
  expectedWriteVersion?: string;
};

export type ScrollsPost = {
  id: UUID;
  type: "text" | "photo" | "video" | "audio" | "article" | "rescroll" | string;
  caption?: string | null;
  textBody?: string | null;
  text_body?: string | null;
  websiteURL?: string | null;
  website_url?: string | null;
  locationCity?: string | null;
  location_city?: string | null;
  assetRef?: string | null;
  asset_ref?: string | null;
  assetProvider?: string | null;
  asset_provider?: string | null;
  assetBucket?: string | null;
  asset_bucket?: string | null;
  assetObjectKey?: string | null;
  asset_object_key?: string | null;
  coverImageRef?: string | null;
  cover_image_ref?: string | null;
  aspectRatio?: number | null;
  aspect_ratio?: number | null;
  createdAt?: string;
  created_at?: string;
  author?: ScrollsUser;
  user?: ScrollsUser;
  comments?: unknown[];
  mediaPreview?: {
    type?: string;
    photo?: { fileURL?: string; url?: string; aspectRatio?: number };
    video?: { url?: string; aspectRatio?: number };
    audio?: { url?: string };
    text?: { cachedText?: string };
  };
};

export type ScrollsComment = {
  id: UUID;
  author: ScrollsUser;
  body: string;
  createdAt?: string;
  created_at?: string;
  likedBy?: UUID[];
  liked_by?: UUID[];
  replies?: ScrollsComment[];
};

export type AuthSession = {
  token: string;
  refresh_token?: string;
  refreshToken?: string;
  user: ScrollsUser;
};

export type FeedResponse = {
  posts?: ScrollsPost[];
  items?: ScrollsPost[];
  nextCursor?: string | null;
  next_cursor?: string | null;
};

export type SearchPostsResponse = {
  relevant?: ScrollsPost[];
  recent?: ScrollsPost[];
};

export type CreatePostResponse = {
  ok: boolean;
  id?: UUID;
  idempotent?: boolean;
};
