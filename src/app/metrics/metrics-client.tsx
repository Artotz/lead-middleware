"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { MetricsTabs } from "@/components/MetricsTabs";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { LeadsMetricsView } from "@/components/LeadsMetricsView";
import { TicketsMetricsView } from "@/components/TicketsMetricsView";
import { fetchLeads, fetchTickets } from "@/lib/api";
import { Lead, Ticket, TimeRange } from "@/lib/domain";

type MetricsTab = "leads" | "tickets";

export default function MetricsClient() {
  const [activeTab, setActiveTab] = useState<MetricsTab>("leads");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllLeads = useCallback(async () => {
    const pageSize = 100;
    let page = 1;
    let accumulated: Lead[] = [];
    let total = 0;

    for (;;) {
      const resp = await fetchLeads({ page, pageSize });
      accumulated = accumulated.concat(resp.items);
      total = resp.total ?? accumulated.length;

      const fetchedAll =
        accumulated.length >= total || resp.items.length < pageSize;

      if (fetchedAll) {
        break;
      }

      page += 1;
    }

    return accumulated;
  }, []);

  const loadAllTickets = useCallback(async () => {
    const pageSize = 200;
    let page = 1;
    let accumulated: Ticket[] = [];
    let total = 0;

    for (;;) {
      const resp = await fetchTickets({ page, pageSize });
      accumulated = accumulated.concat(resp.items);
      total = resp.total ?? accumulated.length;

      const fetchedAll =
        accumulated.length >= total || resp.items.length < pageSize;

      if (fetchedAll) {
        break;
      }

      page += 1;
    }

    return accumulated;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allLeads, allTickets] = await Promise.all([
        loadAllLeads(),
        loadAllTickets(),
      ]);
      setLeads(allLeads);
      setTickets(allTickets);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar as métricas.");
    } finally {
      setLoading(false);
    }
  }, [loadAllLeads, loadAllTickets]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Carregando métricas...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 shadow-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (activeTab === "leads") {
      return <LeadsMetricsView leads={leads} timeRange={timeRange} />;
    }

    return <TicketsMetricsView tickets={tickets} timeRange={timeRange} />;
  };

  return (
    <PageShell
      title="Métricas"
      subtitle="Visão rápida das volumetrias por período."
    >
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <MetricsTabs activeTabId={activeTab} onChange={setActiveTab} />
            <TimeRangeSelector
              activeRange={timeRange}
              onChange={setTimeRange}
            />
          </div>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Sair
            </button>
          </form>
        </div>
        <p className="text-xs text-slate-500">
          Filtrando dados do período selecionado.
        </p>
        {renderContent()}
      </div>
    </PageShell>
  );
}
