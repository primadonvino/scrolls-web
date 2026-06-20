import { browserSupabaseClient } from "@/lib/realtime/supabase";
import type { ScrollsPost, ScrollsUser } from "@/lib/types/scrolls";

/**
 * Loads a profile's rescrolls. There is no server endpoint that lists a user's
 * rescrolls (the iOS app shows them from local state, and `/posts/by-author`
 * only returns authored posts), so we read them straight from the public-select
 * `rescrolls` / `posts` / `users` tables via Supabase REST and assemble rescroll
 * post objects in the same shape the feed produces (id = rescroll id, author =
 * the rescroller, rescrollOrigin = the original post's author/caption).
 */
export async function fetchAuthorRescrolls(profile: ScrollsUser): Promise<ScrollsPost[]> {
  const supabase = browserSupabaseClient();
  if (!supabase || !profile?.id) return [];
  const profileId = profile.id.toLowerCase();

  const { data: rescrollRows, error } = await supabase
    .from("rescrolls")
    .select("id, original_post_id, quote_text, created_at")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error || !rescrollRows?.length) return [];

  const postIds = Array.from(new Set(rescrollRows.map((row) => String(row.original_post_id))));
  const { data: postRows } = await supabase.from("posts").select("*").in("id", postIds).is("deleted_at", null);
  const postsById = new Map((postRows ?? []).map((row) => [String(row.id).toLowerCase(), row as Record<string, unknown>]));

  const authorIds = Array.from(new Set((postRows ?? []).map((row) => String(row.author_id).toLowerCase())));
  const { data: userRows } = authorIds.length
    ? await supabase.from("users").select("*").in("id", authorIds)
    : { data: [] as Record<string, unknown>[] };
  const usersById = new Map((userRows ?? []).map((row) => [String(row.id).toLowerCase(), row as ScrollsUser]));

  const out: ScrollsPost[] = [];
  for (const row of rescrollRows) {
    const post = postsById.get(String(row.original_post_id).toLowerCase());
    if (!post) continue; // original deleted / unavailable
    const quote = String(row.quote_text ?? "").trim() || null;
    const createdAt = String(row.created_at ?? "");
    out.push({
      ...post,
      id: String(row.id),
      author: profile,
      user: profile,
      quoteText: quote,
      quote_text: quote,
      createdAt,
      created_at: createdAt,
      rescrollOrigin: {
        postID: String(row.original_post_id),
        user: usersById.get(String(post.author_id).toLowerCase()),
        caption: (post.caption as string | null) ?? null,
        timestamp: String(post.created_at ?? "")
      }
    } as ScrollsPost);
  }
  return out;
}
