import type { ScrollsUser } from "@/lib/types/scrolls";

/** Mirrors iOS `UserProfile.isGoldTier`: the Gold subscription plan codes. */
export function isGoldTier(user?: ScrollsUser | null): boolean {
  const plan = (user?.subscriptionPlan ?? user?.subscription_plan ?? "").trim().toLowerCase();
  return plan === "02" || plan === "scrolls.gold.monthly";
}

export type AccountTier = "free" | "blue" | "gold";

/**
 * Resolves a user's tier the way iOS `currentVideoUploadPolicy` does: Gold for
 * founder / gold-tier; Blue for verified or any active subscription; otherwise
 * Free.
 */
export function accountTier(user?: ScrollsUser | null): AccountTier {
  if (!user) return "free";
  const founder = user.isFounder ?? user.is_founder ?? false;
  if (founder || isGoldTier(user)) return "gold";
  const verified = user.isVerified ?? user.is_verified ?? false;
  const plan = (user.subscriptionPlan ?? user.subscription_plan ?? "").trim();
  if (verified || plan.length > 0) return "blue";
  return "free";
}

/**
 * Per-tier video duration caps, mirroring iOS MediaStorage video upload
 * policies (free 7s, blue 60s, gold 10min). iOS's byte caps are
 * post-compression targets; the web uploads raw, so we gate on duration.
 */
export const VIDEO_POLICY: Record<AccountTier, { maxDurationSeconds: number; tierLabel: string }> = {
  free: { maxDurationSeconds: 7, tierLabel: "Free" },
  blue: { maxDurationSeconds: 60, tierLabel: "Blue" },
  gold: { maxDurationSeconds: 600, tierLabel: "Gold" }
};

export function videoPolicy(user?: ScrollsUser | null) {
  return VIDEO_POLICY[accountTier(user)];
}

/**
 * Blue+ benefits (verified, founder, gold, or any subscription) — mirrors iOS
 * `hasSubscriberBenefits` / `canWriteArticle` / `canUploadMusic` /
 * `canUploadPodcastAudio`, which all gate to a non-free tier. Used to gate
 * podcasts, articles, music releases, and multi-photo carousels.
 */
export function hasSubscriberBenefits(user?: ScrollsUser | null): boolean {
  return accountTier(user) !== "free";
}

/** Multi-photo carousels are a Blue+ benefit (iOS `isCarouselEligible`). */
export function canPostCarousel(user?: ScrollsUser | null): boolean {
  return hasSubscriberBenefits(user);
}
