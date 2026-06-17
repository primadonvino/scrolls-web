"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Avatar } from "@/components/Avatar";
import {
  blockUser,
  createComment,
  createRescroll,
  deletePost,
  fetchComments,
  reportPost,
  setPinnedPost,
  updateCaption
} from "@/lib/api/scrolls";
import { readFreshSession, readSession } from "@/lib/auth/session";
import type { AuthSession, ScrollsComment, ScrollsPost } from "@/lib/types/scrolls";

type Props = {
  post: ScrollsPost;
  onBlocked?: (userID: string) => void;
  onDeleted?: (postID: string) => void;
  onCaptionUpdated?: (postID: string, caption: string) => void;
};

const reportReasons = [
  { value: "spam", label: "Spam" },
  { value: "harassment_bullying", label: "Harassment" },
  { value: "hate_speech_discrimination", label: "Hate speech" },
  { value: "nudity_sexual_themes", label: "Nudity or sexual content" },
  { value: "violence", label: "Violence" },
  { value: "misinformation", label: "Misinformation" },
  { value: "impersonation", label: "Impersonation" }
];

export function PostActions({ post, onBlocked, onDeleted, onCaptionUpdated }: Props) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ScrollsComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(post.caption ?? "");

  const author = post.author ?? post.user;
  const authorID = author?.id;
  const isSignedIn = Boolean(session?.token && session.user?.id);
  const isOwner = Boolean(authorID && session?.user?.id === authorID);

  async function pinToProfile() {
    const freshSession = await readFreshSession();
    setSession(freshSession);
    if (!freshSession?.token || !freshSession.user?.id) return;
    setBusy("pin");
    setStatus(null);
    try {
      await setPinnedPost(freshSession.user.id, post.id, freshSession.token);
      setStatus("Pinned to your profile.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not pin this post.");
    } finally {
      setBusy(null);
    }
  }

  async function saveCaption() {
    const freshSession = await readFreshSession();
    setSession(freshSession);
    if (!freshSession?.token || !freshSession.user?.id) return;
    const next = captionDraft.trim();
    setBusy("caption");
    setStatus(null);
    try {
      await updateCaption(post.id, freshSession.user.id, next || null, freshSession.token);
      onCaptionUpdated?.(post.id, next);
      setEditingCaption(false);
      setStatus("Caption updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update the caption.");
    } finally {
      setBusy(null);
    }
  }

  async function removePost() {
    const freshSession = await readFreshSession();
    setSession(freshSession);
    if (!freshSession?.token || !freshSession.user?.id) return;
    setBusy("delete");
    setStatus(null);
    try {
      await deletePost(post.id, freshSession.user.id, freshSession.token);
      setDeleted(true);
      onDeleted?.(post.id);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete this post.");
    } finally {
      setBusy(null);
      setConfirmingDelete(false);
    }
  }

  const commentCount = useMemo(() => countComments(comments), [comments]);

  async function ensureComments() {
    if (commentsLoaded) return;
    setBusy("comments");
    setStatus(null);
    try {
      const freshSession = await readFreshSession();
      setSession(freshSession);
      const loaded = await fetchComments(post.id, freshSession?.token);
      setComments(loaded);
      setCommentsLoaded(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load comments.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleComments() {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (nextOpen) await ensureComments();
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    const body = commentBody.trim();
    const freshSession = await readFreshSession();
    setSession(freshSession);
    if (!freshSession?.token || !freshSession.user?.id || !body) return;
    setBusy("comment");
    setStatus(null);
    try {
      await createComment(post.id, freshSession.user.id, body, freshSession.token);
      setCommentBody("");
      const loaded = await fetchComments(post.id, freshSession.token);
      setComments(loaded);
      setCommentsLoaded(true);
      setCommentsOpen(true);
      setStatus("Comment posted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not post comment.");
    } finally {
      setBusy(null);
    }
  }

  async function rescroll() {
    const freshSession = await readFreshSession();
    setSession(freshSession);
    if (!freshSession?.token || !freshSession.user?.id) return;
    setBusy("rescroll");
    setStatus(null);
    try {
      await createRescroll(freshSession.user.id, post.id, freshSession.token);
      setStatus("Rescrolled.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not rescroll.");
    } finally {
      setBusy(null);
    }
  }

  async function report() {
    const freshSession = await readFreshSession();
    setSession(freshSession);
    const token = freshSession?.token;
    setBusy("report");
    setStatus(null);
    try {
      await reportPost(post.id, reportReason, token);
      setStatus("Report sent. Thank you.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not report this post.");
    } finally {
      setBusy(null);
    }
  }

  async function blockAuthor() {
    const freshSession = await readFreshSession();
    setSession(freshSession);
    if (!authorID || !freshSession?.token) return;
    setBusy("block");
    setStatus(null);
    try {
      await blockUser(authorID, freshSession.token);
      onBlocked?.(authorID);
      setStatus("User blocked.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not block this user.");
    } finally {
      setBusy(null);
    }
  }

  if (deleted) {
    return (
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-sm text-white/55">Post deleted.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={toggleComments}
          className="rounded-full border border-white/12 px-4 py-2 font-bold text-white/80 transition hover:bg-white/10"
        >
          {commentsOpen ? "Hide comments" : `Comments${commentCount ? ` ${commentCount}` : ""}`}
        </button>
        <button
          type="button"
          disabled={!isSignedIn || busy === "rescroll"}
          onClick={rescroll}
          className="rounded-full border border-white/12 px-4 py-2 font-bold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {busy === "rescroll" ? "Rescrolling..." : "Rescroll"}
        </button>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full border border-white/12 px-4 py-2 font-bold text-white/80 transition hover:bg-white/10">
            More
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-3xl border border-white/10 bg-[#171719] p-3 shadow-glow">
            {!isOwner ? (
              <>
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Report reason</label>
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none"
                >
                  {reportReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy === "report"}
                  onClick={report}
                  className="mt-3 w-full rounded-full bg-white px-4 py-2 text-sm font-black text-black disabled:opacity-45"
                >
                  {busy === "report" ? "Reporting..." : "Report post"}
                </button>
              </>
            ) : null}
            {!isOwner ? (
              <button
                type="button"
                disabled={!isSignedIn || !authorID || busy === "block"}
                onClick={blockAuthor}
                className="mt-2 w-full rounded-full border border-red-400/30 px-4 py-2 text-sm font-black text-red-200 disabled:opacity-45"
              >
                {busy === "block" ? "Blocking..." : "Block user"}
              </button>
            ) : null}

            {isOwner ? (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Your post</p>
                <button
                  type="button"
                  onClick={() => {
                    setCaptionDraft(post.caption ?? "");
                    setEditingCaption((value) => !value);
                  }}
                  className="mt-2 w-full rounded-full border border-white/12 px-4 py-2 text-sm font-bold text-white/85"
                >
                  {editingCaption ? "Cancel edit" : "Edit caption"}
                </button>
                <button
                  type="button"
                  disabled={busy === "pin"}
                  onClick={pinToProfile}
                  className="mt-2 w-full rounded-full border border-white/12 px-4 py-2 text-sm font-bold text-white/85 disabled:opacity-45"
                >
                  {busy === "pin" ? "Pinning..." : "Pin to profile"}
                </button>
                {confirmingDelete ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busy === "delete"}
                      onClick={removePost}
                      className="flex-1 rounded-full bg-red-400 px-4 py-2 text-sm font-black text-black disabled:opacity-45"
                    >
                      {busy === "delete" ? "Deleting..." : "Confirm delete"}
                    </button>
                    <button
                      type="button"
                      disabled={busy === "delete"}
                      onClick={() => setConfirmingDelete(false)}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="mt-2 w-full rounded-full border border-red-400/30 px-4 py-2 text-sm font-black text-red-200"
                  >
                    Delete post
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </details>
        {!isSignedIn ? (
          <Link href="/login" className="ml-auto text-sm font-bold text-scrolls-blue">Log in to interact</Link>
        ) : null}
      </div>

      {status ? <p className="mt-3 text-sm text-white/52">{status}</p> : null}

      {editingCaption ? (
        <div className="mt-3 rounded-[1.25rem] border border-white/10 bg-black/35 p-3">
          <textarea
            value={captionDraft}
            onChange={(event) => setCaptionDraft(event.target.value.slice(0, 220))}
            rows={3}
            placeholder="Edit your caption"
            className="w-full resize-none rounded-2xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-white/40">{captionDraft.trim().length}/220</span>
            <button
              type="button"
              disabled={busy === "caption"}
              onClick={saveCaption}
              className="rounded-full bg-scrolls-blue px-5 py-2 text-sm font-black text-white disabled:opacity-45"
            >
              {busy === "caption" ? "Saving..." : "Save caption"}
            </button>
          </div>
        </div>
      ) : null}

      {commentsOpen ? (
        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/35 p-3">
          {busy === "comments" ? <p className="p-3 text-sm text-white/50">Loading comments...</p> : null}
          {!busy && commentsLoaded && comments.length === 0 ? (
            <p className="p-3 text-sm text-white/45">No comments yet.</p>
          ) : null}
          <div className="space-y-3">
            {comments.map((comment) => <CommentRow key={comment.id} comment={comment} />)}
          </div>
          <form onSubmit={submitComment} className="mt-4 flex gap-2">
            <input
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              disabled={!isSignedIn}
              placeholder={isSignedIn ? "Add a comment" : "Log in to comment"}
              maxLength={320}
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30 disabled:opacity-45"
            />
            <button
              type="submit"
              disabled={!isSignedIn || !commentBody.trim() || busy === "comment"}
              className="rounded-full bg-scrolls-blue px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              {busy === "comment" ? "Posting" : "Post"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function CommentRow({ comment, depth = 0 }: { comment: ScrollsComment; depth?: number }) {
  const author = comment.author;
  const displayName = author.displayName ?? author.display_name ?? author.username;
  const username = author.username;
  const replies = comment.replies ?? [];
  return (
    <div className={depth ? "ml-8 border-l border-white/10 pl-3" : ""}>
      <div className="flex gap-3">
        <Avatar user={author} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-bold text-white">{displayName}</p>
            <p className="text-sm text-white/42">@{username}</p>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/76">{comment.body}</p>
        </div>
      </div>
      {replies.length ? (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => <CommentRow key={reply.id} comment={reply} depth={depth + 1} />)}
        </div>
      ) : null}
    </div>
  );
}

function countComments(comments: ScrollsComment[]): number {
  return comments.reduce((count, comment) => count + 1 + countComments(comment.replies ?? []), 0);
}
