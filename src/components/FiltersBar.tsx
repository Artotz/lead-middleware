"use client";

export type SortOrder = "recentes" | "antigos";

export type FiltersState = {
  search: string;
  empresa: string;
  tipoLead: string;
  sort: SortOrder;
};

type FiltersBarProps = {
  value: FiltersState;
  empresaOptions?: string[];
  tipoLeadOptions?: string[];
  sortOptions?: { id: SortOrder; label: string }[];
  searchPlaceholder?: string;
  onFiltersChange: (filters: FiltersState) => void;
};

const defaultSortOptions: { id: SortOrder; label: string }[] = [
  { id: "recentes", label: "Mais recentes" },
  { id: "antigos", label: "Mais antigos" },
];

export function FiltersBar({
  value,
  empresaOptions = [],
  tipoLeadOptions = [],
  sortOptions = defaultSortOptions,
  searchPlaceholder = "Buscar...",
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
      <div className="grid gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Busca
          <input
            type="search"
            value={value.search}
            onChange={(e) => handleChange("search", e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Empresa
          <select
            value={value.empresa}
            onChange={(e) => handleChange("empresa", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">Todas</option>
            {empresaOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tipo de lead
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
