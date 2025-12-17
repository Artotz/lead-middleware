import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const nextPath = next && next.startsWith("/") ? next : "/app/dashboard";

  if (!code) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set(
      "error",
      "Link de acesso inválido ou expirado. Faça login novamente."
    );
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set(
      "error",
      "Não foi possível validar seu login. Tente novamente."
    );
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
