"use client";

import { FiltersState, SortOrder } from "@/lib/filters";

type FiltersBarProps = {
  value: FiltersState;
  regiaoOptions?: string[];
  estadoOptions?: string[];
  tipoLeadOptions?: string[];
  sortOptions?: { id: SortOrder; label: string }[];
  searchPlaceholder?: string;
  searchLabel?: string;
  regiaoLabel?: string;
  estadoLabel?: string;
  tipoLeadLabel?: string;
  onFiltersChange: (filters: FiltersState) => void;
};

const defaultSortOptions: { id: SortOrder; label: string }[] = [
  { id: "recentes", label: "Mais recentes" },
  { id: "antigos", label: "Mais antigos" },
];

export function FiltersBar({
  value,
  regiaoOptions,
  estadoOptions,
  tipoLeadOptions = [],
  sortOptions = defaultSortOptions,
  searchPlaceholder = "Buscar...",
  searchLabel = "Busca",
  regiaoLabel = "Região",
  estadoLabel = "Estado",
  tipoLeadLabel = "Tipo de lead",
  onFiltersChange,
}: FiltersBarProps) {
  const handleChange = <K extends keyof FiltersState>(
    key: K,
    val: FiltersState[K],
  ) => {
    onFiltersChange({ ...value, [key]: val });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {searchLabel}
          <input
            type="search"
            value={value.search}
            onChange={(e) => handleChange("search", e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </label>

        {regiaoOptions !== undefined && (
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {regiaoLabel}
            <select
              value={value.regiao}
              onChange={(e) => handleChange("regiao", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">Todas</option>
              {regiaoOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}

        {estadoOptions !== undefined && (
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {estadoLabel}
            <select
              value={value.estado}
              onChange={(e) => handleChange("estado", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">Todos</option>
              {estadoOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {tipoLeadLabel}
          <select
            value={value.tipoLead}
            onChange={(e) => handleChange("tipoLead", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">Todos</option>
            {tipoLeadOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Ordenação
          <select
            value={value.sort}
            onChange={(e) => handleChange("sort", e.target.value as SortOrder)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
