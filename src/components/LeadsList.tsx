"use client";

import { useMemo, useState } from "react";
import { Lead, LeadCategory } from "@/lib/domain";
import { Badge } from "./Badge";
import { FiltersBar, FiltersState } from "./FiltersBar";

type LeadsListProps = {
  leads: Lead[];
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

const initialFilters: FiltersState = {
  search: "",
  empresa: "",
  tipoLead: "",
  sort: "recentes",
};

const leadTypeTone: Record<LeadCategory, Parameters<typeof Badge>[0]["tone"]> =
  {
    preventiva: "sky",
    garantia_basica: "amber",
    garantia_estendida: "amber",
    reforma_componentes: "violet",
    lamina: "emerald",
    dentes: "emerald",
    rodante: "emerald",
    disponibilidade: "sky",
    reconexao: "slate",
    transferencia_aor: "slate",
    indefinido: "stone",
  };

const leadTypeLabel: Record<LeadCategory, string> = {
  preventiva: "Preventiva",
  garantia_basica: "Garantia básica",
  garantia_estendida: "Garantia estendida",
  reforma_componentes: "Reforma de componentes",
  lamina: "Lâmina",
  dentes: "Dentes",
  rodante: "Rodante",
  disponibilidade: "Disponibilidade",
  reconexao: "Reconexão",
  transferencia_aor: "Transferência de AOR",
  indefinido: "Indefinido",
};

const formatDate = (iso: string) => dateFormatter.format(new Date(iso));

export function LeadsList({ leads }: LeadsListProps) {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);

  const empresaOptions = useMemo(
    () =>
      Array.from(
        new Set(
          leads.map((lead) =>
            [lead.regional, lead.estado].filter(Boolean).join(" / "),
          ),
        ),
      )
        .filter(Boolean)
        .sort(),
    [leads],
  );

  const tipoLeadOptions = useMemo(
    () =>
      Array.from(new Set(leads.map((lead) => lead.tipoLead || "indefinido")))
        .filter(Boolean)
        .sort(),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    const sorted = [...leads].sort((a, b) => {
      const aDate = new Date(a.importedAt).getTime();
      const bDate = new Date(b.importedAt).getTime();
      return filters.sort === "recentes" ? bDate - aDate : aDate - bDate;
    });

    return sorted.filter((lead) => {
      const matchesEmpresa =
        !filters.empresa ||
        [lead.regional, lead.estado].filter(Boolean).join(" / ") ===
          filters.empresa;
      const matchesTipo =
        !filters.tipoLead || lead.tipoLead === filters.tipoLead;
      const matchesSearch =
        !searchTerm ||
        (lead.chassi ?? "").toLowerCase().includes(searchTerm) ||
        (lead.modelName ?? "").toLowerCase().includes(searchTerm) ||
        (lead.city ?? "").toLowerCase().includes(searchTerm) ||
        (lead.regional ?? "").toLowerCase().includes(searchTerm) ||
        (lead.estado ?? "").toLowerCase().includes(searchTerm) ||
        (lead.lastCalledGroup ?? "").toLowerCase().includes(searchTerm);

      return matchesEmpresa && matchesTipo && matchesSearch;
    });
  }, [filters, leads]);

  return (
    <div className="space-y-4">
      <FiltersBar
        value={filters}
        empresaOptions={empresaOptions}
        tipoLeadOptions={tipoLeadOptions.map((id) => id)}
        searchPlaceholder="Buscar por chassi, modelo, cidade ou grupo"
        empresaLabel="Regional / Estado"
        tipoLeadLabel="Tipo de lead"
        onFiltersChange={setFilters}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_0.9fr_0.9fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span>Regional / Estado</span>
          <span>Cidade</span>
          <span>Chassi / Modelo</span>
          <span>Tipo de lead</span>
          <span>Horímetro</span>
          <span>Último contato</span>
          <span>Importado em</span>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="grid grid-cols-[1.1fr_1fr_1fr_1fr_0.9fr_0.9fr_0.9fr] items-center gap-4 px-5 py-3 text-sm text-slate-800 hover:bg-slate-50"
            >
              <div className="flex flex-col gap-1">
                <Badge tone="sky">
                  {[lead.regional, lead.estado].filter(Boolean).join(" / ") ||
                    "Sem regional"}
                </Badge>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-900">
                  {lead.city ?? "Cidade não informada"}
                </span>
                <span className="text-xs text-slate-500">
                  Cliente: {lead.clienteBaseEnriquecida ?? "N/A"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="emerald">{lead.chassi ?? "Sem chassi"}</Badge>
                <Badge tone="violet">{lead.modelName ?? "Modelo não informado"}</Badge>
              </div>
              <div>
                <Badge tone={leadTypeTone[lead.tipoLead]}>
                  {leadTypeLabel[lead.tipoLead]}
                </Badge>
              </div>
              <div className="text-slate-800">
                {lead.horimetroAtualMachineList !== null
                  ? `${numberFormatter.format(
                      lead.horimetroAtualMachineList,
                    )} h`
                  : "—"}
              </div>
              <div className="text-slate-800">
                {lead.lastCalledGroup ?? "Sem info"}
              </div>
              <div className="text-slate-800">{formatDate(lead.importedAt)}</div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="px-5 py-4 text-sm text-slate-500">
              Nenhum lead encontrado com esses filtros.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
