export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Erro 404
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          Rota nÃ£o encontrada
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          A pÃ¡gina que vocÃª tentou acessar nÃ£o estÃ¡ disponÃ­vel.
        </p>
        <a
          href="/cronograma"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Ir para o cronograma
        </a>
      </div>
    </div>
  );
}
