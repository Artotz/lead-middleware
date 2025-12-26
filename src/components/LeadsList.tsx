"use client";

import { useMemo } from "react";
import { Lead, LeadCategory } from "@/lib/domain";
import { ESTADOS, FiltersState, LEAD_TYPES, REGIOES } from "@/lib/filters";
import { Badge } from "./Badge";
import { AssignLeadButton } from "./AssignLeadButton";
import { ActionButtonCell } from "./ActionButtonCell";
import { FiltersBar } from "./FiltersBar";

type LeadsListProps = {
  leads: Lead[];
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onLeadSelect?: (lead: Lead) => void;
  currentUserName?: string | null;
  onLeadAssigned?: (leadId: number, assignee: string) => void;
  onLeadStatusChange?: (leadId: number, status: string) => void;
  statusOptions?: string[];
  loading?: boolean;
};

type ColumnId =
  | "regional"
  | "cidadeEstado"
  | "cliente"
  | "consultor"
  | "chassiModelo"
  | "tipoLead"
  | "status"
  | "horimetro"
  | "importadoEm"
  | "acoes";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnlyFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
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
    pops: "slate",
    outros: "stone",
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
  pops: "POPs",
  outros: "Outros",
  indefinido: "Indefinido",
};

const formatDateParts = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { time: "N/A", date: "N/A" };
  }
  return {
    time: dateFormatter.format(date),
    date: dateOnlyFormatter.format(date),
  };
};

const pickStatusTone = (
  status: string | null
): Parameters<typeof Badge>[0]["tone"] => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return "stone";
  if (normalized.includes("fech") || normalized.includes("conclu"))
    return "emerald";
  if (normalized.includes("cancel")) return "rose";
  if (normalized.includes("novo")) return "sky";
  if (normalized.includes("pend")) return "amber";
  return "slate";
};

const columnLabels: Record<ColumnId, string> = {
  regional: "Região",
  cidadeEstado: "Cidade / Estado",
  cliente: "Cliente",
  consultor: "Consultor",
  chassiModelo: "Chassi",
  tipoLead: "Tipo de lead",
  horimetro: "Horímetro",
  importadoEm: "Atualizado em",
  status: "Status",
  acoes: "Ações",
};

const columnWidths: Record<ColumnId, string> = {
  regional: "0.9fr",
  cidadeEstado: "1.5fr",
  cliente: "1.4fr",
  consultor: "1.1fr",
  chassiModelo: "1.3fr",
  tipoLead: "1.3fr",
  horimetro: "1fr",
  importadoEm: "1fr",
  status: "1fr",
  acoes: "0.8fr",
};

