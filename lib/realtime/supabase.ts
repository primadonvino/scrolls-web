"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
export type ScrollsRealtimeChannel = ReturnType<SupabaseClient["channel"]>;

export function browserSupabaseClient() {
  const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseURL || !anonKey || anonKey.includes("replace-with")) return null;
  if (!client) {
    client = createClient(supabaseURL, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        params: {
          eventsPerSecond: 5
        }
      }
    });
  }
  return client;
}

export function setRealtimeAuth(token: string) {
  const supabase = browserSupabaseClient();
  supabase?.realtime.setAuth(token);
  return supabase;
}
