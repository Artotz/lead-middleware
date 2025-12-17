import { createServerClient, type SupabaseClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // cookies podem ser somente-leitura em alguns contextos (ex.: RSC)
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
        } catch {
          // ignora se cookies forem somente-leitura
        }
      },
    },
  });
}
