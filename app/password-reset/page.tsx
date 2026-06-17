"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { BrandMark } from "@/components/BrandMark";
import { requestPasswordReset } from "@/lib/api/scrolls";

export default function PasswordResetPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await requestPasswordReset(identifier.trim());
      setMessage(response.message ?? "If that account exists, a password reset email has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request a password reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-svh place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-scrolls-panel p-6">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <h1 className="text-center text-3xl font-black">Reset password</h1>
        <p className="mt-3 text-center text-sm leading-6 text-white/55">
          Enter your username or email. We&apos;ll send a secure reset link if the account exists.
        </p>

        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Username or email"
          className="mt-8 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none placeholder:text-white/30 focus:border-white/30"
          autoCapitalize="none"
          autoCorrect="off"
        />

        {message ? <p className="mt-4 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <button
          disabled={loading || !identifier.trim()}
          className="mt-6 w-full rounded-full bg-white py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <p className="mt-5 text-center text-sm text-white/55">
          Remembered it?{" "}
          <Link href="/login" className="font-bold text-white">Log in</Link>
        </p>
      </form>
    </div>
  );
}
