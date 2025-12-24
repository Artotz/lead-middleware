"use client";

import { useCallback, useEffect, useState } from "react";
import { LeadsList } from "@/components/LeadsList";
import { PageShell } from "@/components/PageShell";
import { Tabs } from "@/components/Tabs";
import { TicketsList } from "@/components/TicketsList";
import { TicketDetailsAside } from "@/components/TicketDetailsAside";
import { LeadDetailsAside } from "@/components/LeadDetailsAside";
import { fetchLeads, fetchTicketOptions, fetchTickets } from "@/lib/api";
import { Lead, Ticket } from "@/lib/domain";
import { FiltersState, INITIAL_FILTERS } from "@/lib/filters";
import {
  INITIAL_TICKET_FILTERS,
  TicketFiltersState,
} from "@/lib/ticketFilters";

type DashboardTab = "leads" | "tickets";

type DashboardClientProps = {
  currentUserName: string;
};

export default function DashboardClient({ currentUserName }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("leads");

  // Leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState<number>(0);
  const [leadsPage, setLeadsPage] = useState<number>(1);
  const [leadsPageSize] = useState<number>(10);
  const [leadsLoading, setLeadsLoading] = useState<boolean>(false);
  const [leadFilters, setLeadFilters] =
    useState<FiltersState>(INITIAL_FILTERS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetailsOpen, setLeadDetailsOpen] = useState<boolean>(false);

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState<number>(0);
  const [ticketsPage, setTicketsPage] = useState<number>(1);
  const [ticketsPageSize] = useState<number>(10);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(false);
  const [ticketFilters, setTicketFilters] = useState<TicketFiltersState>(
    INITIAL_TICKET_FILTERS,
  );
  const [ticketOptions, setTicketOptions] = useState<{
    consultores: string[];
    clientes: string[];
    equipes: string[];
  } | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(
    async (page: number, filters: FiltersState) => {
      setLeadsLoading(true);
      setError(null);
      try {
        const resp = await fetchLeads({
          page,
          pageSize: leadsPageSize,
          ...filters,
        });
        setLeads(resp.items);
        setLeadsTotal(resp.total);
        setLeadsPage(resp.page);
      } catch (err) {
        console.error(err);
        setError("NÇœo foi possÇðvel carregar os leads do Supabase.");
      } finally {
        setLeadsLoading(false);
      }
    },
    [leadsPageSize],
  );

  const loadTickets = useCallback(
    async (page: number, filters: TicketFiltersState) => {
      setTicketsLoading(true);
      setError(null);
      try {
        const resp = await fetchTickets({
          page,
          pageSize: ticketsPageSize,
          ...filters,
        });
        setTickets(resp.items);
        setTicketsTotal(resp.total);
        setTicketsPage(resp.page);
        if (resp.options) {
          setTicketOptions(resp.options);
        }
      } catch (err) {
        console.error(err);
        setError("NÇœo foi possÇðvel carregar os tickets do Supabase.");
      } finally {
        setTicketsLoading(false);
      }
    },
    [ticketsPageSize],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLeadsLoading(true);
    setTicketsLoading(true);
    try {
      const [leadsResp, ticketsResp, optionsResp] = await Promise.all([
        fetchLeads({ page: 1, pageSize: leadsPageSize, ...INITIAL_FILTERS }),
        fetchTickets({
          page: 1,
          pageSize: ticketsPageSize,
          ...INITIAL_TICKET_FILTERS,
        }),
        fetchTicketOptions(),
      ]);
      setLeads(leadsResp.items);
      setLeadsTotal(leadsResp.total);
      setLeadsPage(leadsResp.page);

      setTickets(ticketsResp.items);
      setTicketsTotal(ticketsResp.total);
      setTicketsPage(ticketsResp.page);
      setTicketOptions(optionsResp);

      setLeadFilters(INITIAL_FILTERS);
      setTicketFilters(INITIAL_TICKET_FILTERS);
    } catch (err) {
      console.error(err);
      setError("NÇœo foi possÇðvel carregar os dados iniciais.");
    } finally {
      setLeadsLoading(false);
      setTicketsLoading(false);
      setLoading(false);
    }
  }, [leadsPageSize, ticketsPageSize]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const leadsTotalPages = Math.max(1, Math.ceil(leadsTotal / leadsPageSize));
  const ticketsTotalPages = Math.max(
    1,
    Math.ceil(ticketsTotal / ticketsPageSize),
  );

  const handleLeadPageChange = (direction: -1 | 1) => {
    const next = Math.min(
      leadsTotalPages,
      Math.max(1, leadsPage + direction),
    );
    if (next !== leadsPage) {
      void loadLeads(next, leadFilters);
    }
  };

  const handleLeadFiltersChange = (next: FiltersState) => {
    setLeadFilters(next);
    setLeadsPage(1);
    void loadLeads(1, next);
  };

  const handleTicketPageChange = (direction: -1 | 1) => {
    const next = Math.min(
      ticketsTotalPages,
      Math.max(1, ticketsPage + direction),
    );
    if (next !== ticketsPage) {
      void loadTickets(next, ticketFilters);
    }
  };

  const handleTicketFiltersChange = (next: TicketFiltersState) => {
    setTicketFilters(next);
    setTicketsPage(1);
    void loadTickets(1, next);
  };

  const handleLeadAssigned = useCallback((leadId: number, assignee: string) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? { ...lead, consultor: assignee, status: "atribuido" }
          : lead,
      ),
    );
    setSelectedLead((prev) =>
      prev && prev.id === leadId
        ? { ...prev, consultor: assignee, status: "atribuido" }
        : prev,
    );
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Carregando leads e tickets...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 shadow-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadInitial}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (activeTab === "leads") {
      return (
        <div className="space-y-3">
          <LeadsList
            leads={leads}
            filters={leadFilters}
            onFiltersChange={handleLeadFiltersChange}
            loading={leadsLoading}
            currentUserName={currentUserName}
            onLeadAssigned={handleLeadAssigned}
            onLeadSelect={(lead) => {
              setSelectedLead(lead);
              setLeadDetailsOpen(true);
            }}
          />
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <div className="flex items-center gap-2">
              <span>
                PÇ­gina {leadsPage} de {leadsTotalPages}
              </span>
              <span className="text-slate-400">
                ({leadsTotal} leads no total)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLeadPageChange(-1)}
                disabled={leadsPage <= 1 || leadsLoading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => handleLeadPageChange(1)}
                disabled={leadsPage >= leadsTotalPages || leadsLoading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:opacity-50"
              >
                PrÇüxima
              </button>
              {leadsLoading && (
                <span className="text-xs text-slate-500">Atualizando...</span>
              )}
            </div>
          </div>

          {selectedLead ? (
            <LeadDetailsAside
              lead={selectedLead}
              open={leadDetailsOpen}
              onClose={() => setLeadDetailsOpen(false)}
              currentUserName={currentUserName}
              onLeadAssigned={handleLeadAssigned}
            />
          ) : null}
        </div>
      );
    }

    return (
      <>
        <TicketsList
          tickets={tickets}
          total={ticketsTotal}
          page={ticketsPage}
          pageSize={ticketsPageSize}
          filters={ticketFilters}
          loading={ticketsLoading}
          onFiltersChange={handleTicketFiltersChange}
          onPageChange={handleTicketPageChange}
          options={ticketOptions ?? undefined}
          onTicketSelect={(ticket: Ticket) => {
            setSelectedTicketId(ticket.id);
            setTicketDetailsOpen(true);
          }}
        />

        {selectedTicketId ? (
          <TicketDetailsAside
            ticketId={selectedTicketId}
            open={ticketDetailsOpen}
            onClose={() => setTicketDetailsOpen(false)}
          />
        ) : null}
      </>
    );
  };

  return (
    <PageShell
      title="Dashboard"
      subtitle="Leads e tickets servidos direto do Supabase."
    >
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs
            tabs={[
              { id: "leads", label: "LEADS" },
              { id: "tickets", label: "TICKETS" },
            ]}
            activeTabId={activeTab}
            onTabChange={(id) => setActiveTab(id as DashboardTab)}
          />
          <div className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:flex-row sm:items-center sm:gap-4">
            <span>Fonte: Supabase (leads e tickets)</span>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Sair
              </button>
            </form>
          </div>
        </div>

        {renderContent()}
      </div>
    </PageShell>
  );
}
