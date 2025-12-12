"use client";

import { useCallback, useEffect, useState } from "react";
import { LeadsList } from "@/components/LeadsList";
import { PageShell } from "@/components/PageShell";
import { Tabs } from "@/components/Tabs";
import { TicketsList } from "@/components/TicketsList";
import { fetchLeads, fetchTickets } from "@/lib/api";
import { Lead, Ticket } from "@/lib/domain";
import { FiltersState, INITIAL_FILTERS } from "@/lib/filters";

type DashboardTab = "leads" | "tickets";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState<number>(0);
  const [leadsPage, setLeadsPage] = useState<number>(1);
  const [leadsPageSize] = useState<number>(10);
  const [leadsLoading, setLeadsLoading] = useState<boolean>(false);
  const [leadFilters, setLeadFilters] =
    useState<FiltersState>(INITIAL_FILTERS);
  const [tickets, setTickets] = useState<Ticket[]>([]);
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
        setError("Não foi possível carregar os leads do Supabase.");
      } finally {
        setLeadsLoading(false);
      }
    },
    [leadsPageSize],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLeadsLoading(true);
    try {
      const [leadsResp, ticketsData] = await Promise.all([
        fetchLeads({ page: 1, pageSize: leadsPageSize, ...INITIAL_FILTERS }),
        fetchTickets(),
      ]);
      setLeads(leadsResp.items);
      setLeadsTotal(leadsResp.total);
      setLeadsPage(leadsResp.page);
      setTickets(ticketsData);
      setLeadFilters(INITIAL_FILTERS);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os dados iniciais.");
    } finally {
      setLeadsLoading(false);
      setLoading(false);
    }
  }, [leadsPageSize]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const totalPages = Math.max(1, Math.ceil(leadsTotal / leadsPageSize));

  const handlePageChange = (direction: -1 | 1) => {
    const next = Math.min(totalPages, Math.max(1, leadsPage + direction));
    if (next !== leadsPage) {
      void loadLeads(next, leadFilters);
    }
  };

  const handleLeadFiltersChange = (next: FiltersState) => {
    setLeadFilters(next);
    setLeadsPage(1);
    void loadLeads(1, next);
  };

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
          />
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <div className="flex items-center gap-2">
              <span>
                Página {leadsPage} de {totalPages}
              </span>
              <span className="text-slate-400">
                ({leadsTotal} leads no total)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(-1)}
                disabled={leadsPage <= 1 || leadsLoading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={leadsPage >= totalPages || leadsLoading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:opacity-50"
              >
                Próxima
              </button>
              {leadsLoading && (
                <span className="text-xs text-slate-500">Atualizando...</span>
              )}
            </div>
          </div>
        </div>
      );
    }

    return <TicketsList tickets={tickets} />;
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
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fonte: Supabase (leads e tickets)
          </div>
        </div>

        {renderContent()}
      </div>
    </PageShell>
  );
}
