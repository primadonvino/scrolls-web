"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { searchUsers } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import type { MusicTrackCredit } from "@/lib/music/markers";
import type { ScrollsUser } from "@/lib/types/scrolls";

/** Per-track featured-artist picker — searches Scrolls users and edits the
 *  track's collaboratorCredits (which publish into the [MUSIC_TRACKS] payload). */
export function TrackCollaborators({
  credits,
  onChange
}: {
  credits: MusicTrackCredit[];
  onChange: (next: MusicTrackCredit[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScrollsUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const session = await readFreshSession();
      try {
        const users = await searchUsers(q, session?.token);
        if (!cancelled) setResults(users.slice(0, 6));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function add(user: ScrollsUser) {
    if (!user.id || credits.some((c) => c.userID === user.id)) return;
    onChange([
      ...credits,
      {
        userID: user.id,
        username: user.username ?? "",
        displayName: user.displayName ?? user.display_name ?? user.username ?? ""
      }
    ]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function remove(userID: string) {
    onChange(credits.filter((c) => c.userID !== userID));
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {credits.map((credit) => (
          <span key={credit.userID} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white/85">
            {credit.displayName || `@${credit.username}`}
            <button type="button" onClick={() => remove(credit.userID)} className="text-white/40 hover:text-white" aria-label="Remove">
              ✕
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-bold text-white/70 hover:bg-white/10"
        >
          + Featured artist
        </button>
      </div>
      {open ? (
        <div className="mt-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Scrolls users…"
            autoFocus
            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
          />
          {results.length ? (
            <div className="mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#171719]">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => add(user)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/10"
                >
                  <Avatar user={user} size={24} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white">
                      {user.displayName ?? user.display_name ?? user.username}
                    </span>
                    <span className="block truncate text-xs text-white/45">@{user.username}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 ? (
            <p className="mt-1 px-1 text-xs text-white/40">{searching ? "Searching…" : "No users found."}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
