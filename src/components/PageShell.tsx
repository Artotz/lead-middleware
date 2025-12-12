"use client";

type PageShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export function PageShell({ children, title, subtitle }: PageShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-6 py-10">
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
