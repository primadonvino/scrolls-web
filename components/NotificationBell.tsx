"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import {
  deleteReadNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount
} from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { browserSupabaseClient, setRealtimeAuth, type ScrollsRealtimeChannel } from "@/lib/realtime/supabase";
import type { ScrollsNotification } from "@/lib/types/scrolls";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ScrollsNotification[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const unread = useMemo(() => unreadNotificationCount(items), [items]);

  const load = useCallback(async (silent = false) => {
    const session = await readFreshSession();
    if (!session?.token || !session.user?.id) {
      setItems([]);
      return;
    }
    if (!silent) setLoading(true);
    setStatus(null);
    try {
      const response = await fetchNotifications(session.token);
      setItems(response.items ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load notifications.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const interval = window.setInterval(() => load(true), 45_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    let unsubscribed = false;
    let channel: ScrollsRealtimeChannel | null = null;

    (async () => {
      const session = await readFreshSession();
      if (!session?.token || !session.user?.id || unsubscribed) return;
      const supabase = setRealtimeAuth(session.token);
      if (!supabase) return;
      channel = supabase
        .channel(`scrolls-web-notifications-${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${session.user.id}`
          },
          () => load(true)
        )
        .subscribe();
    })();

    return () => {
      unsubscribed = true;
      const supabase = browserSupabaseClient();
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [load]);

  async function markOne(item: ScrollsNotification) {
    const session = await readFreshSession();
    if (!session?.token) return;
    setItems((current) => current.map((value) => value.id === item.id ? { ...value, isRead: true } : value));
    try {
      await markNotificationRead(item.id, session.token, true);
    } catch {
      await load(true);
    }
  }

  async function markAll() {
    const session = await readFreshSession();
    if (!session?.token) return;
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    try {
      await markAllNotificationsRead(session.token);
    } catch {
      await load(true);
    }
  }

  async function clearRead() {
    const session = await readFreshSession();
    if (!session?.token) return;
    setItems((current) => current.filter((item) => !item.isRead));
    try {
      await deleteReadNotifications(session.token);
    } catch {
      await load(true);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load(true);
        }}
        className="relative rounded-full border border-white/15 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <Bell size={18} />
        {unread ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-scrolls-blue px-1 text-[10px] font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-[1.5rem] border border-white/10 bg-[#171719] p-3 shadow-glow">
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            <div>
              <p className="font-black text-white">Notifications</p>
              <p className="text-xs text-white/45">{unread ? `${unread} unread` : "All caught up"}</p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={markAll}
                aria-label="Mark all read"
                className="rounded-full p-2 text-white/65 transition hover:bg-white/10 hover:text-white"
              >
                <CheckCheck size={17} />
              </button>
              <button
                type="button"
                onClick={clearRead}
                aria-label="Clear read notifications"
                className="rounded-full p-2 text-white/65 transition hover:bg-white/10 hover:text-white"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="mt-2 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {loading ? <p className="rounded-2xl bg-white/[0.04] p-3 text-sm text-white/55">Loading...</p> : null}
            {status ? <p className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">{status}</p> : null}
            {!loading && !items.length ? (
              <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-white/55">No notifications yet.</p>
            ) : null}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markOne(item)}
                className={`w-full rounded-2xl border p-3 text-left transition hover:bg-white/[0.07] ${
                  item.isRead ? "border-white/[0.08] bg-white/[0.03]" : "border-scrolls-blue/35 bg-scrolls-blue/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-white">{item.title}</p>
                  <time className="shrink-0 text-[11px] text-white/38">{relativeTime(item.createdAt)}</time>
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/62">{item.message}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
