import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export default async function ProtectedDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const email = session.user.email ?? "usuário";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Área autenticada
        </p>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">
              Sessão carregada no servidor, sem flicker e com cookies sincronizados.
            </p>
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-600">Bem-vindo</p>
          <p className="text-lg font-semibold text-slate-900">Olá, {email}</p>
          <p className="mt-2 text-sm text-slate-500">
            Sua sessão foi obtida via SSR. Navegue pelas rotas em /app sem precisar refazer login.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-700">Próximos passos</p>
          <p className="mt-2 text-sm text-slate-600">
            Use o menu superior para voltar ao dashboard público ou métricas. O middleware já redireciona usuários
            logados diretamente para este painel e protege qualquer rota em /app.
          </p>
        </div>
      </div>
    </div>
  );
}
