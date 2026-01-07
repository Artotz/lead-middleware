"use client";

import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import { Lead, TimeRange } from "@/lib/domain";
import { LEAD_STATUS_LABELS, LEAD_STATUS_OPTIONS } from "@/lib/filters";
import { Badge } from "@/components/Badge";
import { LeadTypesMultiSelect } from "@/components/LeadTypesMultiSelect";

type LeadStatusMetricsViewProps = {
  leads: Lead[];
  timeRange: TimeRange;
  statusOptions: string[];
  selectedStatuses: string[];
  onSelectedStatusesChange: (next: string[]) => void;
  onLeadSelect?: (lead: Lead) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

type StatusChartDatum = {
  status: string;
  label: string;
  count: number;
  color: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const isWithinRange = (dateStr: string | null | undefined, range: TimeRange) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (Number.isNaN(diff) || diff < 0) {
    return false;
  }

  switch (range) {
    case "today":
      return date.toDateString() === now.toDateString();
    case "week":
      return diff <= 7 * DAY_MS;
    case "month":
      return diff <= 30 * DAY_MS;
    case "year":
      return date.getFullYear() === now.getFullYear();
    default:
      return false;
  }
};

const normalizeStatus = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

type StatusTone =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "slate"
  | "violet"
  | "stone";

const STATUS_TONES: Record<StatusTone, string> = {
  sky: "#0EA5E9",
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",
  slate: "#475569",
  violet: "#8B5CF6",
  stone: "#78716C",
};

const pickStatusTone = (status: string): StatusTone => {
  const normalized = status.toLowerCase();
  if (normalized.includes("fech") || normalized.includes("conclu")) {
    return "emerald";
  }
  if (normalized.includes("descart") || normalized.includes("cancel")) {
    return "rose";
  }
  if (normalized.includes("novo")) {
    return "sky";
  }
  if (normalized.includes("contato")) {
    return "amber";
  }
  if (normalized.includes("atrib")) {
    return "violet";
  }
  return "slate";
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const formatLeadDate = (value: string | null | undefined) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
};

function StatusTooltip({
  active,
  payload,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const datum = (payload[0] as { payload?: StatusChartDatum }).payload;
  if (!datum) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-semibold text-slate-900">{datum.label}</div>
      <div className="mt-1 text-slate-600">
        {datum.count} {datum.count === 1 ? "lead" : "leads"}
      </div>
    </div>
  );
}

export function LeadStatusMetricsView({
  leads,
  timeRange,
  statusOptions,
  selectedStatuses,
  onSelectedStatusesChange,
  onLeadSelect,
  loading,
  error,
  onRetry,
}: LeadStatusMetricsViewProps) {
  const resolvedStatusOptions = useMemo(() => {
    const map = new Map<string, string>();
    const addOption = (value: string, label?: string) => {
      const normalized = normalizeStatus(value);
      if (!normalized) return;
      if (!map.has(normalized)) {
        map.set(
          normalized,
          label ?? LEAD_STATUS_LABELS[normalized] ?? value,
        );
      }
    };

    statusOptions.forEach((status) => addOption(status));
    LEAD_STATUS_OPTIONS.forEach((option) => addOption(option.value, option.label));
    selectedStatuses.forEach((status) => addOption(status));

    return Array.from(map.entries())
      .map(([value, label]) => ({
        value,
        label: LEAD_STATUS_LABELS[value] ?? label,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [selectedStatuses, statusOptions]);

  const statusLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    resolvedStatusOptions.forEach((option) => {
      map.set(option.value, option.label);
    });
    return map;
  }, [resolvedStatusOptions]);

  const selectedStatusSet = useMemo(
    () => new Set(selectedStatuses.map((status) => normalizeStatus(status))),
    [selectedStatuses],
  );

  const leadsInRange = useMemo(() => {
    return leads.filter((lead) =>
      isWithinRange(lead.updatedAt ?? lead.importedAt, timeRange),
    );
  }, [leads, timeRange]);

  const filteredLeads = useMemo(() => {
    if (!selectedStatusSet.size) return [];
    return leadsInRange.filter((lead) => {
      const normalized = normalizeStatus(lead.status);
      return normalized && selectedStatusSet.has(normalized);
    });
  }, [leadsInRange, selectedStatusSet]);

  const chartData = useMemo(() => {
    const byStatus = new Map<string, number>();
    filteredLeads.forEach((lead) => {
      const normalized = normalizeStatus(lead.status);
      if (!normalized) return;
      byStatus.set(normalized, (byStatus.get(normalized) ?? 0) + 1);
    });

    return Array.from(byStatus.entries())
      .map(([status, count]) => ({
        status,
        label: statusLabelByValue.get(status) ?? status,
        count,
        color: STATUS_TONES[pickStatusTone(status)],
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLeads, statusLabelByValue]);

  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      const aDate = new Date(a.updatedAt ?? a.importedAt).getTime();
      const bDate = new Date(b.updatedAt ?? b.importedAt).getTime();
      return bDate - aDate;
    });
  }, [filteredLeads]);

  const listTotal = sortedLeads.length;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Carregando leads...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 shadow-sm">
        <span>{error}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
          >
            Tentar novamente
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Leads por status
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {listTotal} lead{listTotal === 1 ? "" : "s"} no periodo
            </div>
          </div>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <span>Status na pizza</span>
            <LeadTypesMultiSelect
              value={selectedStatuses}
              options={resolvedStatusOptions}
              onChange={onSelectedStatusesChange}
              placeholder="Selecionar status"
            />
          </label>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Distribuicao
        </div>

        {chartData.length ? (
          <div className="mt-3">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="h-64 w-full md:w-2/3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<StatusTooltip />} />
                    <Pie
                      data={chartData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {chartData.map((item) => (
                        <Cell key={item.status} fill={item.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Legenda
                </div>
                <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  {chartData.map((item) => (
                    <div
                      key={`legend-${item.status}`}
                      className="flex items-start gap-2 border-b border-slate-200 py-2 last:border-b-0"
                    >
                      <span
                        className="mt-1 inline-flex h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">
                          {item.label}
                        </div>
                        <div className="text-slate-600">
                          {item.count} {item.count === 1 ? "lead" : "leads"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">
            Nenhum lead para os status selecionados.
          </div>
        )}

        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lista de leads no periodo
          </div>
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
            <div
              className="grid gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
              style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr" }}
            >
              <span>Lead</span>
              <span>Status</span>
              <span>Consultor</span>
              <span>Atualizado</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-200">
              {sortedLeads.length ? (
                sortedLeads.map((lead, index) => {
                  const normalized = normalizeStatus(lead.status);
                  const label =
                    statusLabelByValue.get(normalized) ??
                    lead.status?.trim() ??
                    "Sem status";
                  const backgroundClass = onLeadSelect
                    ? "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    : "";
                  const leadTitle =
                    lead.clienteBaseEnriquecida?.trim() ||
                    lead.modelName?.trim() ||
                    lead.chassi?.trim() ||
                    `Lead ${lead.id}`;

                  return (
                    <div
                      key={`${lead.id}-${index}`}
                      role={onLeadSelect ? "button" : undefined}
                      tabIndex={onLeadSelect ? 0 : undefined}
                      onClick={onLeadSelect ? () => onLeadSelect(lead) : undefined}
                      onKeyDown={
                        onLeadSelect
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onLeadSelect(lead);
                              }
                            }
                          : undefined
                      }
                      className={`grid items-center gap-4 px-4 py-3 text-sm text-slate-800 ${backgroundClass}`}
                      style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr" }}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">
                          {leadTitle}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          Lead {lead.id}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <Badge tone={pickStatusTone(normalized)}>{label}</Badge>
                      </div>
                      <div className="min-w-0 truncate text-slate-700">
                        {lead.consultor ?? "Sem consultor"}
                      </div>
                      <div className="min-w-0 truncate text-xs text-slate-500">
                        {formatLeadDate(lead.updatedAt ?? lead.importedAt)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-sm text-slate-500">
                  Nenhum lead encontrado para esse filtro.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
