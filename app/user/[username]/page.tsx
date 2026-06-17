import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppSmartBanner } from "@/components/AppSmartBanner";
import { OpenInAppCTA } from "@/components/OpenInAppCTA";
import { PostCard } from "@/components/post/PostCard";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfilePosts } from "@/components/profile/ProfilePosts";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchAuthorPosts, fetchPost, fetchProfile } from "@/lib/api/scrolls";

const BASE = process.env.NEXT_PUBLIC_SCROLLS_WEB_BASE_URL ?? "https://scrolls.adastra.love";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const url = `${BASE}/user/${encodeURIComponent(username)}`;
  // og:image / twitter:image come from the sibling opengraph-image route.
  try {
    const profile = await fetchProfile(username);
    const displayName = profile.displayName ?? profile.display_name ?? profile.username;
    const description = profile.bio?.trim() || `View @${profile.username} on Scrolls.`;
    return {
      title: `${displayName} (@${profile.username})`,
      description,
      alternates: { canonical: url },
      openGraph: { title: `${displayName} on Scrolls`, description, url, siteName: "Scrolls", type: "profile" },
      twitter: { card: "summary_large_image", title: `${displayName} on Scrolls`, description }
    };
  } catch {
    return { title: `@${username}`, alternates: { canonical: url } };
  }
}

export default async function ProfilePage({ params }: Params) {
  const { username } = await params;
  let profile;
  try {
    profile = await fetchProfile(username);
  } catch {
    notFound();
  }
  const posts = await fetchAuthorPosts(profile.id).catch(() => []);
  const pinnedId = profile.pinnedPostID ?? profile.pinned_post_id ?? undefined;
  const pinned = pinnedId ? await fetchPost(pinnedId).catch(() => null) : null;

  return (
    <div>
      <SiteHeader />
      <AppSmartBanner deepLink={`scrolls://user/${profile.username}`} label={`Open @${profile.username} in the app`} />
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <ProfileHeader profile={profile} />
        {pinned ? (
          <div className="mt-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-scrolls-gold">📌 Pinned</p>
            <PostCard post={{ ...pinned, author: pinned.author ?? profile }} />
          </div>
        ) : null}
        <ProfilePosts profile={profile} initialPosts={posts} pinnedPostId={pinnedId} />
        <div className="mt-10">
          <OpenInAppCTA
            deepLink={`scrolls://user/${profile.username}`}
            openLabel={`Open @${profile.username} in Scrolls`}
            title={`Follow @${profile.username} on Scrolls`}
            subtitle="Get the app to follow, message, and see everything they post."
          />
        </div>
      </section>
    </div>
  );
}
