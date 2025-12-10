"use client";

import { useMemo } from "react";
import { Lead, LeadCategory } from "@/lib/domain";
import {
  ESTADOS,
  FiltersState,
  LEAD_TYPES,
  REGIOES,
} from "@/lib/filters";
import { Badge } from "./Badge";
import { FiltersBar } from "./FiltersBar";

type LeadsListProps = {
  leads: Lead[];
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  loading?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

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

export function LeadsList({
  leads,
  filters,
  onFiltersChange,
  loading = false,
}: LeadsListProps) {
  const regiaoOptions = useMemo(
    () => REGIOES.slice(),
    [],
  );

  const estadoOptions = useMemo(
    () => ESTADOS.slice(),
    [],
  );

  const tipoLeadOptions = useMemo(() => LEAD_TYPES.slice(), []);

  return (
    <div className="space-y-4">
      <FiltersBar
        value={filters}
        regiaoOptions={regiaoOptions}
        estadoOptions={estadoOptions}
        tipoLeadOptions={tipoLeadOptions.map((id) => id)}
        searchPlaceholder="Buscar por chassi, modelo, cidade ou grupo"
        regiaoLabel="Região"
        estadoLabel="Estado"
        tipoLeadLabel="Tipo de lead"
        onFiltersChange={onFiltersChange}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[0.8fr_0.8fr_1fr_1fr_1fr_0.9fr_0.9fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span>Região</span>
          <span>Estado</span>
          <span>Cidade</span>
          <span>Chassi / Modelo</span>
          <span>Tipo de lead</span>
          <span>Horímetro</span>
          <span>Último contato</span>
          <span>Importado em</span>
        </div>

        <div className="divide-y divide-slate-200">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="grid grid-cols-[0.8fr_0.8fr_1fr_1fr_1fr_0.9fr_0.9fr_0.9fr] items-center gap-4 px-5 py-3 text-sm text-slate-800 hover:bg-slate-50"
            >
              <div>
                <Badge tone="sky">{lead.regional ?? "Sem regional"}</Badge>
              </div>
              <div>
                <Badge tone="slate">{lead.estado ?? "Sem estado"}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-900">
                    {lead.city ?? "Cidade não informada"}
                  </span>
                  <span className="text-xs text-slate-500">
                    Cliente: {lead.clienteBaseEnriquecida ?? "N/A"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="emerald">{lead.chassi ?? "Sem chassi"}</Badge>
                <Badge tone="violet">
                  {lead.modelName ?? "Modelo não informado"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {(lead.tipoLeadList?.length
                  ? lead.tipoLeadList
                  : [lead.tipoLead]
                ).map((tipo) => (
                  <Badge key={tipo} tone={leadTypeTone[tipo]}>
                    {leadTypeLabel[tipo]}
                  </Badge>
                ))}
              </div>
              <div className="text-slate-800">
                {lead.horimetroAtualMachineList !== null
                  ? `${numberFormatter.format(
                      lead.horimetroAtualMachineList,
                    )} h`
                  : "N/A"}
              </div>
              <div className="text-slate-800">
                {lead.lastCalledGroup ?? "Sem info"}
              </div>
              <div className="text-slate-800">{formatDate(lead.importedAt)}</div>
            </div>
          ))}
          {leads.length === 0 && (
            <div className="px-5 py-4 text-sm text-slate-500">
              {loading
                ? "Carregando leads..."
                : "Nenhum lead encontrado com esses filtros."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
