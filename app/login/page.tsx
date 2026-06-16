"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { login } from "@/lib/api/scrolls";
import { writeSession } from "@/lib/auth/session";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await login(identifier.trim(), password);
      writeSession(session);
      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
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
        <h1 className="text-center text-3xl font-black">Welcome back</h1>
        <div className="mt-8 space-y-3">
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Username or email"
            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-white/30"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-white/30"
          />
        </div>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        <button
          disabled={loading || !identifier.trim() || !password}
          className="mt-6 w-full rounded-full bg-white py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
