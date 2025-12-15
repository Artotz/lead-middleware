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

type ColumnId =
  | "regional"
  | "estado"
  | "cidade"
  | "cliente"
  | "chassiModelo"
  | "tipoLead"
  | "horimetro"
  | "importadoEm";

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

const columnLabels: Record<ColumnId, string> = {
  regional: "Região",
  estado: "Estado",
  cidade: "Cidade",
  cliente: "Cliente",
  chassiModelo: "Chassi / Modelo",
  tipoLead: "Tipo de lead",
  horimetro: "Horímetro",
  importadoEm: "Importado em",
};

const columnWidths: Record<ColumnId, string> = {
  regional: "0.9fr",
  estado: "0.9fr",
  cidade: "1.3fr",
  cliente: "1.4fr",
  chassiModelo: "1.3fr",
  tipoLead: "1.3fr",
  horimetro: "1fr",
  importadoEm: "1fr",
};

const buildColumnOrder = (
  groupByEmpresa?: boolean,
  groupByChassi?: boolean,
): ColumnId[] => {
  const base: ColumnId[] = [
    "regional",
    "estado",
    "cidade",
    "cliente",
    "chassiModelo",
    "tipoLead",
    "horimetro",
    "importadoEm",
  ];
  const prioritized: ColumnId[] = [];
  if (groupByEmpresa) prioritized.push("cliente");
  if (groupByChassi) prioritized.push("chassiModelo");
  return [...new Set([...prioritized, ...base])];
};

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

  const columnOrder = useMemo(
    () => buildColumnOrder(filters.groupByEmpresa, filters.groupByChassi),
    [filters.groupByChassi, filters.groupByEmpresa],
  );

  const gridTemplateColumns = columnOrder
    .map((col) => columnWidths[col])
    .join(" ");

  const makeGroupKey = useMemo(() => {
    return (lead: Lead) => {
      const parts: string[] = [];
      if (filters.groupByEmpresa) {
        parts.push(lead.clienteBaseEnriquecida ?? "Sem cliente");
      }
      if (filters.groupByChassi) {
        parts.push(lead.chassi ?? "Sem chassi");
      }
      return parts.join("::");
    };
  }, [filters.groupByChassi, filters.groupByEmpresa]);

  const groupedLeads = useMemo(() => {
    return leads.reduce<
      { lead: Lead; groupKey: string; groupIndex: number }[]
    >((acc, lead) => {
      const groupKey = makeGroupKey(lead);
      const last = acc[acc.length - 1];
      const groupIndex =
        last && last.groupKey === groupKey ? last.groupIndex : (last?.groupIndex ?? -1) + 1;
      acc.push({ lead, groupKey, groupIndex });
      return acc;
    }, []);
  }, [leads, makeGroupKey]);

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
        searchPlaceholder="Buscar por chassi, modelo, cidade ou cliente"
        regiaoLabel="Região"
        estadoLabel="Estado"
        tipoLeadLabel="Tipo de lead"
        onFiltersChange={onFiltersChange}
      />

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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div
          className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600"
          style={{ gridTemplateColumns }}
        >
          {columnOrder.map((col) => (
            <span key={col}>{columnLabels[col]}</span>
          ))}
        </div>

        <div className="divide-y divide-slate-200">
          {groupedLeads.map(({ lead, groupIndex }) => {
            const isStriped = filters.groupByEmpresa || filters.groupByChassi;
            const backgroundClass =
              isStriped && groupIndex % 2 === 1 ? "bg-slate-50" : "bg-white";

            const cells: Record<ColumnId, React.ReactNode> = {
              regional: (
                <Badge tone="sky">{lead.regional ?? "Sem regional"}</Badge>
              ),
              estado: <Badge tone="slate">{lead.estado ?? "Sem estado"}</Badge>,
              cidade: (
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-900">
                    {lead.city ?? "Cidade não informada"}
                  </span>
                </div>
              ),
              cliente: (
                <span className="text-slate-800">
                  {lead.clienteBaseEnriquecida ?? "Sem cliente"}
                </span>
              ),
              chassiModelo: (
                <div className="flex flex-wrap gap-2">
                  <Badge tone="emerald">{lead.chassi ?? "Sem chassi"}</Badge>
                  <Badge tone="violet">
                    {lead.modelName ?? "Modelo não informado"}
                  </Badge>
                </div>
              ),
              tipoLead: (
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
              ),
              horimetro: (
                <span className="text-slate-800">
                  {lead.horimetroAtualMachineList !== null
                    ? `${numberFormatter.format(
                        lead.horimetroAtualMachineList,
                      )} h`
                    : "N/A"}
                </span>
              ),
              importadoEm: (
                <span className="text-slate-800">
                  {formatDate(lead.importedAt)}
                </span>
              ),
            };

            return (
              <div
                key={lead.id}
                className={`grid items-center gap-4 px-5 py-3 text-sm text-slate-800 hover:bg-slate-50 ${backgroundClass}`}
                style={{ gridTemplateColumns }}
              >
                {columnOrder.map((col) => (
                  <div key={col}>{cells[col]}</div>
                ))}
              </div>
            );
          })}
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
