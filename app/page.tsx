import Link from "next/link";
import { AppCTA } from "@/components/AppCTA";
import { Avatar } from "@/components/Avatar";
import { BrandMark } from "@/components/BrandMark";
import { SiteHeader } from "@/components/SiteHeader";
import { UserBadges } from "@/components/UserBadges";
import { fetchAuthorPosts, fetchProfile } from "@/lib/api/scrolls";
import { postMediaURL } from "@/lib/media/urls";
import { isMusicOrPodcast, strippedCaption } from "@/lib/music/markers";
import { isArticlePost } from "@/lib/article/article";
import type { ScrollsPost, ScrollsUser } from "@/lib/types/scrolls";

const FEATURE_USERNAME = "primadonvino";

function isPhotoPost(post: ScrollsPost): boolean {
  const type = post.mediaPreview?.type ?? post.type;
  if (type !== "photo") return false;
  if (isMusicOrPodcast(post) || isArticlePost(post)) return false;
  const url = postMediaURL(post);
  return Boolean(url) && !/\.mp4($|\?)/i.test(url ?? "");
}

/** Loads a real photo post from the featured profile for the landing preview. */
async function loadFeaturedPost(): Promise<{ profile: ScrollsUser; post: ScrollsPost } | null> {
  try {
    const profile = await fetchProfile(FEATURE_USERNAME);
    const posts = await fetchAuthorPosts(profile.id);
    const post = posts.find(isPhotoPost);
    return post ? { profile, post } : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const featured = await loadFeaturedPost();

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto grid min-h-[78svh] max-w-6xl grid-cols-1 items-center gap-10 px-5 py-12 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Now on the App Store</p>
          <h1 className="flex flex-col gap-3">
            <BrandMark />
            <span className="max-w-[13ch] text-5xl font-black leading-[0.94] tracking-normal text-white sm:text-7xl">
              profiles, posts, music, moments.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/66">
            Scrolls is a social feed for creators and communities: city posts, music releases, circles, live moments, and shareable profiles that open cleanly on the web.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/55">
            <AppCTA />
            <Link href="/feed" className="font-bold text-white/80 transition hover:text-white">
              Preview feed →
            </Link>
          </div>
        </div>

        <div className="scrolls-glass overflow-hidden rounded-[2rem] p-4">
          <div className="rounded-[1.6rem] border border-white/[0.08] bg-black p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Main Feed</p>
                <p className="mt-1 text-2xl font-black text-white">Open scrolls anywhere</p>
              </div>
              <Link href="/signup" className="rounded-full bg-white px-4 py-2 text-xs font-black text-black">
                Join Scrolls
              </Link>
            </div>
            {featured ? (
              <FeaturedPostPreview profile={featured.profile} post={featured.post} />
            ) : (
              <MockPreview />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function FeaturedPostPreview({ profile, post }: { profile: ScrollsUser; post: ScrollsPost }) {
  const author = post.author ?? profile;
  const displayName = author.displayName ?? author.display_name ?? author.username ?? "Scrolls";
  const username = author.username ?? FEATURE_USERNAME;
  const city = post.locationCity ?? post.location_city ?? author.homeCity ?? author.home_city ?? null;
  const image = postMediaURL(post);
  const caption = strippedCaption(post.caption);

  return (
    <div className="rounded-[1.35rem] border border-white/[0.08] bg-scrolls-panel p-4">
      <div className="mb-4 flex items-center gap-3">
        <Avatar user={author} size={48} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-lg font-black">{displayName}</p>
            <UserBadges user={author} size={16} />
          </div>
          <p className="truncate text-sm text-white/50">
            @{username}
            {city ? ` · ${city}` : ""}
          </p>
        </div>
      </div>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={caption ?? "Scroll"} className="aspect-[4/5] w-full rounded-[1.2rem] object-cover" />
      ) : null}
      {caption ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/75">{caption}</p> : null}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3 text-sm">
        <span className="text-white/45">scrolls.adastra.love</span>
        <Link href={`/scroll/${post.id}`} className="font-bold text-white">Open scroll</Link>
      </div>
    </div>
  );
}

function MockPreview() {
  return (
    <div className="rounded-[1.35rem] border border-white/[0.08] bg-scrolls-panel p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-scrolls-gold text-sm font-black text-black">TT</div>
        <div className="min-w-0">
          <p className="truncate text-lg font-black">Toni Todaro</p>
          <p className="truncate text-sm text-white/50">@primadonvino · Wichita</p>
        </div>
      </div>
      <div className="aspect-[4/5] rounded-[1.2rem] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
        <div className="flex h-full items-end p-5">
          <div>
            <p className="scrolls-wordmark text-5xl text-white">Scrolls</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-white/62">A live web preview that sends people back into the app when they are ready to post, reply, or join the conversation.</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3 text-sm">
        <span className="text-white/45">scrolls.adastra.love</span>
        <Link href="/user/primadonvino" className="font-bold text-white">View profile</Link>
      </div>
    </div>
  );
}
