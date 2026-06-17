import { ImageResponse } from "next/og";
import { fetchProfile } from "@/lib/api/scrolls";
import { userAvatarURL } from "@/lib/media/urls";
import { loadRemoteImage } from "@/lib/og/remoteImage";

export const runtime = "edge";
export const alt = "Scrolls profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOUNDER_BADGE_USERNAMES = new Set([
  "primadonvino",
  "scrolls",
  "gelanella",
  "ovispictures",
  "amerigomagazine",
  "provostodaro"
]);

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let displayName = `@${username}`;
  let handle = `@${username}`;
  let bio = "Profiles, posts, music, and moments on Scrolls.";
  let badges = "";
  let avatarURL: string | null = null;

  try {
    const profile = await fetchProfile(username);
    displayName = profile.displayName ?? profile.display_name ?? profile.username ?? handle;
    handle = `@${profile.username ?? username}`;
    bio = profile.bio?.trim() || bio;
    avatarURL = userAvatarURL(profile);
    const uname = (profile.username ?? username).toLowerCase();
    const founderBadge = FOUNDER_BADGE_USERNAMES.has(uname);
    const marks: string[] = [];
    if ((profile.isFounder ?? profile.is_founder) || founderBadge) marks.push("📜 Founder");
    const plan = (profile.subscriptionPlan ?? profile.subscription_plan ?? "").trim().toLowerCase();
    if (plan === "02" || plan === "scrolls.gold.monthly" || founderBadge) marks.push("★ Gold");
    if ((profile.isVerified ?? profile.is_verified) || founderBadge) marks.push("✓ Verified");
    badges = marks.join("   ");
  } catch {
    // Render the generic card.
  }

  const avatarData = await loadRemoteImage(avatarURL);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          background: "#0b0b0d",
          padding: "72px",
          color: "white",
          fontFamily: "sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            width: 300,
            height: 300,
            borderRadius: 36,
            overflow: "hidden",
            flexShrink: 0,
            background: "linear-gradient(135deg, #0a84ff 0%, #d6b36c 100%)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 140,
            fontWeight: 800
          }}
        >
          {avatarData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarData} width={300} height={300} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          ) : (
            displayName.trim().charAt(0).toUpperCase() || "S"
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: "#d6b36c", fontWeight: 700 }}>
            Scrolls
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>{truncate(displayName, 40)}</div>
          <div style={{ display: "flex", fontSize: 34, color: "rgba(255,255,255,0.6)" }}>{handle}</div>
          {badges ? <div style={{ display: "flex", fontSize: 30, color: "#d6b36c" }}>{badges}</div> : null}
          <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.75)", maxWidth: 720 }}>{truncate(bio, 120)}</div>
        </div>
      </div>
    ),
    size
  );
}
