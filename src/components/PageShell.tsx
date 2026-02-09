"use client";

import { useEffect } from "react";

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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        {(title || subtitle) && (
          <header className="space-y-1">
            {title && (
              <h1 className="text-2xl font-semibold text-slate-900">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-slate-600">{subtitle}</p>
            )}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
