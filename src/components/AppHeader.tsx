"use client";

import Link from "next/link";
import { useMemo } from "react";
import logo from "@/assets/logo.png";
import { getUserDisplayName, useAuth } from "@/contexts/AuthContext";
import { createTranslator, getMessages, type Locale } from "@/lib/i18n";

type AppHeaderProps = {
  locale: Locale;
};

export function AppHeader({ locale }: AppHeaderProps) {
  const { user } = useAuth();
  const t = useMemo(() => createTranslator(getMessages(locale)), [locale]);
  const displayName = getUserDisplayName(user, t("header.userFallback"));
  const greeting = t("header.userGreeting", {
    name: displayName ?? t("header.userFallback"),
  });

  return (
    <header
      className="border-b border-amber-300/60 text-black"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-[#FFDE00]">
            VFS
          </div> */}
          <img
            src={logo.src}
            alt={t("header.logoAlt")}
            className="h-9 w-auto shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-black">
              {t("header.brandName")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 rounded-lg border border-amber-300/40 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 sm:flex">
            <span>{greeting}</span>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-amber-300/40 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-amber-400 hover:text-slate-900"
              >
                {t("header.signOut")}
              </button>
            </form>
          </div>

        </div>
      </div>

      <div className="sm:hidden">
        <nav className="mx-auto max-w-screen-2xl px-4 pb-4">
          <div className="flex flex-col gap-2 rounded-xl border border-amber-300/60 bg-white p-2 shadow-sm">
            <div className="flex flex-col gap-2 rounded-lg border border-amber-300/40 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700">
              <span>{greeting}</span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="w-full rounded-lg border border-amber-300/40 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-amber-400 hover:text-slate-900"
                >
                  {t("header.signOut")}
                </button>
              </form>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
