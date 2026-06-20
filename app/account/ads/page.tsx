"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Megaphone, PauseCircle, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  fetchAdSubmissions,
  fetchCuratedAdSlots,
  reviewAdSubmission,
  updateCuratedAdSlots
} from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import type { AdSubmission, AuthSession, CuratedAdSlot } from "@/lib/types/scrolls";

const SLOT_COUNT = 3;

export default function FounderAdsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [submissions, setSubmissions] = useState<AdSubmission[]>([]);
  const [slots, setSlots] = useState<CuratedAdSlot[]>([]);
  const [slotPostIDs, setSlotPostIDs] = useState<string[]>(Array.from({ length: SLOT_COUNT }, () => ""));
  const [loading, setLoading] = useState(true);
  const [savingSlots, setSavingSlots] = useState(false);
  const [busySubmissionID, setBusySubmissionID] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFounder = Boolean(session?.user?.isFounder ?? session?.user?.is_founder);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const fresh = await readFreshSession();
      setSession(fresh);
      if (!fresh?.token) {
        setSubmissions([]);
        setSlots([]);
        return;
      }
      const [nextSlots, nextSubmissions] = await Promise.all([
        fetchCuratedAdSlots(fresh.token),
        fetchAdSubmissions(fresh.token, { limit: 120 })
      ]);
      setSlots(nextSlots);
      setSubmissions(nextSubmissions);
      setSlotPostIDs(slotInputsFromSlots(nextSlots));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the ad terminal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusCounts = useMemo(() => {
    return submissions.reduce<Record<string, number>>((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {});
  }, [submissions]);

  async function saveSlots() {
    const fresh = await readFreshSession();
    if (!fresh?.token) {
      setError("Log in as the founder to save curated ad slots.");
      return;
    }
    setSavingSlots(true);
    setError(null);
    setMessage(null);
    try {
      const nextSlots = await updateCuratedAdSlots(
        slotPostIDs.map((postID, slotIndex) => ({ slotIndex, postID: postID.trim() || null })),
        fresh.token
      );
      setSlots(nextSlots);
      setSlotPostIDs(slotInputsFromSlots(nextSlots));
      setMessage("Curated ad slots saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save curated ad slots.");
    } finally {
      setSavingSlots(false);
    }
  }

  async function setSubmissionStatus(submission: AdSubmission, status: "approved" | "rejected" | "paused") {
    const fresh = await readFreshSession();
    if (!fresh?.token) {
      setError("Log in as the founder to review ads.");
      return;
    }
    setBusySubmissionID(submission.id);
    setError(null);
    setMessage(null);
    try {
      await reviewAdSubmission(submission.id, status, fresh.token, `Reviewed from Scrolls Web founder ad terminal.`);
      setMessage(`Ad ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update ad review.");
    } finally {
      setBusySubmissionID(null);
    }
  }

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="mb-6">
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">
            <Megaphone size={16} />
            Founder
          </p>
          <h1 className="mt-2 text-4xl font-black">Ad terminal</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Manage the Scrolls Curated sponsored slots shown in the web feed and review ad submissions using the same
            backend as the iOS ad panel.
          </p>
        </div>

        {loading ? (
          <div className="scrolls-glass rounded-[1.8rem] p-6 text-white/60">Loading ad terminal...</div>
        ) : !session?.token ? (
          <div className="scrolls-glass rounded-[1.8rem] p-6">
            <h2 className="text-xl font-black">Log in required</h2>
            <p className="mt-2 text-white/55">Sign in with the founder account to access the ad terminal.</p>
            <Link href="/login" className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-black">
              Log in
            </Link>
          </div>
        ) : !isFounder && error?.toLowerCase().includes("founder") ? (
          <AccessDenied />
        ) : (
          <div className="space-y-6">
            {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</p> : null}
            {message ? <p className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</p> : null}

            <div className="grid gap-4 md:grid-cols-4">
              <Metric label="Pending" value={statusCounts.pending ?? 0} />
              <Metric label="Approved" value={statusCounts.approved ?? 0} />
              <Metric label="Paused" value={statusCounts.paused ?? 0} />
              <Metric label="Rejected" value={statusCounts.rejected ?? 0} />
            </div>

            <div className="scrolls-glass rounded-[1.8rem] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Scrolls Curated slots</h2>
                  <p className="mt-1 text-sm text-white/50">
                    Paste a post ID into any slot. Empty slots are removed. Founder posts are auto-approved by the backend.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={saveSlots}
                  disabled={savingSlots}
                  className="rounded-full bg-scrolls-blue px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingSlots ? "Saving..." : "Save slots"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {slotPostIDs.map((postID, index) => (
                  <label key={index} className="rounded-3xl border border-white/10 bg-black/25 p-4">
                    <span className="text-sm font-black text-scrolls-gold">Slot {index + 1}</span>
                    <input
                      value={postID}
                      onChange={(event) => {
                        const copy = [...slotPostIDs];
                        copy[index] = event.target.value;
                        setSlotPostIDs(copy);
                      }}
                      placeholder="Post ID"
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none focus:border-scrolls-blue"
                    />
                    <p className="mt-2 text-xs text-white/35">
                      Current submission: {slots.find((slot) => slot.slotIndex === index)?.submissionID ?? "none"}
                    </p>
                  </label>
                ))}
              </div>
            </div>

            <div className="scrolls-glass rounded-[1.8rem] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Ad submissions</h2>
                  <p className="mt-1 text-sm text-white/50">Approve ads into delivery, pause live ads, or reject unsafe submissions.</p>
                </div>
                <button
                  type="button"
                  onClick={load}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10"
                >
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>

              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <p className="rounded-2xl bg-white/[0.04] p-5 text-white/55">No ad submissions yet.</p>
                ) : submissions.map((submission) => (
                  <SubmissionRow
                    key={submission.id}
                    submission={submission}
                    busy={busySubmissionID === submission.id}
                    onReview={setSubmissionStatus}
                    onUsePost={() => {
                      const copy = [...slotPostIDs];
                      const emptyIndex = copy.findIndex((value) => !value.trim());
                      copy[emptyIndex >= 0 ? emptyIndex : 0] = submission.postID;
                      setSlotPostIDs(copy);
                      setMessage("Post ID copied into a curated slot. Save slots to publish it.");
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function slotInputsFromSlots(slots: CuratedAdSlot[]) {
  return Array.from({ length: SLOT_COUNT }, (_, index) => {
    const slot = slots.find((entry) => entry.slotIndex === index);
    return slot?.postID ?? "";
  });
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="scrolls-glass rounded-[1.8rem] p-6">
      <ShieldAlert className="text-scrolls-gold" size={30} />
      <h2 className="mt-3 text-xl font-black">Founder access required</h2>
      <p className="mt-2 text-white/55">This terminal is only available to the Scrolls founder account.</p>
    </div>
  );
}

function SubmissionRow({
  submission,
  busy,
  onReview,
  onUsePost
}: {
  submission: AdSubmission;
  busy: boolean;
  onReview: (submission: AdSubmission, status: "approved" | "rejected" | "paused") => void;
  onUsePost: () => void;
}) {
  const business = submission.businessUser;
  const title = submission.post?.caption || submission.post?.textBody || `${submission.post?.type ?? "Post"} ad`;
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(submission.status)}`}>
              {submission.status}
            </span>
            <span className="text-xs text-white/40">{submission.targetCity || "Global"}</span>
            <span className="text-xs text-white/40">{submission.campaignType || "curated"}</span>
          </div>
          <p className="mt-3 line-clamp-2 text-base font-black text-white">{title}</p>
          <p className="mt-1 text-sm text-white/50">
            @{business?.username ?? submission.businessUserID} · Post {submission.postID}
          </p>
          {submission.websiteURL ? (
            <a href={submission.websiteURL} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-bold text-scrolls-blue hover:underline">
              {submission.websiteURL}
            </a>
          ) : null}
          {submission.moderationNotes || submission.reviewNotes ? (
            <p className="mt-3 rounded-2xl bg-white/[0.04] p-3 text-xs leading-5 text-white/55">
              {submission.moderationNotes || submission.reviewNotes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/scroll/${submission.postID}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-white/80 transition hover:bg-white/10">
            Preview
          </Link>
          <button type="button" onClick={onUsePost} className="rounded-full border border-scrolls-gold/35 px-4 py-2 text-xs font-black text-scrolls-gold transition hover:bg-scrolls-gold/10">
            Use in slot
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onReview(submission, "approved")}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-black disabled:opacity-40"
          >
            <CheckCircle2 size={14} /> Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onReview(submission, "paused")}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
          >
            <PauseCircle size={14} /> Pause
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onReview(submission, "rejected")}
            className="inline-flex items-center gap-1 rounded-full bg-red-400 px-4 py-2 text-xs font-black text-black disabled:opacity-40"
          >
            <XCircle size={14} /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function statusClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-400/15 text-emerald-200";
    case "rejected":
      return "bg-red-400/15 text-red-200";
    case "paused":
      return "bg-white/10 text-white/70";
    default:
      return "bg-scrolls-gold/15 text-scrolls-gold";
  }
}
