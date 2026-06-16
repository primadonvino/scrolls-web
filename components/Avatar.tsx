import { userAvatarURL } from "@/lib/media/urls";
import type { ScrollsUser } from "@/lib/types/scrolls";

export function Avatar({ user, size = 48 }: { user?: ScrollsUser | null; size?: number }) {
  const src = userAvatarURL(user);
  const name = user?.displayName ?? user?.display_name ?? user?.username ?? "?";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-scrolls-blue to-scrolls-gold text-sm font-bold text-white"
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}
