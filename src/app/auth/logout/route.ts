import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTranslator, getLocaleFromHeaders, getMessages } from "@/lib/i18n";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  const locale = getLocaleFromHeaders(request.headers);
  const t = createTranslator(getMessages(locale));
  const redirectUrl = new URL("/login", request.url);

  if (error) {
    redirectUrl.searchParams.set("error", t("auth.logoutError"));
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  redirectUrl.searchParams.set("message", t("auth.logoutSuccess"));
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
