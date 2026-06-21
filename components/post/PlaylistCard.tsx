"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { usePlayer, type PlayerTrack } from "@/components/player/PlayerProvider";
import { fetchPlaylistDetail, fetchPost } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { playlistCoverURL, postCoverURL } from "@/lib/media/urls";
import { parseMusicPost } from "@/lib/music/markers";
import type { PlaylistPostMeta } from "@/lib/music/playlist";
import type { ScrollsUser } from "@/lib/types/scrolls";

type Row = { key: string; title: string; artist: string; track: PlayerTrack | null };

/** Feed card for a playlist post — cover, label, title, owner, track count. */
export function PlaylistCard({ post, meta }: { post: { author?: ScrollsUser; user?: ScrollsUser }; meta: PlaylistPostMeta }) {
  const [open, setOpen] = useState(false);
  const owner = post.author ?? post.user;
  const cover = playlistCoverURL(meta);
  const count = meta.trackCount ?? null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-scrolls-panel p-3 text-left transition hover:bg-white/[0.04]"
      >
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-scrolls-panel2 text-2xl text-white/45">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            "♪"
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-[0.18em] text-scrolls-gold">Playlist</span>
          <span className="block truncate text-lg font-black text-white">{meta.title}</span>
          <span className="block truncate text-sm text-white/55">
            {owner?.username ? `@${owner.username}` : "Scrolls"}
            {count != null ? ` · ${count} ${count === 1 ? "track" : "tracks"}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-white/35">›</span>
      </button>
      {open ? <PlaylistSheet meta={meta} owner={owner} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PlaylistSheet({ meta, owner, onClose }: { meta: PlaylistPostMeta; owner?: ScrollsUser; onClose: () => void }) {
  const player = usePlayer();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await readFreshSession();
      try {
        const detail = await fetchPlaylistDetail(meta.playlistID, session?.token);
        const tracks = detail?.tracks ?? [];
        // Resolve audio + main artist from each source music post.
        const ids = Array.from(new Set(tracks.map((t) => t.sourcePostID).filter(Boolean)));
        const posts = await Promise.all(ids.map((id) => fetchPost(id, session?.token).catch(() => null)));
        const audioByKey = new Map<string, { audioURL: string | null; cover: string | null; artist: string }>();
        for (const sourcePost of posts) {
          if (!sourcePost) continue;
          const music = parseMusicPost(sourcePost.caption);
          const a = sourcePost.author ?? sourcePost.user;
          const artist = a?.displayName ?? a?.display_name ?? (a?.username ? `@${a.username}` : "Artist");
          const cover = postCoverURL(sourcePost);
          for (const tr of music.tracks) {
            audioByKey.set(`${sourcePost.id.toLowerCase()}:${tr.id.toLowerCase()}`, {
              audioURL: tr.audioURL ?? null,
              cover,
              artist
            });
          }
        }
        const built: Row[] = tracks.map((t) => {
          const resolved = audioByKey.get(`${t.sourcePostID.toLowerCase()}:${t.trackID.toLowerCase()}`);
          const artist = resolved?.artist ?? (owner?.username ? `@${owner.username}` : "Artist");
          return {
            key: t.id,
            title: t.trackTitle,
            artist,
            track: resolved?.audioURL
              ? { id: t.trackID, title: t.trackTitle, subtitle: artist, artworkURL: resolved.cover, audioURL: resolved.audioURL }
              : null
          };
        });
        if (!cancelled) setRows(built);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meta.playlistID, owner]);

  const playable = rows.map((r) => r.track).filter(Boolean) as PlayerTrack[];
  const cover = playlistCoverURL(meta);

  function playFrom(row: Row) {
    if (!row.track) return;
    const index = playable.findIndex((t) => t.id === row.track!.id);
    if (index >= 0) player.playQueue(playable, index);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose} role="presentation">
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-scrolls-panel sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-5">
          <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-scrolls-panel2 text-3xl text-white/45">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              "♪"
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-scrolls-gold">Playlist</p>
            <p className="truncate text-xl font-black text-white">{meta.title}</p>
            {owner ? (
              <Link href={`/user/${encodeURIComponent(owner.username ?? "")}`} className="mt-1 flex items-center gap-2 text-sm text-white/60 hover:text-white">
                <Avatar user={owner} size={22} />
                <span className="truncate">@{owner.username}</span>
              </Link>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full px-2 text-white/50 hover:text-white">✕</button>
        </div>

        {playable.length ? (
          <div className="px-5 pb-3">
            <button
              type="button"
              onClick={() => player.playQueue(playable, 0)}
              className="rounded-full bg-scrolls-gold px-5 py-2 text-sm font-black text-black"
            >
              ▶ Play
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-white/50">Loading playlist…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/50">This playlist is empty.</p>
          ) : (
            <ol className="space-y-0.5">
              {rows.map((row, index) => (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => playFrom(row)}
                    disabled={!row.track}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition enabled:hover:bg-white/[0.06] disabled:opacity-45"
                  >
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-white/40">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white/90">{row.title}</span>
                      <span className="block truncate text-xs text-white/50">{row.artist}</span>
                    </span>
                    <span className="shrink-0 text-white/35">{row.track ? "▶" : "—"}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
