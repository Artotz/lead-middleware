import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSupabaseUserClient(): Promise<SupabaseClient> {
  return createSupabaseServerClient();
}
