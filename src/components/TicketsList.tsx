"use client";

import { Ticket, TicketStatus } from "@/lib/domain";
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

  const handleFilterChange = <K extends keyof TicketFiltersState>(
    key: K,
    val: TicketFiltersState[K],
  ) => {
    onFiltersChange({ ...filters, [key]: val });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_1.5fr_0.9fr_1.1fr_1.1fr_1.1fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span>Ticket</span>
          <span>Título</span>
          <span>Status</span>
          <span>Chassi</span>
          <span>Consultor</span>
          <span>Cliente</span>
          <span>Equipe</span>
          <span>Atualizado</span>
        </div>

        <div className="divide-y divide-slate-200">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="grid grid-cols-[1fr_1.5fr_0.9fr_1.1fr_1.1fr_1.1fr_1fr_1fr] items-center gap-4 px-5 py-3 text-sm text-slate-800 hover:bg-slate-50"
            >
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
              <div>
                <Badge tone={ticketStatusTone[ticket.status]}>
                  {ticketStatusLabel[ticket.status]}
                </Badge>
              </div>
              <div>
                <Badge tone={ticket.serialNumber ? "emerald" : "slate"}>
                  {ticket.serialNumber ?? "Sem chassi"}
                </Badge>
              </div>
              <div className="truncate text-slate-700">
                {ticket.advisorName ?? "N/A"}
              </div>
              <div className="truncate text-slate-700">
                {ticket.customerName ?? "N/A"}
              </div>
              <div>
                <Badge tone="sky">{ticket.teamName ?? "N/A"}</Badge>
              </div>
              <div className="text-slate-700">
                {formatDate(ticket.updatedAt)}
              </div>
            </div>
          ))}
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
