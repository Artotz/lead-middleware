import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";

export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  return createSupabaseServerClient();
}
