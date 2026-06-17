import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <BrandMark />
      <h1 className="mt-6 text-2xl font-black">You&rsquo;re offline</h1>
      <p className="mt-2 text-white/55">Scrolls needs a connection to load your feed. Check your network and try again.</p>
      <Link href="/feed" className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-black text-black">
        Retry
      </Link>
    </div>
  );
}
