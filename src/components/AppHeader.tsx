"use client";

import Link from "next/link";
import { useState } from "react";

type NavItem = {
  label: string;
  href?: string;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  // { label: "Home", disabled: true },
  // { label: "Dashboard", disabled: true },
  { label: "Cronograma", href: "/cronograma" },
  // { label: "Importar", disabled: true },
  { label: "Métricas", disabled: true },
];

const disabledNavClass =
  "rounded-lg px-3 py-2 text-slate-400 bg-slate-100/60 cursor-not-allowed";
const enabledNavClass =
  "rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";

export function AppHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
            VFS
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              Veneza Field Service
            </p>
            <p className="hidden text-xs text-slate-500 sm:block"></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-2 text-sm font-semibold sm:flex">
            {navItems.map((item) =>
              item.disabled ? (
                <button
                  key={item.label}
                  type="button"
                  disabled
                  className={disabledNavClass}
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.label}
                  href={item.href ?? "#"}
                  className={enabledNavClass}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 sm:hidden"
            aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span className="sr-only">Menu</span>
            <div className="flex flex-col gap-1.5">
              <span className="h-0.5 w-5 rounded-full bg-slate-700" />
              <span className="h-0.5 w-5 rounded-full bg-slate-700" />
              <span className="h-0.5 w-5 rounded-full bg-slate-700" />
            </div>
          </button>
        </div>
      </div>

      <div className={`sm:hidden ${isOpen ? "block" : "hidden"}`}>
        <nav className="mx-auto max-w-screen-2xl px-4 pb-4">
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            {navItems.map((item) =>
              item.disabled ? (
                <button
                  key={item.label}
                  type="button"
                  disabled
                  className={`${disabledNavClass} w-full text-left`}
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.label}
                  href={item.href ?? "#"}
                  className={`${enabledNavClass} w-full`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
