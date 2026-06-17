import { ImageResponse } from "next/og";

// iOS home-screen icon. Renders the same vector mark as /icon.svg (no font
// dependency, so it rasterizes consistently).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020203"
        }}
      >
        <svg width="180" height="180" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M326 196 c0 -34 -34 -52 -74 -52 c-44 0 -74 24 -74 58 c0 32 26 50 74 58 c40 7 60 22 60 46 c0 30 -28 50 -68 50 c-38 0 -64 -16 -70 -42"
            fill="none"
            stroke="#d6b36c"
            strokeWidth={46}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size
  );
}