const buildColumnOrder = (
  groupByEmpresa?: boolean,
  groupByChassi?: boolean
): ColumnId[] => {
  const base: ColumnId[] = [
    "regional",
    "cidadeEstado",
    "cliente",
    "consultor",
    "chassiModelo",
    "tipoLead",
    "status",
    "horimetro",
    "importadoEm",
    "acoes",
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
  onLeadSelect,
  currentUserName,
  onLeadAssigned,
  onLeadStatusChange,
  statusOptions,
  loading = false,
}: LeadsListProps) {
  const regiaoOptions = useMemo(() => REGIOES.slice(), []);

  const estadoOptions = useMemo(() => ESTADOS.slice(), []);

  const tipoLeadOptions = useMemo(() => LEAD_TYPES.slice(), []);

  const derivedStatusOptions = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach((lead) => {
      const status = lead.status?.trim();
      if (!status) return;
      const key = status.toLowerCase();
      if (!map.has(key)) {
        map.set(key, status);
      }
    });
    filters.status.forEach((status) => {
      const trimmed = status.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!map.has(key)) {
        map.set(key, trimmed);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [filters.status, leads]);

  const resolvedStatusOptions = useMemo(() => {
    if (!statusOptions) return derivedStatusOptions;
    const map = new Map<string, string>();
    statusOptions.forEach((status) => {
      const trimmed = status.trim();
      if (!trimmed) return;
      map.set(trimmed.toLowerCase(), trimmed);
    });
    derivedStatusOptions.forEach((status) => {
      const trimmed = status.trim();
      if (!trimmed) return;
      if (!map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [derivedStatusOptions, statusOptions]);
  const columnOrder = useMemo(
    () => buildColumnOrder(filters.groupByEmpresa, filters.groupByChassi),
    [filters.groupByChassi, filters.groupByEmpresa]
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
    return leads.reduce<{ lead: Lead; groupKey: string; groupIndex: number }[]>(
      (acc, lead) => {
        const groupKey = makeGroupKey(lead);
        const last = acc[acc.length - 1];
        const groupIndex =
          last && last.groupKey === groupKey
            ? last.groupIndex
            : (last?.groupIndex ?? -1) + 1;
        acc.push({ lead, groupKey, groupIndex });
        return acc;
      },
      []
    );
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
        statusOptions={resolvedStatusOptions}
        searchPlaceholder="Buscar por chassi, modelo, cidade, consultor ou cliente"
        regiaoLabel="Regiao"
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
            const hasConsultor = Boolean(lead.consultor?.trim());
            const canShowAssign =
              !hasConsultor && Boolean(currentUserName?.trim());

            const cells: Record<ColumnId, React.ReactNode> = {
              regional: (
                <Badge tone="sky" className="max-w-[130px] truncate">
                  {lead.regional ?? "Sem regional"}
                </Badge>
              ),
              cidadeEstado: (
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold text-slate-900">
                    {lead.city ?? "Cidade não informada"}
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    {lead.estado ?? "Sem estado"}
                  </span>
                </div>
              ),
              cliente: (
                <span className="block max-w-[240px] truncate text-slate-800">
                  {lead.clienteBaseEnriquecida ?? "Sem cliente"}
                </span>
              ),
              consultor: canShowAssign ? (
                <AssignLeadButton
                  leadId={lead.id}
                  assigneeName={currentUserName}
                  onAssigned={(assignee) => onLeadAssigned?.(lead.id, assignee)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                />
              ) : (
                <span className="block max-w-[180px] truncate text-slate-800">
                  {lead.consultor ?? "Sem consultor"}
                </span>
              ),
              chassiModelo: (
                <Badge tone="emerald" className="max-w-[170px] truncate">
                  {lead.chassi ?? "Sem chassi"}
                </Badge>
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
              status: (
                <Badge
                  tone={pickStatusTone(lead.status)}
                  className="max-w-[160px] truncate"
                >
                  {lead.status ?? "Sem status"}
                </Badge>
              ),
              horimetro: (
                <span className="truncate text-slate-800">
                  {lead.horimetroAtualMachineList !== null
                    ? `${numberFormatter.format(
                        lead.horimetroAtualMachineList
                      )} h`
                    : "N/A"}
                </span>
              ),
              importadoEm: (() => {
                const referenceDate = lead.updatedAt ?? lead.importedAt;
                const parts = formatDateParts(referenceDate);
                return (
                  <div className="min-w-0 leading-tight">
                    <span className="block truncate text-xs font-semibold text-slate-700">
                      {parts.time}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {parts.date}
                    </span>
                  </div>
                );
              })(),
              acoes: (
                <ActionButtonCell
                  entity="lead"
                  leadId={lead.id}
                  leadStatus={lead.status}
                  onLeadStatusChange={onLeadStatusChange}
                />
              ),
            };

            return (
              <div
                key={lead.id}
                role={onLeadSelect ? "button" : undefined}
                tabIndex={onLeadSelect ? 0 : undefined}
                onClick={onLeadSelect ? () => onLeadSelect(lead) : undefined}
                onKeyDown={
                  onLeadSelect
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onLeadSelect(lead);
                        }
                      }
                    : undefined
                }
                className={`grid min-w-0 items-center gap-4 px-5 py-3 text-sm text-slate-800 hover:bg-slate-50 ${backgroundClass} ${
                  onLeadSelect
                    ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200"
                    : ""
                }`}
                style={{ gridTemplateColumns }}
              >
                {columnOrder.map((col) => (
                  <div key={col} className="min-w-0">
                    {cells[col]}
                  </div>
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
