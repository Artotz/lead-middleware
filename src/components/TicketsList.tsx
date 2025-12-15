"use client";

import React, { useMemo } from "react";
import { Ticket, TicketStatus } from "@/lib/domain";
import { SortOrder } from "@/lib/filters";
import { TicketFiltersState } from "@/lib/ticketFilters";
import { Badge } from "./Badge";

type TicketsListProps = {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  filters: TicketFiltersState;
  loading?: boolean;
  onFiltersChange: (filters: TicketFiltersState) => void;
  onPageChange: (direction: -1 | 1) => void;
};

type ColumnId =
  | "ticket"
  | "titulo"
  | "status"
  | "chassi"
  | "consultor"
  | "cliente"
  | "equipe"
  | "atualizado";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const ticketStatusTone: Record<TicketStatus, Parameters<typeof Badge>[0]["tone"]> =
  {
    aberto: "amber",
    fechado: "emerald",
    desconhecido: "slate",
  };

const ticketStatusLabel: Record<TicketStatus, string> = {
  aberto: "Aberto",
  fechado: "Fechado",
  desconhecido: "Desconhecido",
};

const formatDate = (iso: string | null) => {
  if (!iso) return "N/A";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "N/A";
  return dateFormatter.format(date);
};

const columnLabels: Record<ColumnId, string> = {
  ticket: "Ticket",
  titulo: "Título",
  status: "Status",
  chassi: "Chassi",
  consultor: "Consultor",
  cliente: "Cliente",
  equipe: "Equipe",
  atualizado: "Atualizado",
};

const columnWidths: Record<ColumnId, string> = {
  ticket: "1fr",
  titulo: "1.6fr",
  status: "0.9fr",
  chassi: "1.1fr",
  consultor: "1.1fr",
  cliente: "1.2fr",
  equipe: "1fr",
  atualizado: "1fr",
};

const buildColumnOrder = (
  groupByEmpresa: boolean,
  groupByChassi: boolean,
): ColumnId[] => {
  const baseOrder: ColumnId[] = [
    "ticket",
    "titulo",
    "status",
    "chassi",
    "consultor",
    "cliente",
    "equipe",
    "atualizado",
  ];

  const prioritized: ColumnId[] = [];
  if (groupByEmpresa) prioritized.push("cliente");
  if (groupByChassi) prioritized.push("chassi");

  const deduped = [...new Set([...prioritized, ...baseOrder])];
  return deduped;
};

export function TicketsList({
  tickets,
  total,
  page,
  pageSize,
  filters,
  loading = false,
  onFiltersChange,
  onPageChange,
}: TicketsListProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columnOrder = useMemo(
    () => buildColumnOrder(filters.groupByEmpresa, filters.groupByChassi),
    [filters.groupByEmpresa, filters.groupByChassi],
  );

  const gridTemplateColumns = columnOrder
    .map((col) => columnWidths[col])
    .join(" ");

  const handleFilterChange = <K extends keyof TicketFiltersState>(
    key: K,
    val: TicketFiltersState[K],
  ) => {
    onFiltersChange({ ...filters, [key]: val });
  };

  const makeGroupKey = useMemo(() => {
    return (ticket: Ticket) => {
      const parts: string[] = [];
      if (filters.groupByEmpresa) {
        parts.push(ticket.customerName ?? "Sem empresa");
      }
      if (filters.groupByChassi) {
        parts.push(ticket.serialNumber ?? "Sem chassi");
      }
      return parts.join("::");
    };
  }, [filters.groupByChassi, filters.groupByEmpresa]);

  const groupedTickets = useMemo(() => {
    return tickets.reduce<
      { ticket: Ticket; groupKey: string; groupIndex: number }[]
    >((acc, ticket) => {
      const groupKey = makeGroupKey(ticket);
      const last = acc[acc.length - 1];
      const groupIndex =
        last && last.groupKey === groupKey ? last.groupIndex : (last?.groupIndex ?? -1) + 1;
      acc.push({ ticket, groupKey, groupIndex });
      return acc;
    }, []);
  }, [makeGroupKey, tickets]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Busca
            <input
              type="search"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Buscar por ticket, título, chassi ou cliente"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              value={filters.status}
              onChange={(e) =>
                handleFilterChange("status", e.target.value as TicketStatus | "")
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">Todos</option>
              <option value="aberto">Aberto</option>
              <option value="fechado">Fechado</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ordenação
            <select
              value={filters.sort}
              onChange={(e) =>
                handleFilterChange("sort", e.target.value as SortOrder)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Agrupar
          </span>
          <button
            type="button"
            onClick={() =>
              handleFilterChange("groupByEmpresa", !filters.groupByEmpresa)
            }
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
            onClick={() =>
              handleFilterChange("groupByChassi", !filters.groupByChassi)
            }
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
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div
          className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600"
          style={{ gridTemplateColumns }}
        >
          {columnOrder.map((column) => (
            <span key={column}>{columnLabels[column]}</span>
          ))}
        </div>

        <div className="divide-y divide-slate-200">
          {groupedTickets.map(({ ticket, groupIndex }) => {
            const isStriped = filters.groupByChassi || filters.groupByEmpresa;
            const backgroundClass =
              isStriped && groupIndex % 2 === 1 ? "bg-slate-50" : "bg-white";

            const cells: Record<ColumnId, React.ReactNode> = {
              ticket: (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="slate">#{ticket.number}</Badge>
                  {ticket.url && (
                    <a
                      href={ticket.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-sky-700 underline decoration-sky-300 decoration-2 underline-offset-4 transition hover:text-sky-900"
                    >
                      Abrir
                    </a>
                  )}
                </div>
              ),
              titulo: (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-slate-800">
                    {ticket.title}
                  </span>
                  {ticket.createdAt && (
                    <span className="text-xs text-slate-500">
                      Criado em {formatDate(ticket.createdAt)}
                    </span>
                  )}
                </div>
              ),
              status: (
                <Badge tone={ticketStatusTone[ticket.status]}>
                  {ticketStatusLabel[ticket.status]}
                </Badge>
              ),
              chassi: (
                <Badge tone={ticket.serialNumber ? "emerald" : "slate"}>
                  {ticket.serialNumber ?? "Sem chassi"}
                </Badge>
              ),
              consultor: (
                <span className="truncate text-slate-700">
                  {ticket.advisorName ?? "N/A"}
                </span>
              ),
              cliente: (
                <span className="truncate text-slate-700">
                  {ticket.customerName ?? "N/A"}
                </span>
              ),
              equipe: (
                <Badge tone="sky">{ticket.teamName ?? "N/A"}</Badge>
              ),
              atualizado: (
                <span className="text-slate-700">
                  {formatDate(ticket.updatedAt)}
                </span>
              ),
            };

            return (
              <div
                key={ticket.id}
                className={`grid items-center gap-4 px-5 py-3 text-sm text-slate-800 hover:bg-slate-50 ${backgroundClass}`}
                style={{ gridTemplateColumns }}
              >
                {columnOrder.map((column) => (
                  <div key={column}>{cells[column]}</div>
                ))}
              </div>
            );
          })}
          {tickets.length === 0 && (
            <div className="px-5 py-4 text-sm text-slate-500">
              {loading
                ? "Carregando tickets..."
                : "Nenhum ticket encontrado com esses filtros."}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <div className="flex items-center gap-2">
          <span>
            Página {page} de {totalPages}
          </span>
          <span className="text-slate-400">
            ({total} tickets filtrados)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(-1)}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page >= totalPages || loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
