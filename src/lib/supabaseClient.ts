import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const readEnv = (value: string | undefined) => value?.trim() ?? "";
  const supabaseUrl =
    readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    readEnv(process.env.VITE_SUPABASE_URL);
  const supabaseAnonKey =
    readEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    readEnv(process.env.VITE_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) {
      missing.push("NEXT_PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL)");
    }
    if (!supabaseAnonKey) {
      missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)");
    }
    throw new Error(
      `Supabase env missing: ${missing.join(", ")}.`,
    );
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
