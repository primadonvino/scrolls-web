import { AppCTA } from "@/components/AppCTA";

/**
 * Shared "open the app / download" call-to-action card used on shared post and
 * profile pages — a deep link into the app plus the App Store download.
 */
export function OpenInAppCTA({
  deepLink,
  openLabel = "Open in Scrolls",
  title = "Get the full Scrolls experience",
  subtitle = "Open in the app to post, reply, rescroll, and join the conversation."
}: {
  deepLink: string;
  openLabel?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="scrolls-glass rounded-[1.8rem] p-6 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-scrolls-gold">Scrolls</p>
      <h2 className="mt-2 text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm text-white/60">{subtitle}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <a
          href={deepLink}
          className="rounded-full bg-scrolls-blue px-6 py-3 text-sm font-black text-white transition hover:bg-scrolls-blue/90"
        >
          {openLabel}
        </a>
        <AppCTA />
      </div>
    </div>
  );
}
