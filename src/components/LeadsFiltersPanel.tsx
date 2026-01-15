"use client";

import { useMemo } from "react";
import {
  ESTADOS,
  FiltersState,
  LEAD_STATUS_OPTIONS,
  LEAD_TYPES,
  REGIOES,
} from "@/lib/filters";
import { FiltersBar } from "./FiltersBar";

type LeadsFiltersPanelProps = {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  showGrouping?: boolean;
};

export function LeadsFiltersPanel({
  filters,
  onFiltersChange,
  showGrouping = true,
}: LeadsFiltersPanelProps) {
  const regiaoOptions = useMemo(() => REGIOES.slice(), []);
  const estadoOptions = useMemo(() => ESTADOS.slice(), []);
  const tipoLeadOptions = useMemo(() => LEAD_TYPES.slice(), []);
  const resolvedStatusOptions = useMemo(
    () => LEAD_STATUS_OPTIONS.slice(),
    [],
  );

  const handleToggle = (key: "groupByEmpresa" | "groupByChassi") => {
    onFiltersChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className="space-y-4">
      <FiltersBar
        value={filters}
        regiaoOptions={regiaoOptions}
        estadoOptions={estadoOptions}
        tipoLeadOptions={tipoLeadOptions.map((id) => id)}
        statusOptions={resolvedStatusOptions}
        searchPlaceholder="Buscar por chassi, modelo, cidade, consultor ou cliente"
        regiaoLabel="Regiao"
        estadoLabel="Estado"
        tipoLeadLabel="Tipo de lead"
        onFiltersChange={onFiltersChange}
      />

      {showGrouping ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Agrupar
          </span>
          <button
            type="button"
            onClick={() => handleToggle("groupByEmpresa")}
            aria-pressed={filters.groupByEmpresa}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              filters.groupByEmpresa
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            Empresa
          </button>
          <button
            type="button"
            onClick={() => handleToggle("groupByChassi")}
            aria-pressed={filters.groupByChassi}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              filters.groupByChassi
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            Chassi
          </button>
        </div>
      ) : null}
    </div>
  );
}
