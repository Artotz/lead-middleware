"use client";

import { useMemo, useState } from "react";
import { Ticket, TicketStatus } from "@/lib/domain";
import { SortOrder } from "@/lib/filters";
import { Badge } from "./Badge";

type TicketsListProps = {
  tickets: Ticket[];
};

type TicketFiltersState = {
  search: string;
  status: TicketStatus | "";
  sort: SortOrder;
};

const initialFilters: TicketFiltersState = {
  search: "",
  status: "",
  sort: "recentes",
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

const normalize = (value: string | null | undefined) =>
  value?.toLowerCase() ?? "";

const sortTime = (ticket: Ticket) =>
  new Date(ticket.updatedAt ?? ticket.createdAt ?? 0).getTime();

export function TicketsList({ tickets }: TicketsListProps) {
  const [filters, setFilters] = useState<TicketFiltersState>(initialFilters);

  const statusOptions = useMemo(
    () => Array.from(new Set(tickets.map((ticket) => ticket.status))),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    const sorted = [...tickets].sort((a, b) => {
      const aDate = sortTime(a);
      const bDate = sortTime(b);
      return filters.sort === "recentes" ? bDate - aDate : aDate - bDate;
    });

    return sorted.filter((ticket) => {
      const matchesStatus =
        !filters.status || ticket.status === filters.status;

      const matchesSearch =
        !searchTerm ||
        [ticket.number, ticket.title, ticket.serialNumber, ticket.advisorName]
          .concat([ticket.customerName, ticket.teamName])
          .some((field) => normalize(field).includes(searchTerm));

      return matchesStatus && matchesSearch;
    });
  }, [filters, tickets]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Busca
            <input
              type="search"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Buscar por ticket, título, chassi ou cliente"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as TicketStatus | "",
                }))
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">Todos</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {ticketStatusLabel[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ordenação
            <select
              value={filters.sort}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sort: e.target.value as SortOrder,
                }))
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
        <div className="grid grid-cols-[0.9fr_1.4fr_0.8fr_1fr_1fr_1fr_0.9fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
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
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="grid grid-cols-[0.9fr_1.4fr_0.8fr_1fr_1fr_1fr_0.9fr_1fr] items-center gap-4 px-5 py-3 text-sm text-slate-800 hover:bg-slate-50"
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
          {filteredTickets.length === 0 && (
            <div className="px-5 py-4 text-sm text-slate-500">
              Nenhum ticket encontrado com esses filtros.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
