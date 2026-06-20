"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAuthorPosts } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { postCoverURL } from "@/lib/media/urls";
import {
  featuredDisplayArtist,
  featuredDisplayTitle,
  type FeaturedMusicLink
} from "@/lib/music/featured";
import {
  creditLabel,
  formatDuration,
  isMusicPost,
  parseMusicPost,
  releaseTypeLabel,
  type MusicReleaseType
} from "@/lib/music/markers";
import type { ScrollsPost } from "@/lib/types/scrolls";

type Candidate = {
  key: string;
  link: FeaturedMusicLink;
  title: string;
  artistLine: string;
  coverURL: string | null;
  durationSeconds: number | null;
  releaseType: MusicReleaseType | null;
  isExplicit: boolean;
  detail: string;
  searchText: string;
};

const CHIPS = ["For you", "Trending", "Original audio", "Saved", "Albums", "Singles/EPs"] as const;
type Chip = (typeof CHIPS)[number];

function joinArtists(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? "";
  if (clean.length === 2) return `${clean[0]} & ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} & ${clean[clean.length - 1]}`;
}

function buildCandidates(posts: ScrollsPost[]): Candidate[] {
  const out: Candidate[] = [];
  for (const post of posts) {
    const music = parseMusicPost(post.caption);
    if (!music.isMusic) continue;
    const author = post.author ?? post.user;
    const displayName = author?.displayName ?? author?.display_name ?? "";
    const username = author?.username ?? "";
    const leadLabel = displayName || (username ? `@${username}` : "Artist");
    const cover = postCoverURL(post);
    const releaseTitle = music.title ?? "Untitled";
    const releaseLabel = releaseTypeLabel(music.releaseType);
    const base = { releaseTitle, artistDisplayName: displayName, artistUsername: username };
    const search = (parts: (string | null | undefined)[]) =>
      parts.filter(Boolean).join(" ").toLowerCase();

    // Release-level candidate.
    out.push({
      key: `${post.id}-release`,
      link: { postID: post.id, trackID: null, trackTitle: null, ...base },
      title: releaseTitle,
      artistLine: leadLabel,
      coverURL: cover,
      durationSeconds: null,
      releaseType: music.releaseType,
      isExplicit: false,
      detail: [releaseLabel, music.genre].filter(Boolean).join(" · "),
      searchText: search([releaseTitle, leadLabel, music.genre, music.recordLabel, releaseLabel])
    });

    // Track-level candidates.
    for (const track of music.tracks) {
      const collaborators = track.collaboratorCredits ?? [];
      const artistLine = collaborators.length
        ? joinArtists([leadLabel, ...collaborators.map(creditLabel)])
        : leadLabel;
      const dur = formatDuration(track.durationSeconds);
      const title = track.title || releaseTitle;
      out.push({
        key: `${post.id}-${track.id}`,
        link: { postID: post.id, trackID: track.id, trackTitle: track.title, ...base },
        title,
        artistLine,
        coverURL: cover,
        durationSeconds: track.durationSeconds ?? null,
        releaseType: music.releaseType,
        isExplicit: track.isExplicit,
        detail: [releaseLabel, music.genre, dur].filter(Boolean).join(" · "),
        searchText: search([title, artistLine, music.genre, music.recordLabel, releaseLabel])
      });
    }
  }
  return out;
}

function isSelected(link: FeaturedMusicLink, value: FeaturedMusicLink | null): boolean {
  if (!value) return false;
  return value.postID === link.postID && (value.trackID ?? null) === (link.trackID ?? null);
}

