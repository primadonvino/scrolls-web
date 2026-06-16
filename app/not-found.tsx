import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center px-5 text-center">
      <div>
        <h1 className="text-4xl font-black">Nothing here yet</h1>
        <p className="mt-3 text-white/55">This Scrolls link could not be found.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 font-bold text-black">
          Go home
        </Link>
      </div>
    </div>
  );
}
