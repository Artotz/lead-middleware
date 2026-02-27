"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { createTranslator, getMessages, type Locale } from "@/lib/i18n";
import logoText from "@/assets/logo_text.png";
import bg from "@/assets/bg.png";

type BannerState =
  | { variant: "error"; message: string }
  | { variant: "success"; message: string }
  | null;

type LoginClientProps = {
  locale: Locale;
};

export default function LoginClient({ locale }: LoginClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const t = useMemo(() => createTranslator(getMessages(locale)), [locale]);

  const queryBanner = useMemo<BannerState | null>(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    if (error) return { variant: "error", message: error };
    if (message) return { variant: "success", message };
    return null;
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [banner, setBanner] = useState<BannerState | null | undefined>();
  const [loading, setLoading] = useState(false);

  const activeBanner = banner === undefined ? queryBanner : banner;

  const handlePasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBanner(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setBanner({
        variant: "error",
        message: error.message || t("login.errorDefault"),
      });
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10 text-slate-100"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(12, 15, 18, 0.18) 0%, rgba(12, 15, 18, 0.32) 45%, rgba(12, 15, 18, 0.55) 100%), url(${bg.src})`,
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        backgroundColor: "#14181d",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-5">
          <img
            src={logoText.src}
            alt={t("login.logoAlt")}
            className="h-50 w-auto"
          />
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-1 shadow-2xl shadow-slate-200">
            <div className="rounded-[22px] bg-[#FFDE00] p-[2px]">
              <div className="rounded-[20px] bg-white p-6 text-slate-900">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {t("login.title")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("login.subtitle")}
                    </p>
                  </div>

                  {activeBanner && (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        activeBanner.variant === "error"
                          ? "border-rose-200 bg-rose-50 text-rose-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {activeBanner.message}
                    </div>
                  )}

                  <form className="space-y-4" onSubmit={handlePasswordSignIn}>
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span>{t("login.emailLabel")}</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-slate-50 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        placeholder={t("login.emailPlaceholder")}
                        required
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span>{t("login.passwordLabel")}</span>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-slate-50 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        placeholder={t("login.passwordPlaceholder")}
                        required
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-[#FFDE00] shadow-lg shadow-slate-300 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? t("login.signingIn") : t("login.signIn")}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
