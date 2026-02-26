"use client";

import { useEffect } from "react";
import bg from "@/assets/bg.png";
import logo from "@/assets/logo.png";
import cscLogo from "@/assets/csc_logo.png";

type PageShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerNav?: React.ReactNode;
};

export function PageShell(props: PageShellProps) {
  const { children, title, headerNav } = props;
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
                  <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                    {title}
                  </h1>
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
