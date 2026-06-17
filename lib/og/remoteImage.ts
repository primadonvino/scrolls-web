/**
 * Loads a remote image as a base64 data URL for embedding in an `ImageResponse`
 * (OG cards). Returns null on any failure or oversized image so the card can
 * fall back to a branded layout instead of erroring the whole image route.
 * Runs in the edge runtime, so it uses `btoa` rather than `Buffer`.
 */
export async function loadRemoteImage(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared && declared > 6_000_000) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > 6_000_000) return null;
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${type};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}
