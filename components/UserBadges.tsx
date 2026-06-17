import { BadgeCheck, ScrollText, Star } from "lucide-react";
import type { ScrollsUser } from "@/lib/types/scrolls";

/**
 * The founder (scroll), Gold (star), and Verified (blue check) badges shown
 * next to a user's name — icons matching the iOS/Android apps. The badge rules
 * mirror `UserProfile` exactly: the six founder-badge usernames always show all
 * three; Gold tier is the "02" / "scrolls.gold.monthly" plan.
 */

const FOUNDER_BADGE_USERNAMES = new Set([
  "primadonvino",
  "scrolls",
  "gelanella",
  "ovispictures",
  "amerigomagazine",
  "provostodaro"
]);

export function UserBadges({ user, size = 16 }: { user?: ScrollsUser | null; size?: number }) {
  if (!user) return null;
  const username = (user.username ?? "").trim().toLowerCase();
  const isFounderBadgeAccount = FOUNDER_BADGE_USERNAMES.has(username);

  const plan = (user.subscriptionPlan ?? user.subscription_plan ?? "").trim().toLowerCase();
  const isGoldTier = plan === "02" || plan === "scrolls.gold.monthly";

  const showFounder = (user.isFounder ?? user.is_founder ?? false) || isFounderBadgeAccount;
  const showGold = isGoldTier || isFounderBadgeAccount;
  const showBlue = (user.isVerified ?? user.is_verified ?? false) || isFounderBadgeAccount;

  if (!showFounder && !showGold && !showBlue) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 align-middle">
      {showFounder ? <ScrollText size={size} className="text-white" aria-label="Founder" /> : null}
      {showGold ? <Star size={size} className="fill-scrolls-gold text-scrolls-gold" aria-label="Gold" /> : null}
      {showBlue ? <BadgeCheck size={size + 1} className="fill-[#1D9BF0] text-white" aria-label="Verified" /> : null}
    </span>
  );
}
