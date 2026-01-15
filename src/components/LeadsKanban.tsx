"use client";

import { useMemo } from "react";
import { Lead, LeadCategory } from "@/lib/domain";
import {
  ESTADOS,
  FiltersState,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_OPTIONS,
  LEAD_TYPES,
  REGIOES,
} from "@/lib/filters";
import { Badge } from "@/components/Badge";
import { FiltersBar } from "@/components/FiltersBar";

type LeadsKanbanProps = {
  leads: Lead[];
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onLeadSelect?: (lead: Lead) => void;
  loading?: boolean;
  pageSize?: number;
};

type StatusColumn = {
  id: string;
  label: string;
  tone: Parameters<typeof Badge>[0]["tone"];
};

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
  garantia_basica: "Garantia basica",
  garantia_estendida: "Garantia estendida",
  reforma_componentes: "Reforma de componentes",
  lamina: "Lamina",
  dentes: "Dentes",
  rodante: "Rodante",
  disponibilidade: "Disponibilidade",
  reconexao: "Reconexao",
  transferencia_aor: "Transferencia de AOR",
  pops: "POPs",
  outros: "Outros",
  indefinido: "Indefinido",
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

const formatDateParts = (iso?: string | null) => {
  if (!iso) {
    return { time: "N/A", date: "N/A" };
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { time: "N/A", date: "N/A" };
  }
  return {
    time: dateFormatter.format(date),
    date: dateOnlyFormatter.format(date),
  };
};

const STATUS_KEY_BY_VALUE = new Map(
  LEAD_STATUS_OPTIONS.map((opt) => [opt.value.toLowerCase(), opt.value])
);

const normalizeStatus = (value?: string | null) =>
  value?.trim().toLowerCase() ?? "";

const resolveStatusLabel = (value: string | null) => {
  const normalized = normalizeStatus(value);
  if (!normalized) return "Sem status";
  const key = STATUS_KEY_BY_VALUE.get(normalized);
  return key ? LEAD_STATUS_LABELS[key] ?? key : value ?? "Sem status";
};

const formatLocation = (lead: Lead) => {
  const parts = [lead.city, lead.estado]
    .map((entry) => entry?.trim() ?? "")
    .filter(Boolean);
  return parts.length ? parts.join(" / ") : "Sem cidade";
};

function KanbanCard({
  lead,
  onSelect,
}: {
  lead: Lead;
  onSelect?: (lead: Lead) => void;
}) {
  const leadTypes = lead.tipoLeadList?.length
    ? lead.tipoLeadList
    : [lead.tipoLead];
  const displayedTypes = leadTypes.slice(0, 2);
  const extraTypes = leadTypes.length - displayedTypes.length;
  const referenceDate = lead.updatedAt ?? lead.importedAt;
  const dateParts = formatDateParts(referenceDate);
  const subtitle = [lead.chassi ?? "Sem chassi", lead.modelName ?? "N/A"]
    .filter(Boolean)
    .join(" - ");
  const statusLabel = resolveStatusLabel(lead.status);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(lead)}
      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="slate">Lead #{lead.id}</Badge>
          <Badge tone={pickStatusTone(lead.status)}>{statusLabel}</Badge>
        </div>
        <div className="text-right text-[11px] text-slate-400">
          <div className="font-semibold text-slate-500">{dateParts.time}</div>
          <div>{dateParts.date}</div>
        </div>
      </div>

      <div className="mt-3 min-w-0">
        <div className="text-sm font-semibold text-slate-900 line-clamp-2">
          {lead.clienteBaseEnriquecida ?? "Sem cliente"}
        </div>
        <div className="mt-1 text-xs text-slate-500 line-clamp-2">
          {subtitle}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {displayedTypes.map((tipo) => (
          <Badge key={tipo} tone={leadTypeTone[tipo]}>
            {leadTypeLabel[tipo]}
          </Badge>
        ))}
        {extraTypes > 0 ? <Badge tone="stone">+{extraTypes}</Badge> : null}
        {lead.regional ? <Badge tone="sky">{lead.regional}</Badge> : null}
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-600">
        <div>{formatLocation(lead)}</div>
        <div>
          Consultor: {lead.consultor?.trim() ? lead.consultor : "Sem consultor"}
        </div>
        <div>
          Horimetro:{" "}
          {lead.horimetroAtualMachineList !== null
            ? `${numberFormatter.format(lead.horimetroAtualMachineList)} h`
            : "N/A"}
        </div>
      </div>
    </button>
  );
}

