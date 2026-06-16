const appStoreURL = process.env.NEXT_PUBLIC_SCROLLS_APP_STORE_URL ?? "https://apps.apple.com/us/app/scrolls/id6761082441";

export function AppCTA({ label = "Download Scrolls" }: { label?: string }) {
  return (
    <a
      href={appStoreURL}
      className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90"
    >
      {label}
    </a>
  );
}
