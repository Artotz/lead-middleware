"use client";

import { useEffect } from "react";
import bg from "@/assets/bg.png";

type PageShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export function PageShell({ children, title, subtitle }: PageShellProps) {
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
        {(title || subtitle) && (
          <header className="space-y-1">
            {title && (
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="max-w-2xl text-sm text-slate-200">
                {subtitle}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