/** Compact selector row shown in the composer, with the inline selected summary. */
export function FeaturedMusicSelector({
  value,
  onChange
}: {
  value: FeaturedMusicLink | null;
  onChange: (link: FeaturedMusicLink | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-white/70">Featured music</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/12 bg-black/40 px-4 py-3 text-left transition hover:bg-black/60"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-scrolls-panel2 text-base text-white/55">♪</span>
          {value ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">{featuredDisplayTitle(value)}</span>
              <span className="block truncate text-xs text-white/50">{featuredDisplayArtist(value)}</span>
            </span>
          ) : (
            <span className="flex-1 text-sm font-bold text-white/60">Add music to your post</span>
          )}
          <span className="shrink-0 text-white/40">›</span>
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded-full border border-white/12 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10"
          >
            Clear
          </button>
        ) : null}
      </div>

      {open ? (
        <MusicPickerSheet
          selected={value}
          onClose={() => setOpen(false)}
          onSelect={(link) => {
            onChange(link);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function MusicPickerSheet({
  selected,
  onClose,
  onSelect
}: {
  selected: FeaturedMusicLink | null;
  onClose: () => void;
  onSelect: (link: FeaturedMusicLink) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>("For you");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await readFreshSession();
      if (!session?.token || !session.user?.id) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const posts = await fetchAuthorPosts(session.user.id, session.token);
        const music = posts.filter((post) => isMusicPost(post.caption));
        if (!cancelled) setCandidates(buildCandidates(music));
      } catch {
        // leave empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = candidates;
    if (chip === "Saved") list = list.filter((c) => isSelected(c.link, selected));
    else if (chip === "Albums") list = list.filter((c) => c.releaseType === "album");
    else if (chip === "Singles/EPs") list = list.filter((c) => c.releaseType === "singlesEPs");
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) => c.searchText.includes(q));
    return list;
  }, [candidates, chip, query, selected]);

  const hero = filtered[0] ?? null;
  const rest = hero ? filtered.slice(1) : filtered;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose} role="presentation">
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-scrolls-panel sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="text-base font-black text-white">Add music</p>
          <button type="button" onClick={onClose} className="rounded-full px-2 text-white/50 hover:text-white">✕</button>
        </div>

        <div className="flex items-center gap-2 px-5 pt-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search…"
            className="min-w-0 flex-1 rounded-full border border-white/12 bg-black px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
          />
          <button
            type="button"
            disabled
            title="Import audio (coming soon)"
            className="shrink-0 cursor-not-allowed rounded-full border border-white/12 px-3 py-2.5 text-xs font-bold text-white/35"
          >
            Import audio
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto px-5 pt-3 pb-1">
          {CHIPS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setChip(value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                chip === value ? "bg-white text-black" : "border border-white/12 text-white/65 hover:bg-white/10"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-white/50">Loading your music…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/50">
              {candidates.length === 0 ? "You haven't uploaded any music yet." : "No matches."}
            </p>
          ) : (
            <>
              {hero ? <HeroCard candidate={hero} selected={isSelected(hero.link, selected)} onSelect={() => onSelect(hero.link)} /> : null}
              <div className="mt-2">
                {rest.map((candidate) => (
                  <Row
                    key={candidate.key}
                    candidate={candidate}
                    selected={isSelected(candidate.link, selected)}
                    onSelect={() => onSelect(candidate.link)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroCard({ candidate, selected, onSelect }: { candidate: Candidate; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-4 rounded-2xl border border-scrolls-gold/30 bg-gradient-to-br from-white/[0.06] to-transparent p-4 text-left transition hover:from-white/[0.1]"
    >
      <Cover url={candidate.coverURL} size={72} />
      <span className="min-w-0 flex-1">
        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-scrolls-gold">Featured</span>
        <span className="flex items-center gap-1.5">
          <span className="truncate text-base font-black text-white">{candidate.title}</span>
          {candidate.isExplicit ? <ExplicitBadge /> : null}
        </span>
        <span className="block truncate text-sm text-white/60">{candidate.artistLine}</span>
        {candidate.detail ? <span className="block truncate text-xs text-white/40">{candidate.detail}</span> : null}
      </span>
      <SelectIcon selected={selected} />
    </button>
  );
}

function Row({ candidate, selected, onSelect }: { candidate: Candidate; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left transition hover:bg-white/[0.06]"
    >
      <Cover url={candidate.coverURL} size={48} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-white/90">{candidate.title}</span>
          {candidate.isExplicit ? <ExplicitBadge /> : null}
        </span>
        <span className="block truncate text-xs text-white/55">{candidate.artistLine}</span>
        {candidate.detail ? <span className="block truncate text-[11px] text-white/35">{candidate.detail}</span> : null}
      </span>
      <SelectIcon selected={selected} />
    </button>
  );
}

function Cover({ url, size }: { url: string | null; size: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-xl bg-scrolls-panel2 text-white/45"
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        "♪"
      )}
    </span>
  );
}

function ExplicitBadge() {
  return (
    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] bg-white/25 text-[9px] font-bold text-white" title="Explicit">
      E
    </span>
  );
}

function SelectIcon({ selected }: { selected: boolean }) {
  return (
    <span className={`shrink-0 text-lg ${selected ? "text-scrolls-gold" : "text-white/30"}`}>
      {selected ? "✓" : "＋"}
    </span>
  );
}
