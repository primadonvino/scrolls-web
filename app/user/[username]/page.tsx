import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppSmartBanner } from "@/components/AppSmartBanner";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfilePosts } from "@/components/profile/ProfilePosts";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchAuthorPosts, fetchProfile } from "@/lib/api/scrolls";
import { userAvatarURL } from "@/lib/media/urls";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  try {
    const profile = await fetchProfile(username);
    const displayName = profile.displayName ?? profile.display_name ?? profile.username;
    return {
      title: `${displayName} (@${profile.username})`,
      description: profile.bio || `View @${profile.username} on Scrolls.`,
      openGraph: {
        title: `${displayName} on Scrolls`,
        description: profile.bio || `View @${profile.username} on Scrolls.`,
        images: userAvatarURL(profile) ? [userAvatarURL(profile)!] : undefined
      }
    };
  } catch {
    return { title: `@${username}` };
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

  return (
    <div>
      <SiteHeader />
      <AppSmartBanner deepLink={`scrolls://user/${profile.username}`} label={`Open @${profile.username} in the app`} />
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <ProfileHeader profile={profile} />
        <ProfilePosts profile={profile} initialPosts={posts} />
      </section>
    </div>
  );
}
