import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Makes Scrolls Web installable / standalone
// so it behaves like the phone app when added to a home screen or desktop.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scrolls",
    short_name: "Scrolls",
    description: "Profiles, posts, music, video, and city feeds from Scrolls.",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    background_color: "#020203",
    theme_color: "#020203",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
