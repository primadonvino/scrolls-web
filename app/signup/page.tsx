"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandMark } from "@/components/BrandMark";
import { signup } from "@/lib/api/scrolls";
import { writeSession } from "@/lib/auth/session";

const minDOB = "1900-01-01";
const defaultDOB = (() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().slice(0, 10);
})();

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(defaultDOB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,30}$/.test(cleanUsername)) {
      setError("Use 3-30 lowercase letters, numbers, dots, or underscores for your username.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!dateOfBirth) {
      setError("Date of birth is required.");
      return;
    }

    setLoading(true);
    try {
      const session = await signup({
        username: cleanUsername,
        email: email.trim().toLowerCase(),
        password,
        dateOfBirth,
        accountType: "personal"
      });
      writeSession(session);
      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-svh place-items-center px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-scrolls-panel p-6">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <h1 className="text-center text-3xl font-black">Create your account</h1>
        <p className="mt-3 text-center text-sm leading-6 text-white/55">
          Join Scrolls on the web. Your account works in the iOS app too.
        </p>

        <div className="mt-8 space-y-3">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            placeholder="Username"
            className={inputClass}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            className={inputClass}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className={inputClass}
          />
          <label className="block rounded-2xl border border-white/10 bg-black px-4 py-3">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-white/42">Date of birth</span>
            <input
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              min={minDOB}
              max={new Date().toISOString().slice(0, 10)}
              type="date"
              className="mt-2 w-full bg-transparent text-white outline-none"
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <button
          disabled={loading || !username.trim() || !email.trim() || !password}
          className="mt-6 w-full rounded-full bg-white py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Creating..." : "Create account"}
        </button>

        <p className="mt-4 text-center text-xs leading-5 text-white/45">
          By creating an account, you agree to the Scrolls{" "}
          <a href="/terms" className="font-bold text-white/70 underline decoration-white/25">Terms</a> and{" "}
          <a href="/privacy" className="font-bold text-white/70 underline decoration-white/25">Privacy Policy</a>.
        </p>

        <p className="mt-5 text-center text-sm text-white/55">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-white">Log in</Link>
        </p>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none placeholder:text-white/30 focus:border-white/30";
