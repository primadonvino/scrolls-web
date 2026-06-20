import type { ScrollsUser } from "@/lib/types/scrolls";

/** Mirrors iOS `UserProfile.isGoldTier`: the Gold subscription plan codes. */
export function isGoldTier(user?: ScrollsUser | null): boolean {
  const plan = (user?.subscriptionPlan ?? user?.subscription_plan ?? "").trim().toLowerCase();
  return plan === "02" || plan === "scrolls.gold.monthly";
}

/**
 * Mirrors iOS `CreatePostSheet.isCarouselEligible` (= verified, founder,
 * gold-tier, or any non-empty subscription plan). Free/unverified accounts can
 * only post a single photo — multi-photo carousels require an upgrade.
 */
export function canPostCarousel(user?: ScrollsUser | null): boolean {
  if (!user) return false;
  const verified = user.isVerified ?? user.is_verified ?? false;
  const founder = user.isFounder ?? user.is_founder ?? false;
  const plan = (user.subscriptionPlan ?? user.subscription_plan ?? "").trim();
  return Boolean(verified) || Boolean(founder) || isGoldTier(user) || plan.length > 0;
}
