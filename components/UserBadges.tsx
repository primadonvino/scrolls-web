import { BadgeCheck, ScrollText, Star } from "lucide-react";
import type { ScrollsUser } from "@/lib/types/scrolls";

/**
 * The founder (scroll), Gold (star), and Verified (blue check) badges shown
 * next to a user's name — icons, matching the iOS/Android apps, instead of
 * text pills.
 */
export function UserBadges({ user, size = 16 }: { user?: ScrollsUser | null; size?: number }) {
  if (!user) return null;
  const isFounder = user.isFounder ?? user.is_founder ?? false;
  const isVerified = user.isVerified ?? user.is_verified ?? false;
  const isGold = (user.subscriptionPlan ?? user.subscription_plan) === "gold";
  if (!isFounder && !isVerified && !isGold) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 align-middle">
      {isFounder ? <ScrollText size={size} className="text-scrolls-gold" aria-label="Founder" /> : null}
      {isGold ? <Star size={size} className="fill-scrolls-gold text-scrolls-gold" aria-label="Gold" /> : null}
      {isVerified ? <BadgeCheck size={size} className="text-scrolls-blue" aria-label="Verified" /> : null}
    </span>
  );
}
