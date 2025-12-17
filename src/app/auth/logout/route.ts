import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  const redirectUrl = new URL("/login", request.url);

  if (error) {
    redirectUrl.searchParams.set(
      "error",
      "Não foi possível encerrar a sessão. Tente novamente."
    );
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("message", "Você saiu da sua conta com segurança.");
  return NextResponse.redirect(redirectUrl);
}
