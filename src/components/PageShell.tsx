"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import bg from "@/assets/bg.png";
import cscLogo from "@/assets/csc_logo.png";
import { DEFAULT_LOCALE, createTranslator, getMessages } from "@/lib/i18n";

type PageShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerNav?: React.ReactNode;
};

export function PageShell(props: PageShellProps) {
  const { children, title, headerNav } = props;
  const router = useRouter();
  const pathname = usePathname();
  const t = useMemo(
    () => createTranslator(getMessages(DEFAULT_LOCALE)),
    [],
  );
  const canGoBack =
    pathname !== null &&
    typeof window !== "undefined" &&
    window.history.length > 1;

  useEffect(() => {
    document.body.classList.add("hide-scrollbar");
    document.documentElement.classList.add("hide-scrollbar");
    return () => {
      document.body.classList.remove("hide-scrollbar");
      document.documentElement.classList.remove("hide-scrollbar");
    };
  }, []);

  return (
    <div
      className="min-h-screen text-slate-100"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(12, 15, 18, 0.18) 0%, rgba(12, 15, 18, 0.32) 45%, rgba(12, 15, 18, 0.55) 100%), url(${bg.src})`,
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        backgroundColor: "#14181d",
      }}
    >
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        {(title || headerNav) && (
          <header className="space-y-3">
            {(title || headerNav) && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                {title ? (
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      disabled={!canGoBack}
                      aria-label={t(
                        canGoBack ? "pageShell.back" : "pageShell.backDisabled",
                      )}
                      title={t(
                        canGoBack ? "pageShell.back" : "pageShell.backDisabled",
                      )}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        className="h-5 w-5"
                        fill="none"
                      >
                        <path
                          d="M11.75 4.5 6.25 10l5.5 5.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <h1 className="min-w-0 text-2xl font-semibold text-white sm:text-3xl">
                      {title}
                    </h1>
                  </div>
                ) : (
                  <span />
                )}
                <img
                  src={cscLogo.src}
                  alt="CSC"
                  className="h-12 w-auto sm:h-14"
                />
              </div>
            )}
            {headerNav && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                {headerNav}
              </div>
            )}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
