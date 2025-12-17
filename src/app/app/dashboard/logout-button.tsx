"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await fetch("/auth/logout", {
        method: "POST",
      });

      const nextUrl = response.url || "/login";
      router.replace(nextUrl);
      router.refresh();
    } catch (err) {
      console.error("logout error", err);
      router.replace("/login?error=Não foi possível encerrar a sessão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-100 transition hover:border-slate-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