export function LeadsKanban({
  leads,
  filters,
  onFiltersChange,
  onLeadSelect,
  loading = false,
  pageSize = 10,
}: LeadsKanbanProps) {
  const regiaoOptions = useMemo(() => REGIOES.slice(), []);
  const estadoOptions = useMemo(() => ESTADOS.slice(), []);
  const tipoLeadOptions = useMemo(() => LEAD_TYPES.slice(), []);
  const resolvedStatusOptions = useMemo(() => LEAD_STATUS_OPTIONS.slice(), []);

  const baseColumns = useMemo<StatusColumn[]>(() => {
    return LEAD_STATUS_OPTIONS.map((opt) => ({
      id: opt.value,
      label: LEAD_STATUS_LABELS[opt.value] ?? opt.value,
      tone: pickStatusTone(opt.value),
    }));
  }, []);

  const activeBaseColumns = useMemo(() => {
    const requested = filters.status
      .map((status) => normalizeStatus(status))
      .filter(Boolean);
    if (!requested.length) return baseColumns;
    const requestedSet = new Set(requested);
    const filtered = baseColumns.filter((col) =>
      requestedSet.has(col.id.toLowerCase())
    );
    return filtered.length ? filtered : baseColumns;
  }, [baseColumns, filters.status]);

  const visibleLeads = loading ? [] : leads;

  const { columns, groupedLeads } = useMemo(() => {
    const grouped = new Map<string, Lead[]>();
    activeBaseColumns.forEach((col) => grouped.set(col.id, []));

    const semStatus: Lead[] = [];
    const outros: Lead[] = [];

    visibleLeads.forEach((lead) => {
      const normalized = normalizeStatus(lead.status);
      if (!normalized) {
        semStatus.push(lead);
        return;
      }
      const key = STATUS_KEY_BY_VALUE.get(normalized);
      if (key && grouped.has(key)) {
        grouped.get(key)?.push(lead);
      } else {
        outros.push(lead);
      }
    });

    const nextColumns = [...activeBaseColumns];
    if (semStatus.length) {
      nextColumns.push({
        id: "sem_status",
        label: "Sem status",
        tone: "stone",
      });
      grouped.set("sem_status", semStatus);
    }
    if (outros.length) {
      nextColumns.push({ id: "outros", label: "Outros", tone: "slate" });
      grouped.set("outros", outros);
    }

    return { columns: nextColumns, groupedLeads: grouped };
  }, [activeBaseColumns, visibleLeads]);

  const skeletonCount = Math.max(
    2,
    Math.ceil(pageSize / Math.max(1, activeBaseColumns.length))
  );

  const skeletonCards = useMemo(
    () => Array.from({ length: skeletonCount }, (_, i) => i),
    [skeletonCount]
  );

  return (
    <div className="space-y-4">
      {/* <FiltersBar
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
      /> */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Quadro kanban</span>
          <span>
            {loading ? "Carregando..." : `Mostrando ${leads.length} leads`}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex min-w-full gap-4">
            {columns.map((column) => {
              const columnLeads = groupedLeads.get(column.id) ?? [];
              return (
                <div
                  key={column.id}
                  className="min-w-[260px] max-w-[320px] flex-1"
                >
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <Badge tone={column.tone}>{column.label}</Badge>
                    <span className="text-xs font-semibold text-slate-500">
                      {loading ? "..." : columnLeads.length}
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {loading
                      ? skeletonCards.map((index) => (
                          <div
                            key={`${column.id}-skeleton-${index}`}
                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                          >
                            <div className="h-4 w-3/5 rounded-full bg-slate-200 animate-pulse" />
                            <div className="mt-3 h-3 w-4/5 rounded-full bg-slate-200 animate-pulse" />
                            <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-200 animate-pulse" />
                            <div className="mt-4 flex gap-2">
                              <div className="h-4 w-16 rounded-full bg-slate-200 animate-pulse" />
                              <div className="h-4 w-12 rounded-full bg-slate-200 animate-pulse" />
                            </div>
                          </div>
                        ))
                      : columnLeads.map((lead) => (
                          <KanbanCard
                            key={lead.id}
                            lead={lead}
                            onSelect={onLeadSelect}
                          />
                        ))}
                    {!loading &&
                    leads.length > 0 &&
                    columnLeads.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                        Sem leads neste status.
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!loading && leads.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Nenhum lead encontrado com esses filtros.
          </div>
        ) : null}
      </div>
    </div>
  );
}
