"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LeadServiceOrdersList } from "@/components/LeadServiceOrdersList";
import { LeadsList } from "@/components/LeadsList";
import { PageShell } from "@/components/PageShell";
import { Tabs } from "@/components/Tabs";
import { TicketsList } from "@/components/TicketsList";
import { TicketDetailsAside } from "@/components/TicketDetailsAside";
import { LeadDetailsAside } from "@/components/LeadDetailsAside";
import { getUserDisplayName, useAuth } from "@/contexts/AuthContext";
import {
  fetchLeadServiceOrders,
  fetchLeads,
  fetchTicketOptions,
  fetchTickets,
} from "@/lib/api";
import { Lead, LeadServiceOrder, Ticket } from "@/lib/domain";
import { FiltersState, INITIAL_FILTERS } from "@/lib/filters";
import {
  INITIAL_TICKET_FILTERS,
  TicketFiltersState,
} from "@/lib/ticketFilters";
import {
  FILTER_STORAGE_KEYS,
  loadLeadFilters,
  loadTicketFilters,
  saveFilters,
} from "@/lib/filterStorage";

type DashboardTab = "leads" | "tickets" | "os";

type DashboardInitialFilters = {
  leadFilters: FiltersState;
  serviceOrderFilters: FiltersState;
  ticketFilters: TicketFiltersState;
};

const INITIAL_SERVICE_ORDER_FILTERS: FiltersState = {
  ...INITIAL_FILTERS,
  status: [],
};

