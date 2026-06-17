import { normalizedAssetURL } from "@/lib/media/urls";
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

type VoicePayload = {
  url?: string;
  provider?: string;
  bucket?: string;
  objectKey?: string;
  durationSeconds?: number;
  expiresAt?: string;
};

function decodeBase64(value: string): string | null {
  try {
    if (typeof atob === "function") return atob(value);
    // Node / SSR fallback.
    return Buffer.from(value, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

/** Parse the `[CIRCLE_VOICE_BASE64]` marker payload out of a message body. */
function parseVoicePayload(message: ScrollsCircleMessage): VoicePayload | null {
  const body = (readableText(message.encryptedText) ?? "").trim();
  if (!body.startsWith(VOICE_MARKER)) return null;
  const encoded = body.slice(VOICE_MARKER.length).trim();
  const json = decodeBase64(encoded);
  if (!json) return null;
  try {
    return JSON.parse(json) as VoicePayload;
  } catch {
    return null;
  }
}

/**
 * Resolve a playable URL for a voice message. Mirrors iOS `CircleMessage.voiceURL`:
 * prefer the stored object key, then the payload url, then the payload object key.
 */
export function circleVoiceURL(message: ScrollsCircleMessage): string | null {
  if (message.voiceObjectKey && message.voiceObjectKey.trim().length > 0) {
    return normalizedAssetURL(message.voiceObjectKey);
  }
  const payload = parseVoicePayload(message);
  if (!payload) return null;
  if (payload.url && payload.url.trim().length > 0) return payload.url;
  if (payload.objectKey && payload.objectKey.trim().length > 0) return normalizedAssetURL(payload.objectKey);
  return null;
}

export function circleVoiceDurationSeconds(message: ScrollsCircleMessage): number | null {
  const payload = parseVoicePayload(message);
  return typeof payload?.durationSeconds === "number" ? payload.durationSeconds : null;
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
