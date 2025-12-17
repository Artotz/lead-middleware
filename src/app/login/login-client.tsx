"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BannerState =
  | { variant: "error"; message: string }
  | { variant: "success"; message: string }
  | null;

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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
        message:
          error.message ||
          "Não foi possível entrar com email e senha. Verifique os dados e tente novamente.",
      });
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200">
        <div className="grid gap-6 bg-gradient-to-br from-sky-600 to-indigo-700 px-8 py-10 text-white md:grid-cols-[1.1fr_1fr] md:gap-0">
          <div className="flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Leads & Tickets
              </p>
              <h1 className="text-3xl font-semibold leading-tight">
                Acesse o painel seguro
              </h1>
              <p className="text-sm text-white/80">
                Entre para visualizar dashboards e métricas privadas sem
                flicker.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/90 shadow-inner">
              Sessões são preservadas com cookies seguros. Faça login para
              acessar o dashboard.
            </div>
          </div>

          <div className="rounded-2xl border border-white/30 bg-white p-6 text-slate-900 shadow-lg shadow-indigo-100/50">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Faça login
                </p>
                <p className="text-xs text-slate-500">Entre com email e senha.</p>
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
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-slate-50 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    placeholder="seu@email.com"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Senha</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-slate-50 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    placeholder="********"
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

