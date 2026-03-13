"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildLoginPath } from "@/lib/authRedirect";
import { useAuth } from "@/contexts/AuthContext";
import { createTranslator, DEFAULT_LOCALE, getMessages } from "@/lib/i18n";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useMemo(
    () => createTranslator(getMessages(DEFAULT_LOCALE)),
    [],
  );

  useEffect(() => {
    if (!loading && !user) {
      const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      router.replace(
        buildLoginPath({
          next: currentPath,
        }),
      );
    }
  }, [loading, pathname, router, searchParams, t, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10 text-sm text-slate-500">
        {t("schedule.loading")}
      </div>
    );
  }

  return <>{children}</>;
}
