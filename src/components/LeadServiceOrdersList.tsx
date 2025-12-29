"use client";

import { useMemo, useState } from "react";
import { Lead, LeadCategory, LeadServiceOrder } from "@/lib/domain";
import type { ActionDefinition, EventPayload } from "@/lib/events";
import { updateLeadServiceOrder } from "@/lib/api";
import { ESTADOS, FiltersState, LEAD_TYPES, REGIOES } from "@/lib/filters";
import { ActionModal } from "@/components/ActionModal";
import { Badge } from "@/components/Badge";
import { FiltersBar } from "@/components/FiltersBar";
import { useToast } from "@/components/ToastProvider";

type LeadServiceOrdersListProps = {
  orders: LeadServiceOrder[];
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onLeadSelect?: (lead: Lead) => void;
  onOrderUpdated?: (update: ServiceOrderUpdate) => void;
  loading?: boolean;
  pageSize?: number;
};

type ServiceOrderUpdate = {
  id: number;
  partsValue: number;
  laborValue: number;
  note: string | null;
  updatedAt: string;
};

type ServiceOrderAction = "update_values";

const SERVICE_ORDER_ACTIONS: ActionDefinition<ServiceOrderAction>[] = [
  {
    id: "update_values",
    label: "Atualizar valores",
    description: "Atualiza os valores da OS.",
    requiresPartsValue: true,
    requiresLaborValue: true,
  },
];

type ColumnId =
  | "os"
  | "lead"
  | "cliente"
  | "consultor"
  | "chassi"
  | "tipoLead"
  | "valores"
  | "atualizadoEm"
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

const columnLabels: Record<ColumnId, string> = {
  os: "OS",
  lead: "Lead",
  cliente: "Cliente",
  consultor: "Consultor",
  chassi: "Chassi",
  tipoLead: "Tipo de lead",
  valores: "Valores",
  atualizadoEm: "Atualizado em",
  acoes: "Acoes",
};

const columnWidths: Record<ColumnId, string> = {
  os: "0.8fr",
  lead: "1.2fr",
  cliente: "1.4fr",
  consultor: "1fr",
  chassi: "1.1fr",
  tipoLead: "1.2fr",
  valores: "1.1fr",
  atualizadoEm: "1fr",
  acoes: "0.7fr",
};

