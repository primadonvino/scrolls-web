import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { THEME_STORAGE_KEY, ThemeProvider, themeInitScript } from "@/components/theme/ThemeProvider";
import "./globals.css";

const appStoreURL = process.env.NEXT_PUBLIC_SCROLLS_APP_STORE_URL ?? "https://apps.apple.com/us/app/scrolls/id6761082441";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SCROLLS_WEB_BASE_URL ?? "https://scrolls.adastra.love"),
  title: {
    default: "Scrolls",
    template: "%s | Scrolls"
  },
  description: "Profiles, posts, music, video, and city feeds from Scrolls.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Scrolls",
    statusBarStyle: "black-translucent"
  },
  openGraph: {
    title: "Scrolls",
    description: "Open Scrolls profiles and posts on the web.",
    siteName: "Scrolls",
    type: "website"
  },
  appLinks: {
    ios: {
      app_store_id: "6761082441",
      url: appStoreURL
    }
  }
};

export const viewport: Viewport = {
  themeColor: "#020203"
};

// Render per-request so the theme cookie sets <html data-theme> with no flash.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieTheme = (await cookies()).get(THEME_STORAGE_KEY)?.value;
  const theme = cookieTheme === "light" || cookieTheme === "cheetah" || cookieTheme === "dark" ? cookieTheme : "dark";
  return (
    <html lang="en" data-theme={theme}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <RegisterServiceWorker />
          <PlayerProvider>
            <main className="safe-shell">{children}</main>
          </PlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
