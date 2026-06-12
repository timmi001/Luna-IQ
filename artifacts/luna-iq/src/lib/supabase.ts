import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Luna] Supabase env vars missing — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings");
}

// Single global instance — never call createClient more than once.
// Falls back to placeholder values so the app renders (login page) even when
// env vars are not configured; all auth calls will gracefully fail.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      storageKey: "luna-iq-auth",
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
