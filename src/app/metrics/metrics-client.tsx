"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { MetricsTabs } from "@/components/MetricsTabs";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import {
  UserActionMetricsHeader,
  UserActionMetricsView,
} from "@/components/UserActionMetricsView";
import { LeadDetailsAside } from "@/components/LeadDetailsAside";
import { fetchLeadById, fetchLeadMetrics, fetchTicketMetrics } from "@/lib/api";
import { Lead, TimeRange } from "@/lib/domain";
import type {
  DailyActionMetricsRow,
  UserActionEventRow,
  UserActionMetricsRow,
  UserIdentity,
} from "@/lib/metrics";

type MetricsTab = "leads" | "tickets";

export default function MetricsClient() {
  const [activeTab, setActiveTab] = useState<MetricsTab>("leads");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [rows, setRows] = useState<UserActionMetricsRow[]>([]);
  const [daily, setDaily] = useState<DailyActionMetricsRow[]>([]);
  const [events, setEvents] = useState<UserActionEventRow[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetailsOpen, setLeadDetailsOpen] = useState(false);
  const [usersByTab, setUsersByTab] = useState<Record<MetricsTab, UserIdentity[]>>({
    leads: [],
    tickets: [],
  });
  const usersByTabRef = useRef(usersByTab);
  const [selectedUserByTab, setSelectedUserByTab] = useState<
    Record<MetricsTab, string | null>
  >({
    leads: null,
    tickets: null,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersByTabRef.current = usersByTab;
  }, [usersByTab]);

  const loadData = useCallback(async (includeUsers: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response =
        activeTab === "leads"
          ? await fetchLeadMetrics(timeRange, { includeUsers })
          : await fetchTicketMetrics(timeRange, { includeUsers });
      setRows(response.items);
      setDaily(response.daily);
      setEvents(response.events);
      if (includeUsers) {
        setUsersByTab((prev) => ({
          ...prev,
          [activeTab]: response.users,
        }));
      }
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar as métricas.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, timeRange]);

  useEffect(() => {
    const includeUsers =
      (usersByTabRef.current[activeTab] ?? []).length === 0;
    void loadData(includeUsers);
  }, [activeTab, loadData, timeRange]);

  const handleSelectedUserChange = useCallback(
    (id: string | null) => {
      setSelectedUserByTab((prev) => ({
        ...prev,
        [activeTab]: id,
      }));
    },
    [activeTab],
  );

  const handleLeadAssigned = useCallback((leadId: number, assignee: string) => {
    setSelectedLead((prev) =>
      prev && prev.id === leadId
        ? { ...prev, consultor: assignee, status: "atribuido" }
        : prev,
    );
  }, []);

  const handleActionEventClick = useCallback(
    async (event: UserActionEventRow) => {
      if (activeTab !== "leads") return;
      const leadId = Number(event.item_id);
      if (!Number.isFinite(leadId) || leadId <= 0) return;

      if (selectedLead?.id === leadId) {
        setLeadDetailsOpen(true);
        return;
      }

      try {
        const lead = await fetchLeadById(leadId);
        setSelectedLead(lead);
        setLeadDetailsOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
      }
    },
    [activeTab, selectedLead?.id],
  );

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
            onClick={() => {
              const includeUsers =
                (usersByTabRef.current[activeTab] ?? []).length === 0;
              void loadData(includeUsers);
            }}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return (
      <UserActionMetricsView
        entity={activeTab}
        rows={rows}
        daily={daily}
        events={events}
        users={usersByTab[activeTab] ?? []}
        selectedUserId={selectedUserByTab[activeTab] ?? null}
        range={timeRange}
        onActionEventClick={activeTab === "leads" ? handleActionEventClick : undefined}
      />
    );
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
        <UserActionMetricsHeader
          rows={rows}
          users={usersByTab[activeTab] ?? []}
          selectedUserId={selectedUserByTab[activeTab] ?? null}
          onSelectedUserIdChange={handleSelectedUserChange}
        />
        {renderContent()}
      </div>

      {selectedLead ? (
        <LeadDetailsAside
          lead={selectedLead}
          open={leadDetailsOpen}
          onClose={() => setLeadDetailsOpen(false)}
          onLeadAssigned={handleLeadAssigned}
        />
      ) : null}
    </PageShell>
  );
}
