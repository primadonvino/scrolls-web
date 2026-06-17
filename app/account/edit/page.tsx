"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchProfile, updateProfile, uploadAvatar } from "@/lib/api/scrolls";
import { readFreshSession, readSession, writeSession } from "@/lib/auth/session";
import { userAvatarURL } from "@/lib/media/urls";
import type { AuthSession, ProfileUpdate, ScrollsUser } from "@/lib/types/scrolls";

const MAX_AVATAR_BYTES = 25 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export default function EditProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [profile, setProfile] = useState<ScrollsUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields.
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [websiteURL, setWebsiteURL] = useState("");
  const [venmoURL, setVenmoURL] = useState("");
  const [cashappURL, setCashappURL] = useState("");

  // Avatar selection.
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fresh = await readFreshSession();
      if (cancelled) return;
      setSession(fresh);
      if (!fresh?.user?.username) {
        setLoading(false);
        return;
      }
      try {
        const full = await fetchProfile(fresh.user.username, fresh.token);
        if (cancelled) return;
        const merged = { ...fresh.user, ...full };
        setProfile(merged);
        setDisplayName(merged.displayName ?? merged.display_name ?? "");
        setBio(merged.bio ?? "");
        setHomeCity(merged.homeCity ?? merged.home_city ?? "");
        setWebsiteURL(merged.websiteURL ?? merged.website_url ?? "");
        setVenmoURL(merged.venmoURL ?? merged.venmo_url ?? "");
        setCashappURL(merged.cashAppURL ?? merged.cashappURL ?? merged.cashapp_url ?? "");
      } catch {
        if (!cancelled) setProfile(fresh.user);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Revoke object URLs when the preview changes/unmounts.
  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function pickAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Avatar must be a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Avatar must be under 25MB.");
      return;
    }
    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const fresh = await readFreshSession();
    setSession(fresh);
    if (!fresh?.token || !fresh.user?.id) {
      router.push("/login");
      return;
    }
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const update: ProfileUpdate = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        homeCity: homeCity.trim() || null,
        websiteURL: websiteURL.trim() || null,
        venmoURL: venmoURL.trim() || null,
        cashAppURL: cashappURL.trim() || null
      };

      // Optimistic write-version guard: the backend rejects stale profile writes.
      const writeVersion = profile?.writeVersion ?? profile?.updatedAt ?? profile?.updated_at;
      if (writeVersion) update.expectedWriteVersion = writeVersion;

      // Upload a new avatar first (if picked), then attach it to the patch.
      if (avatarFile) {
        const uploaded = await uploadAvatar(fresh.token, fresh.user.id, avatarFile);
        update.avatarProvider = uploaded.provider;
        update.avatarBucket = uploaded.bucket;
        update.avatarObjectKey = uploaded.objectKey;
      }

      const updated = await updateProfile(fresh.token, update);

      // Keep the cached session user in sync so the header/avatar update.
      const mergedUser = { ...fresh.user, ...updated };
      const mergedSession: AuthSession = { ...fresh, user: mergedUser };
      writeSession(mergedSession);
      setSession(mergedSession);
      setProfile({ ...(profile ?? {}), ...updated } as ScrollsUser);
      setAvatarFile(null);
      setStatus("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const user = session?.user;
  const currentAvatar = avatarPreview ?? userAvatarURL(profile ?? user) ?? null;
  const initials = (displayName || user?.username || "?").slice(0, 1).toUpperCase();

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-16">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Account</p>
            <h1 className="mt-2 text-4xl font-black">Edit profile</h1>
          </div>
          <Link href="/account" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80">
            Back
          </Link>
        </div>

        {loading ? (
          <p className="rounded-2xl bg-white/[0.04] p-5 text-white/60">Loading profile...</p>
        ) : !user ? (
          <div className="scrolls-glass rounded-[1.8rem] p-6">
            <p className="text-white/62">Log in to edit your profile.</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-black text-black"
            >
              Log in
            </button>
          </div>
        ) : (
          <form onSubmit={save} className="scrolls-glass rounded-[1.8rem] p-6">
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-white/10">
                {currentAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white/70">
                    {initials}
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED.join(",")}
                  onChange={pickAvatar}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10"
                >
                  {avatarFile ? "Change photo" : "Upload photo"}
                </button>
                <p className="mt-2 text-xs text-white/40">JPEG, PNG, or WebP · up to 25MB</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Field label="Display name">
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value.slice(0, 60))}
                  placeholder="Your name"
                  className={inputClass}
                />
              </Field>
              <Field label="Bio">
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value.slice(0, 300))}
                  rows={4}
                  placeholder="Tell people about yourself"
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <Field label="Home city">
                <input
                  value={homeCity}
                  onChange={(event) => setHomeCity(event.target.value.slice(0, 80))}
                  placeholder="City"
                  className={inputClass}
                />
              </Field>
              <Field label="Website">
                <input
                  value={websiteURL}
                  onChange={(event) => setWebsiteURL(event.target.value.slice(0, 200))}
                  placeholder="https://"
                  inputMode="url"
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Venmo link">
                  <input
                    value={venmoURL}
                    onChange={(event) => setVenmoURL(event.target.value.slice(0, 200))}
                    placeholder="https://venmo.com/..."
                    className={inputClass}
                  />
                </Field>
                <Field label="Cash App link">
                  <input
                    value={cashappURL}
                    onChange={(event) => setCashappURL(event.target.value.slice(0, 200))}
                    placeholder="https://cash.app/..."
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-scrolls-blue px-6 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
              <Link
                href={`/user/${encodeURIComponent(user.username)}`}
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/80"
              >
                View profile
              </Link>
            </div>

            {status ? <p className="mt-4 text-sm text-emerald-300">{status}</p> : null}
            {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
          </form>
        )}
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-base text-white outline-none placeholder:text-white/30 focus:border-white/30";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/42">{label}</span>
      {children}
    </label>
  );
}
