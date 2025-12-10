"use client";

import { useMemo, useState } from "react";
import { Ticket } from "@/lib/domain";
import { FiltersState, INITIAL_FILTERS } from "@/lib/filters";
import { Badge } from "./Badge";
import { FiltersBar } from "./FiltersBar";

type TicketsListProps = {
  tickets: Ticket[];
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const initialFilters: FiltersState = { ...INITIAL_FILTERS };

const ticketStatusTone: Record<Ticket["status"], Parameters<typeof Badge>[0]["tone"]> =
  {
    aberto: "amber",
    em_andamento: "sky",
    fechado: "emerald",
  };

const ticketStatusLabel: Record<Ticket["status"], string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  fechado: "Fechado",
};

const formatDate = (iso: string) => dateFormatter.format(new Date(iso));

export function TicketsList({ tickets }: TicketsListProps) {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);

  const tipoLeadOptions = useMemo(
    () =>
      Array.from(new Set(tickets.map((ticket) => ticket.tipoLeadOrigem))).sort(),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    const sorted = [...tickets].sort((a, b) => {
      const aDate = new Date(a.criadoEm).getTime();
      const bDate = new Date(b.criadoEm).getTime();
      return filters.sort === "recentes" ? bDate - aDate : aDate - bDate;
    });

    return sorted.filter((ticket) => {
      const matchesTipo =
        !filters.tipoLead || ticket.tipoLeadOrigem === filters.tipoLead;
      const matchesSearch =
        !searchTerm ||
        ticket.externalId.toLowerCase().includes(searchTerm) ||
        ticket.chassiOuMaquina.toLowerCase().includes(searchTerm) ||
        ticket.tipoLeadOrigem.toLowerCase().includes(searchTerm) ||
        ticket.empresa.toLowerCase().includes(searchTerm);

      return matchesTipo && matchesSearch;
    });
  }, [filters, tickets]);

  return (
    <div className="space-y-4">
      <FiltersBar
        value={filters}
        tipoLeadOptions={tipoLeadOptions}
        searchPlaceholder="Buscar por externo, chassi ou empresa"
        onFiltersChange={setFilters}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_0.9fr_0.9fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span>Empresa</span>
          <span>Chassi / Maquina</span>
          <span>Tipo Lead Origem</span>
          <span>Criado em</span>
          <span>Status</span>
          <span>Virou OS?</span>
          <span>Link externo</span>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="grid grid-cols-[1.1fr_1fr_1fr_1fr_0.9fr_0.9fr_0.9fr] items-center gap-4 px-5 py-3 text-sm text-slate-800 hover:bg-slate-50"
            >
              <div>
                <Badge tone="sky">{ticket.empresa}</Badge>
              </div>
              <div className="flex flex-col gap-1">
                <Badge tone="emerald">{ticket.chassiOuMaquina}</Badge>
                {ticket.leadId && (
                  <span className="text-xs text-slate-500">
                    Lead vinculado: {ticket.leadId}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="violet">{ticket.tipoLeadOrigem}</Badge>
                <Badge tone="slate">#{ticket.externalId}</Badge>
              </div>
              <div className="text-slate-800">{formatDate(ticket.criadoEm)}</div>
              <div>
                <Badge tone={ticketStatusTone[ticket.status]}>
                  {ticketStatusLabel[ticket.status]}
                </Badge>
              </div>
              <div>
                <Badge tone={ticket.virouOS ? "emerald" : "rose"}>
                  {ticket.virouOS ? "Sim" : "Nao"}
                </Badge>
              </div>
              <div>
                <a
                  href={ticket.linkExterno}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:text-sky-900"
                >
                  Abrir
                  <span aria-hidden>-&gt;</span>
                </a>
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
