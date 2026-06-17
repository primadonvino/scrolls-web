import { AppCTA } from "@/components/AppCTA";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { ScrollsUser } from "@/lib/types/scrolls";

export function ProfileHeader({ profile }: { profile: ScrollsUser }) {
  const displayName = profile.displayName ?? profile.display_name ?? profile.username;
  const isGold = (profile.subscriptionPlan ?? profile.subscription_plan) === "gold";
  const websiteURL = profile.websiteURL ?? profile.website_url ?? null;
  const venmoURL = profile.venmoURL ?? profile.venmo_url ?? null;
  const cashAppURL = profile.cashAppURL ?? profile.cashappURL ?? profile.cashapp_url ?? null;
  return (
    <section className="scrolls-glass rounded-[1.8rem] p-6">
      <div className="mx-auto w-full max-w-sm">
        <ProfileAvatar profile={profile} />
      </div>
      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-black">{displayName}</h1>
          {(profile.isFounder ?? profile.is_founder) && <span className="rounded-full bg-scrolls-gold px-2 py-1 text-xs font-bold text-black">Founder</span>}
          {(profile.isVerified ?? profile.is_verified) && <span className="rounded-full bg-scrolls-blue px-2 py-1 text-xs font-bold">Verified</span>}
          {isGold && <span className="rounded-full border border-scrolls-gold px-2 py-1 text-xs font-bold text-scrolls-gold">Gold</span>}
        </div>
        <p className="text-white/60">@{profile.username}</p>
        {profile.homeCity || profile.home_city ? <p className="mt-1 text-sm text-white/50">{profile.homeCity ?? profile.home_city}</p> : null}
      </div>
      {profile.bio ? <p className="mt-5 whitespace-pre-wrap text-white/80">{profile.bio}</p> : null}
      {websiteURL || venmoURL || cashAppURL ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {websiteURL ? <ProfileLink href={websiteURL} label="Website" /> : null}
          {venmoURL ? <ProfileLink href={venmoURL} label="Venmo" /> : null}
          {cashAppURL ? <ProfileLink href={cashAppURL} label="Cash App" /> : null}
        </div>
      ) : null}
      <ProfileActions profile={profile} />
      <div className="mt-3 flex flex-wrap gap-3">
        <AppCTA />
      </div>
    </section>
  );
}

function ProfileLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10"
    >
      {label}
    </a>
  );
}
