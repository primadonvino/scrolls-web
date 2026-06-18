import { userAvatarURL } from "@/lib/media/urls";
import type { ScrollsUser } from "@/lib/types/scrolls";

export function Avatar({ user, size = 48 }: { user?: ScrollsUser | null; size?: number }) {
  const src = userAvatarURL(user);
  const name = user?.displayName ?? user?.display_name ?? user?.username ?? "Scrolls";
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-scrolls-panel2"
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src ?? "/icon.png"} alt={name} className="h-full w-full object-cover" />
    </div>
  );
}
