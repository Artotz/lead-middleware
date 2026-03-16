import { Suspense } from "react";
import LoginClient from "./login-client";
import { createTranslator, DEFAULT_LOCALE, getMessages } from "@/lib/i18n";

export default function LoginPage() {
  const t = createTranslator(getMessages(DEFAULT_LOCALE));

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-sm text-slate-500">
          {t("login.loading")}
        </div>
      }
    >
      <LoginClient locale={DEFAULT_LOCALE} />
    </Suspense>
  );
}

