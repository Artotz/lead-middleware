import { Suspense } from "react";
import { headers } from "next/headers";
import LoginClient from "./login-client";
import { createTranslator, getLocaleFromHeaders, getMessages } from "@/lib/i18n";

export default function LoginPage() {
  const locale = getLocaleFromHeaders(headers());
  const t = createTranslator(getMessages(locale));

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-120px)] items-center justify-center bg-slate-50 px-4 py-10 text-sm text-slate-500">
          {t("login.loading")}
        </div>
      }
    >
      <LoginClient locale={locale} />
    </Suspense>
  );
}
