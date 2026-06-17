"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MusicComposer } from "@/components/compose/MusicComposer";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchPost } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { isMusicOrPodcast } from "@/lib/music/markers";
import type { ScrollsPost } from "@/lib/types/scrolls";

type State =
  | { status: "loading" }
  | { status: "login" }
  | { status: "missing" }
  | { status: "not-music" }
  | { status: "not-owner" }
  | { status: "ready"; post: ScrollsPost };

export default function EditReleasePage() {
  const params = useParams<{ postId: string }>();
  const postId = params?.postId;
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!postId) return;
      const session = await readFreshSession();
      if (!session?.token || !session.user?.id) {
        if (!cancelled) setState({ status: "login" });
        return;
      }
      let post: ScrollsPost | null = null;
      try {
        post = await fetchPost(postId, session.token);
      } catch {
        post = null;
      }
      if (cancelled) return;
      if (!post) {
        setState({ status: "missing" });
        return;
      }
      if (!isMusicOrPodcast(post)) {
        setState({ status: "not-music" });
        return;
      }
      const ownerID = post.author?.id ?? post.user?.id;
      if (ownerID !== session.user.id) {
        setState({ status: "not-owner" });
        return;
      }
      setState({ status: "ready", post });
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-16">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Edit</p>
          <h1 className="mt-2 text-4xl font-black">Edit release</h1>
        </div>

        {state.status === "loading" ? <p className="text-white/55">Loading…</p> : null}

        {state.status === "login" ? (
          <div className="scrolls-glass rounded-[1.8rem] p-6">
            <p className="text-white/62">Log in to edit your release.</p>
            <Link href="/login" className="mt-5 inline-block rounded-full bg-white px-5 py-3 text-sm font-black text-black">
              Log in
            </Link>
          </div>
        ) : null}

        {state.status === "missing" ? (
          <Notice text="This post is unavailable." postId={postId} />
        ) : null}
        {state.status === "not-music" ? (
          <Notice text="Only music releases can be edited here." postId={postId} />
        ) : null}
        {state.status === "not-owner" ? (
          <Notice text="You can only edit your own releases." postId={postId} />
        ) : null}

        {state.status === "ready" ? (
          <div className="scrolls-glass rounded-[1.8rem] p-5">
            <MusicComposer editPost={state.post} onPosted={() => router.push(`/scroll/${state.post.id}`)} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Notice({ text, postId }: { text: string; postId?: string }) {
  return (
    <div className="scrolls-glass rounded-[1.8rem] p-6">
      <p className="text-white/62">{text}</p>
      {postId ? (
        <Link href={`/scroll/${postId}`} className="mt-5 inline-block text-sm font-bold text-scrolls-blue">
          Back to the post
        </Link>
      ) : null}
    </div>
  );
}
