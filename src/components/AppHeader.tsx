"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  if (pathname === "/login") {
    return null;
  }
  const displayName = getUserDisplayName(user, t("header.userFallback"));
  const greeting = t("header.userGreeting", {
    name: displayName ?? t("header.userFallback"),
  });
  const navItems = [
    { href: "/cronograma", label: t("header.nav.schedule") },
    { href: "/cronograma/empresas", label: t("header.nav.companies") },
    { href: "/cronograma/dashboard", label: t("header.nav.dashboard") },
  ];

  const isActive = (href: string) =>
    pathname === href || (href === "/cronograma" && pathname === "/");

  return (
    <header
      className="text-black"
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
          <nav className="hidden items-center gap-2 text-xs font-semibold text-slate-700 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 transition ${
                  isActive(item.href)
                    ? "text-slate-900"
                    : "text-slate-700 hover:text-slate-900"
                }`}
                style={{
                  backgroundColor: isActive(item.href)
                    ? "rgba(255, 222, 0, 0.6)"
                    : "transparent",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 sm:flex">
            <span>{greeting}</span>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:text-slate-900"
              >
                {t("header.signOut")}
              </button>
            </form>
          </div>

        </div>
      </div>

      <div className="sm:hidden">
        <nav className="mx-auto max-w-screen-2xl px-4 pb-4">
          <div className="flex flex-col gap-2 rounded-xl bg-white p-2 shadow-sm">
            <div className="flex flex-col gap-2 rounded-lg bg-white/70 p-2 text-xs font-semibold text-slate-700">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 transition ${
                    isActive(item.href)
                      ? "text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={{
                    backgroundColor: isActive(item.href)
                      ? "rgba(255, 222, 0, 0.6)"
                      : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700">
              <span>{greeting}</span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:text-slate-900"
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
