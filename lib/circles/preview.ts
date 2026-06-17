import type { ScrollsCircleMessage } from "@/lib/types/scrolls";

// Mirrors the iOS `CircleEncryption.decrypt` + `CirclesStore.previewText` for the
// subset of messages that are actually readable on the web.
//
// Circle text from the main Scrolls app is AES-GCM sealed with a 256-bit root
// key stored ONLY in the device Keychain (kSecAttrAccessibleWhenUnlockedThisDeviceOnly)
// and never transmitted — so `v3:` / `v2:` / bare-base64 ciphertext can NEVER be
// decrypted here. We do not attempt it (no fake plaintext).
//
// What IS readable on the web:
//   - `plain:` bodies (standalone Circles app, moment replies) — iOS just strips the prefix.
//   - voice messages — the body marker holds an R2 URL, so we can label (and later play) them.

const PLAIN_PREFIX = "plain:";
const VOICE_MARKER = "[CIRCLE_VOICE_BASE64]";

export type CirclePreview =
  | { kind: "text"; text: string }
  | { kind: "voice" }
  | { kind: "encrypted" }
  | { kind: "empty" };

/** Strip the `plain:` wrapper if present; returns null when the body is device-encrypted. */
export function readableText(encryptedText?: string | null): string | null {
  if (!encryptedText) return null;
  if (encryptedText.startsWith(PLAIN_PREFIX)) return encryptedText.slice(PLAIN_PREFIX.length);
  // v3:/v2:/legacy base64 ciphertext — device-local key, unreadable on web.
  return null;
}

export function isVoiceMessage(message: ScrollsCircleMessage): boolean {
  if (message.voiceObjectKey && message.voiceObjectKey.trim().length > 0) return true;
  const body = readableText(message.encryptedText) ?? "";
  return body.trimStart().startsWith(VOICE_MARKER);
}

export function circlePreview(message?: ScrollsCircleMessage): CirclePreview {
  if (!message) return { kind: "empty" };
  if (isVoiceMessage(message)) return { kind: "voice" };
  const text = readableText(message.encryptedText);
  if (text === null) return { kind: "encrypted" };
  const trimmed = text.trim();
  if (trimmed.length === 0) return { kind: "encrypted" };
  return { kind: "text", text: trimmed };
}

/** Inbox preview line, optionally prefixed with "You: " when the viewer sent it. */
export function circlePreviewLabel(message: ScrollsCircleMessage | undefined, selfId?: string): string {
  const preview = circlePreview(message);
  const mine = Boolean(message && selfId && message.user?.id === selfId);
  switch (preview.kind) {
    case "empty":
      return "No messages yet";
    case "voice":
      return mine ? "You: 🎤 Voice message" : "🎤 Voice message";
    case "encrypted":
      return "🔒 Encrypted message";
    case "text":
      return mine ? `You: ${preview.text}` : preview.text;
  }
}