const buildColumnOrder = (
  groupByEmpresa?: boolean,
  groupByChassi?: boolean,
): ColumnId[] => {
  const base: ColumnId[] = [
    "os",
    "lead",
    "cliente",
    "consultor",
    "chassi",
    "tipoLead",
    "valores",
    "atualizadoEm",
    "acoes",
  ];
  const prioritized: ColumnId[] = [];
  if (groupByEmpresa) prioritized.push("cliente");
  if (groupByChassi) prioritized.push("chassi");
  return [...new Set([...prioritized, ...base])];
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

function ServiceOrderActionCell({
  order,
  onUpdated,
}: {
  order: LeadServiceOrder;
  onUpdated?: (update: ServiceOrderUpdate) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (
    _action: ServiceOrderAction,
    payload: EventPayload,
  ) => {
    setError(null);
    setLoading(true);
    try {
      const updated = await updateLeadServiceOrder(order.id, {
        partsValue: payload.parts_value ?? "",
        laborValue: payload.labor_value ?? "",
        note: typeof payload.note === "string" ? payload.note : "",
      });
      onUpdated?.({
        id: updated.id,
        partsValue: updated.partsValue,
        laborValue: updated.laborValue,
        note: updated.note ?? null,
        updatedAt: updated.updatedAt,
      });
      toast.push({
        variant: "success",
        message: "OS atualizada com sucesso.",
      });
      setOpen(false);
    } catch (err: any) {
      const message =
        typeof err?.message === "string" && err.message
          ? err.message
          : "Nao foi possivel atualizar a OS.";
      setError(message);
      toast.push({ variant: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setError(null);
          setOpen(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
      >
        Acoes
      </button>

      <ActionModal<ServiceOrderAction>
        open={open}
        entity="lead"
        actions={SERVICE_ORDER_ACTIONS}
        defaultAction="update_values"
        initialPayload={{
          parts_value: order.partsValue,
          labor_value: order.laborValue,
          note: order.note ?? "",
        }}
        loading={loading}
        error={error}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

export function LeadServiceOrdersList({
  orders,
  filters,
  onFiltersChange,
  onLeadSelect,
  onOrderUpdated,
  loading = false,
  pageSize = 10,
}: LeadServiceOrdersListProps) {
  const skeletonRows = useMemo(
    () => Array.from({ length: Math.max(1, pageSize) }, (_, i) => i),
    [pageSize],
  );
  const regiaoOptions = useMemo(() => REGIOES.slice(), []);
  const estadoOptions = useMemo(() => ESTADOS.slice(), []);
  const tipoLeadOptions = useMemo(() => LEAD_TYPES.slice(), []);
  const columnOrder = useMemo(
    () => buildColumnOrder(filters.groupByEmpresa, filters.groupByChassi),
    [filters.groupByChassi, filters.groupByEmpresa],
  );

  const gridTemplateColumns = columnOrder
    .map((col) => columnWidths[col])
    .join(" ");

  const makeGroupKey = useMemo(() => {
    return (order: LeadServiceOrder) => {
      const parts: string[] = [];
      if (filters.groupByEmpresa) {
        parts.push(order.lead.clienteBaseEnriquecida ?? "Sem cliente");
      }
      if (filters.groupByChassi) {
        parts.push(order.lead.chassi ?? "Sem chassi");
      }
      return parts.join("::");
    };
  }, [filters.groupByChassi, filters.groupByEmpresa]);

  const groupedOrders = useMemo(() => {
    return orders.reduce<
      { order: LeadServiceOrder; groupKey: string; groupIndex: number }[]
    >((acc, order) => {
      const groupKey = makeGroupKey(order);
      const last = acc[acc.length - 1];
      const groupIndex =
        last && last.groupKey === groupKey
          ? last.groupIndex
          : (last?.groupIndex ?? -1) + 1;
      acc.push({ order, groupKey, groupIndex });
      return acc;
    }, []);
  }, [makeGroupKey, orders]);

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
        reserveStatusSlot
        searchPlaceholder="Buscar por OS, chassi, modelo, cidade ou consultor"
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
          {loading
            ? skeletonRows.map((index) => (
                <div
                  key={`os-skeleton-${index}`}
                  className="grid min-w-0 items-center gap-4 px-5 py-3 text-sm min-h-[56px]"
                  style={{ gridTemplateColumns }}
                >
                  {columnOrder.map((col) => (
                    <div key={`${index}-${col}`} className="min-w-0">
                      <div className="h-4 w-4/5 rounded-full bg-slate-200 animate-pulse" />
                    </div>
                  ))}
                </div>
              ))
            : groupedOrders.map(({ order, groupIndex }) => {
                const isStriped = filters.groupByEmpresa || filters.groupByChassi;
                const backgroundClass =
                  isStriped && groupIndex % 2 === 1 ? "bg-slate-50" : "bg-white";
                const lead = order.lead;
                const totalValue = order.partsValue + order.laborValue;
                const cells: Record<ColumnId, React.ReactNode> = {
                  os: (
                    <Badge tone="sky" className="max-w-[120px] truncate">
                      {order.osNumber}
                    </Badge>
                  ),
                  lead: (
                    <div className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">
                        Lead #{lead.id}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        Criado por: {lead.createdBy ?? "Nao informado"}
                      </span>
                    </div>
                  ),
                  cliente: (
                    <span className="block max-w-[220px] truncate text-slate-800">
                      {lead.clienteBaseEnriquecida ?? "Sem cliente"}
                    </span>
                  ),
                  consultor: (
                    <span className="block max-w-[180px] truncate text-slate-800">
                      {lead.consultor ?? "Sem consultor"}
                    </span>
                  ),
                  chassi: (
                    <Badge tone="emerald" className="max-w-[160px] truncate">
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
                  valores: (
                    <div className="min-w-0 text-xs text-slate-600">
                      <div className="truncate">
                        Pecas: {currencyFormatter.format(order.partsValue)}
                      </div>
                      <div className="truncate">
                        Mao de obra: {currencyFormatter.format(order.laborValue)}
                      </div>
                      <div className="truncate font-semibold text-slate-800">
                        Total: {currencyFormatter.format(totalValue)}
                      </div>
                    </div>
                  ),
                  atualizadoEm: (() => {
                    const parts = formatDateParts(order.updatedAt);
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
                    <ServiceOrderActionCell
                      order={order}
                      onUpdated={onOrderUpdated}
                    />
                  ),
                };

                return (
                  <div
                    key={order.id}
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
          {!loading && orders.length === 0 && (
            <div className="px-5 py-4 text-sm text-slate-500">
              Nenhuma OS encontrada com esses filtros.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
