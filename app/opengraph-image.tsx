import { ImageResponse } from "next/og";
import { loadRemoteImage } from "@/lib/og/remoteImage";

export const runtime = "edge";
export const alt = "Scrolls";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BASE = process.env.NEXT_PUBLIC_SCROLLS_WEB_BASE_URL ?? "https://scrolls.adastra.love";

/**
 * Default Open Graph card with the Scrolls logo, used for any shared link that
 * doesn't have its own (the homepage, feed, etc.). Post and profile pages
 * override this with their own opengraph-image.
 */
export default async function Image() {
  const logo = await loadRemoteImage(`${BASE}/icon.png`);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: "#0b0b0d",
          color: "white",
          fontFamily: "sans-serif"
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} width={248} height={248} style={{ borderRadius: 54 }} alt="" />
        ) : null}
        <div style={{ display: "flex", fontSize: 88, fontWeight: 800, letterSpacing: -1 }}>Scrolls</div>
        <div style={{ display: "flex", fontSize: 32, letterSpacing: 6, textTransform: "uppercase", color: "#d6b36c" }}>
          Create freely · Discover deeply · Stay connected
        </div>
      </div>
    ),
    size
  );
}
