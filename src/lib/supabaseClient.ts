import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";

/**
 * Compat wrapper para manter imports antigos enquanto migramos para o client SSR.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  return createSupabaseServerClient();
}
