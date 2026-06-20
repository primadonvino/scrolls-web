"use client";

import Link from "next/link";
import { ExternalLink, Megaphone } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { MediaRenderer } from "@/components/media/MediaRenderer";
import { ArticleCard } from "@/components/post/ArticleCard";
import { MusicCard } from "@/components/post/MusicCard";
import { PhotoCarousel } from "@/components/post/PhotoCarousel";
import { UserBadges } from "@/components/UserBadges";
import { isArticlePost } from "@/lib/article/article";
import { postMediaURL } from "@/lib/media/urls";
import { isMusicOrPodcast, photoCarouselURLs, strippedCaption } from "@/lib/music/markers";
import type { AdDeliveryItem, ScrollsPost } from "@/lib/types/scrolls";

export function SponsoredCard({ item }: { item: AdDeliveryItem }) {
  const post = adDeliveryPost(item);
  if (!post) return null;

  const author = post.author ?? post.user;
  const displayName = author?.displayName ?? author?.display_name ?? author?.username ?? "Scrolls";
  const username = author?.username ?? "user";
  const caption = strippedCaption(post.caption ?? "");
  const isMusic = isMusicOrPodcast(post);
  const isArticle = !isMusic && isArticlePost(post);
  const carouselExtras = !isMusic && !isArticle ? photoCarouselURLs(post.caption) : [];
  const carouselImages = carouselExtras.length
    ? ([postMediaURL(post), ...carouselExtras].filter(Boolean) as string[])
    : [];
  const websiteURL = item.submission.websiteURL ?? post.websiteURL ?? post.website_url;

  return (
    <article className="relative overflow-hidden rounded-[1.8rem] border border-scrolls-gold/35 bg-gradient-to-br from-[#1c1b17] via-[#111113] to-black p-4 shadow-[0_0_40px_rgba(214,170,82,0.12)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-scrolls-gold/30 bg-scrolls-gold/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-scrolls-gold">
          <Megaphone size={14} />
          Sponsored
        </div>
        <span className="text-xs font-bold text-white/45">Scrolls Curated</span>
      </div>

      <Link href={`/user/${encodeURIComponent(username)}`} className="mb-4 flex items-center gap-3">
        <Avatar user={author} size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-bold">{displayName}</span>
            <UserBadges user={author} size={15} />
          </div>
          <div className="truncate text-sm text-white/55">@{username}</div>
        </div>
      </Link>

      {isMusic ? (
        <MusicCard post={post} />
      ) : isArticle ? (
        <ArticleCard post={post} />
      ) : carouselImages.length > 1 ? (
        <PhotoCarousel images={carouselImages} alt={caption || undefined} />
      ) : (
        <Link href={`/scroll/${post.id}`} className="block">
          <MediaRenderer post={post} />
        </Link>
      )}

      {!isMusic && !isArticle && caption ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{caption}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
        <div className="text-xs text-white/45">
          {item.submission.targetCity ? `${item.submission.targetCity} campaign` : "Promoted on Scrolls"}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/scroll/${post.id}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-white/80 transition hover:bg-white/10">
            Open scroll
          </Link>
          {websiteURL ? (
            <a
              href={websiteURL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-black"
            >
              Visit <ExternalLink size={13} />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function adDeliveryPost(item: AdDeliveryItem): ScrollsPost | null {
  const source = item.post;
  if (!source?.id) return null;
  return {
    id: source.id,
    type: source.type,
    caption: source.caption ?? null,
    textBody: source.textBody ?? null,
    text_body: source.textBody ?? null,
    websiteURL: source.websiteURL ?? item.submission.websiteURL ?? null,
    website_url: source.websiteURL ?? item.submission.websiteURL ?? null,
    locationCity: source.locationCity ?? null,
    location_city: source.locationCity ?? null,
    assetRef: source.assetRef ?? null,
    asset_ref: source.assetRef ?? null,
    assetProvider: source.assetProvider ?? null,
    asset_provider: source.assetProvider ?? null,
    assetBucket: source.assetBucket ?? null,
    asset_bucket: source.assetBucket ?? null,
    assetObjectKey: source.assetObjectKey ?? null,
    asset_object_key: source.assetObjectKey ?? null,
    coverImageRef: source.coverImageRef ?? null,
    cover_image_ref: source.coverImageRef ?? null,
    coverProvider: source.coverProvider ?? null,
    cover_provider: source.coverProvider ?? null,
    coverBucket: source.coverBucket ?? null,
    cover_bucket: source.coverBucket ?? null,
    coverObjectKey: source.coverObjectKey ?? null,
    cover_object_key: source.coverObjectKey ?? null,
    aspectRatio: source.aspectRatio ?? null,
    aspect_ratio: source.aspectRatio ?? null,
    createdAt: source.createdAt,
    created_at: source.createdAt,
    author: item.businessUser ?? item.submission.businessUser ?? undefined,
    user: item.businessUser ?? item.submission.businessUser ?? undefined
  };
}