export default function DashboardClient() {
  const { user } = useAuth();
  const currentUserName = useMemo(() => getUserDisplayName(user), [user]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("leads");
  const [filtersReady, setFiltersReady] = useState(false);
  const leadFiltersHydrated = useRef(false);
  const serviceOrderFiltersHydrated = useRef(false);
  const ticketFiltersHydrated = useRef(false);

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

  // Service orders
  const [serviceOrders, setServiceOrders] = useState<LeadServiceOrder[]>([]);
  const [serviceOrdersTotal, setServiceOrdersTotal] = useState<number>(0);
  const [serviceOrdersPage, setServiceOrdersPage] = useState<number>(1);
  const [serviceOrdersPageSize] = useState<number>(10);
  const [serviceOrdersLoading, setServiceOrdersLoading] =
    useState<boolean>(false);
  const [serviceOrderFilters, setServiceOrderFilters] = useState<FiltersState>(
    INITIAL_SERVICE_ORDER_FILTERS,
  );

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

  const loadServiceOrders = useCallback(
    async (page: number, filters: FiltersState) => {
      setServiceOrdersLoading(true);
      setError(null);
      try {
        const resp = await fetchLeadServiceOrders({
          page,
          pageSize: serviceOrdersPageSize,
          ...filters,
        });
        setServiceOrders(resp.items);
        setServiceOrdersTotal(resp.total);
        setServiceOrdersPage(resp.page);
      } catch (err) {
        console.error(err);
        setError("Nao foi possivel carregar as OS do Supabase.");
      } finally {
        setServiceOrdersLoading(false);
      }
    },
    [serviceOrdersPageSize],
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

  const loadInitial = useCallback(
    async (
      initialFilters: DashboardInitialFilters = {
        leadFilters: INITIAL_FILTERS,
        serviceOrderFilters: INITIAL_SERVICE_ORDER_FILTERS,
        ticketFilters: INITIAL_TICKET_FILTERS,
      },
    ) => {
      const { leadFilters, serviceOrderFilters, ticketFilters } =
        initialFilters;
    setLoading(true);
    setError(null);
    setLeadsLoading(true);
    setServiceOrdersLoading(true);
    setTicketsLoading(true);
    try {
      const [leadsResp, serviceOrdersResp, ticketsResp, optionsResp] =
        await Promise.all([
          fetchLeads({ page: 1, pageSize: leadsPageSize, ...leadFilters }),
          fetchLeadServiceOrders({
            page: 1,
            pageSize: serviceOrdersPageSize,
            ...serviceOrderFilters,
          }),
          fetchTickets({
            page: 1,
            pageSize: ticketsPageSize,
            ...ticketFilters,
          }),
          fetchTicketOptions(),
        ]);
      setLeads(leadsResp.items);
      setLeadsTotal(leadsResp.total);
      setLeadsPage(leadsResp.page);

      setServiceOrders(serviceOrdersResp.items);
      setServiceOrdersTotal(serviceOrdersResp.total);
      setServiceOrdersPage(serviceOrdersResp.page);

      setTickets(ticketsResp.items);
      setTicketsTotal(ticketsResp.total);
      setTicketsPage(ticketsResp.page);
      setTicketOptions(optionsResp);

      setLeadFilters(leadFilters);
      setServiceOrderFilters(serviceOrderFilters);
      setTicketFilters(ticketFilters);
    } catch (err) {
      console.error(err);
      setError("Nao foi possivel carregar os dados iniciais.");
    } finally {
      setLeadsLoading(false);
      setServiceOrdersLoading(false);
      setTicketsLoading(false);
      setLoading(false);
    }
    },
    [leadsPageSize, serviceOrdersPageSize, ticketsPageSize],
  );

  useEffect(() => {
    const storedLeadFilters = loadLeadFilters(
      FILTER_STORAGE_KEYS.dashboardLeads,
      INITIAL_FILTERS,
    );
    const storedServiceOrderFilters = loadLeadFilters(
      FILTER_STORAGE_KEYS.dashboardServiceOrders,
      INITIAL_SERVICE_ORDER_FILTERS,
    );
    const storedTicketFilters = loadTicketFilters(
      FILTER_STORAGE_KEYS.dashboardTickets,
      INITIAL_TICKET_FILTERS,
    );

    void loadInitial({
      leadFilters: storedLeadFilters,
      serviceOrderFilters: storedServiceOrderFilters,
      ticketFilters: storedTicketFilters,
    }).finally(() => {
      setFiltersReady(true);
    });
  }, [loadInitial]);

  const leadsTotalPages = Math.max(1, Math.ceil(leadsTotal / leadsPageSize));
  const serviceOrdersTotalPages = Math.max(
    1,
    Math.ceil(serviceOrdersTotal / serviceOrdersPageSize),
  );
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
  };

  const handleServiceOrdersPageChange = (direction: -1 | 1) => {
    const next = Math.min(
      serviceOrdersTotalPages,
      Math.max(1, serviceOrdersPage + direction),
    );
    if (next !== serviceOrdersPage) {
      void loadServiceOrders(next, serviceOrderFilters);
    }
  };

  const handleServiceOrderFiltersChange = (next: FiltersState) => {
    setServiceOrderFilters(next);
    setServiceOrdersPage(1);
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
  };

  useEffect(() => {
    if (!filtersReady) {
      return;
    }
    if (!leadFiltersHydrated.current) {
      leadFiltersHydrated.current = true;
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void loadLeads(1, leadFilters);
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [filtersReady, leadFilters, loadLeads]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }
    if (!ticketFiltersHydrated.current) {
      ticketFiltersHydrated.current = true;
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void loadTickets(1, ticketFilters);
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [filtersReady, loadTickets, ticketFilters]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }
    if (!serviceOrderFiltersHydrated.current) {
      serviceOrderFiltersHydrated.current = true;
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void loadServiceOrders(1, serviceOrderFilters);
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [filtersReady, loadServiceOrders, serviceOrderFilters]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }
    saveFilters(FILTER_STORAGE_KEYS.dashboardLeads, leadFilters);
  }, [filtersReady, leadFilters]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }
    saveFilters(
      FILTER_STORAGE_KEYS.dashboardServiceOrders,
      serviceOrderFilters,
    );
  }, [filtersReady, serviceOrderFilters]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }
    saveFilters(FILTER_STORAGE_KEYS.dashboardTickets, ticketFilters);
  }, [filtersReady, ticketFilters]);

  const handleLeadAssigned = useCallback((leadId: number, assignee: string) => {
    const updatedAt = new Date().toISOString();
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? { ...lead, consultor: assignee, status: "atribuido", updatedAt }
          : lead,
      ),
    );
    setServiceOrders((prev) =>
      prev.map((order) =>
        order.lead.id === leadId
          ? {
              ...order,
              lead: {
                ...order.lead,
                consultor: assignee,
                status: "atribuido",
                updatedAt,
              },
            }
          : order,
      ),
    );
    setSelectedLead((prev) =>
      prev && prev.id === leadId
        ? { ...prev, consultor: assignee, status: "atribuido", updatedAt }
        : prev,
    );
  }, []);

  const handleLeadStatusChange = useCallback((leadId: number, status: string) => {
    const updatedAt = new Date().toISOString();
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status, updatedAt } : lead,
      ),
    );
    setServiceOrders((prev) =>
      prev.map((order) =>
        order.lead.id === leadId
          ? { ...order, lead: { ...order.lead, status, updatedAt } }
          : order,
      ),
    );
    setSelectedLead((prev) =>
      prev && prev.id === leadId ? { ...prev, status, updatedAt } : prev,
    );
  }, []);

  const handleServiceOrderUpdated = useCallback(
    (update: {
      id: number;
      partsValue: number;
      laborValue: number;
      note: string | null;
      updatedAt: string;
    }) => {
      setServiceOrders((prev) =>
        prev.map((order) =>
          order.id === update.id
            ? {
                ...order,
                partsValue: update.partsValue,
                laborValue: update.laborValue,
                note: update.note,
                updatedAt: update.updatedAt,
              }
            : order,
        ),
      );
    },
    [],
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Carregando leads, OS e tickets...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 shadow-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={() =>
              loadInitial({
                leadFilters,
                serviceOrderFilters,
                ticketFilters,
              })
            }
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
            pageSize={leadsPageSize}
            currentUserName={currentUserName}
            onLeadAssigned={handleLeadAssigned}
            onLeadStatusChange={handleLeadStatusChange}
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

    if (activeTab === "os") {
      return (
        <div className="space-y-3">
          <LeadServiceOrdersList
            orders={serviceOrders}
            filters={serviceOrderFilters}
            onFiltersChange={handleServiceOrderFiltersChange}
            onOrderUpdated={handleServiceOrderUpdated}
            loading={serviceOrdersLoading}
            pageSize={serviceOrdersPageSize}
            onLeadSelect={(lead) => {
              setSelectedLead(lead);
              setLeadDetailsOpen(true);
            }}
          />
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <div className="flex items-center gap-2">
              <span>
                Pagina {serviceOrdersPage} de {serviceOrdersTotalPages}
              </span>
              <span className="text-slate-400">
                ({serviceOrdersTotal} OS no total)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleServiceOrdersPageChange(-1)}
                disabled={serviceOrdersPage <= 1 || serviceOrdersLoading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => handleServiceOrdersPageChange(1)}
                disabled={
                  serviceOrdersPage >= serviceOrdersTotalPages ||
                  serviceOrdersLoading
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:opacity-50"
              >
                Proxima
              </button>
              {serviceOrdersLoading && (
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
          onRefresh={() => {
            void loadTickets(ticketsPage, ticketFilters);
          }}
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
      subtitle="Leads, OS e tickets servidos direto do Supabase."
    >
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs
            tabs={[
              { id: "leads", label: "LEADS" },
              { id: "os", label: "OS" },
              { id: "tickets", label: "TICKETS" },
            ]}
            activeTabId={activeTab}
            onTabChange={(id) => setActiveTab(id as DashboardTab)}
          />
          <div className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:flex-row sm:items-center sm:gap-4">
            <span>Fonte: Supabase (leads, OS e tickets)</span>
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
