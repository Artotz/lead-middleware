"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Tabs } from "@/components/Tabs";
import { MetricsTabs } from "@/components/MetricsTabs";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { LeadStatusMetricsView } from "@/components/LeadStatusMetricsView";
import {
  UserActionMetricsHeader,
  UserActionMetricsView,
} from "@/components/UserActionMetricsView";
import { LeadDetailsAside } from "@/components/LeadDetailsAside";
import {
  fetchLeadById,
  fetchLeadMetrics,
  fetchLeads,
  fetchTicketMetrics,
} from "@/lib/api";
import { Lead, TimeRange } from "@/lib/domain";
import { INITIAL_FILTERS } from "@/lib/filters";
import type {
  DailyActionMetricsRow,
  UserActionEventRow,
  UserActionMetricsRow,
  UserIdentity,
} from "@/lib/metrics";

type MetricsTab = "leads" | "tickets";
type MetricsViewMode = "actions" | "billing";
type MetricsScope = "general" | "individual";

const AGGREGATE_USER_ID = "__all__";

const aggregateMetrics = (
  rows: UserActionMetricsRow[],
  daily: DailyActionMetricsRow[],
  events: UserActionEventRow[],
) => {
  const actionsBreakdown: Record<string, number> = {};
  let totalActions = 0;
  let uniqueItems = 0;

  rows.forEach((row) => {
    totalActions += row.total_actions ?? 0;
    uniqueItems += row.unique_items ?? 0;
    Object.entries(row.actions_breakdown ?? {}).forEach(([action, count]) => {
      actionsBreakdown[action] = (actionsBreakdown[action] ?? 0) + count;
    });
  });

  const aggregatedRows = rows.length
    ? [
        {
          actor_user_id: AGGREGATE_USER_ID,
          actor_email: "",
          actor_name: "Geral",
          total_actions: totalActions,
          unique_items: uniqueItems,
          actions_breakdown: actionsBreakdown,
        },
      ]
    : [];

  const byDate = new Map<string, number>();
  daily.forEach((row) => {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.total_actions);
  });
  const aggregatedDaily = Array.from(byDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, total]) => ({
      actor_user_id: AGGREGATE_USER_ID,
      date,
      total_actions: total,
    }));

  const aggregatedEvents = events.map((event) => ({
    ...event,
    actor_user_id: AGGREGATE_USER_ID,
  }));

  return {
    rows: aggregatedRows,
    daily: aggregatedDaily,
    events: aggregatedEvents,
  };
};

export default function MetricsClient() {
  const [scope, setScope] = useState<MetricsScope>("general");
  const [activeTab, setActiveTab] = useState<MetricsTab>("leads");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [viewMode, setViewMode] = useState<MetricsViewMode>("actions");
  const [rows, setRows] = useState<UserActionMetricsRow[]>([]);
  const [daily, setDaily] = useState<DailyActionMetricsRow[]>([]);
  const [events, setEvents] = useState<UserActionEventRow[]>([]);
  const [generalLeads, setGeneralLeads] = useState<Lead[]>([]);
  const [generalStatusOptions, setGeneralStatusOptions] = useState<string[]>([]);
  const [generalSelectedStatuses, setGeneralSelectedStatuses] = useState<string[]>(
    () => [...INITIAL_FILTERS.status],
  );
  const [generalLeadsLoading, setGeneralLeadsLoading] = useState(false);
  const [generalLeadsError, setGeneralLeadsError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetailsOpen, setLeadDetailsOpen] = useState(false);
  const [usersByTab, setUsersByTab] = useState<Record<MetricsTab, UserIdentity[]>>({
    leads: [],
    tickets: [],
  });
  const usersByTabRef = useRef(usersByTab);
  const generalLeadsRequestedRef = useRef(false);
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

  const loadGeneralLeads = useCallback(async () => {
    generalLeadsRequestedRef.current = true;
    setGeneralLeadsLoading(true);
    setGeneralLeadsError(null);
    try {
      const pageSize = 100;
      const first = await fetchLeads({ page: 1, pageSize, status: [] });
      const total = first.total ?? first.items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const allItems = [...first.items];

      if (totalPages > 1) {
        const responses = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            fetchLeads({
              page: index + 2,
              pageSize,
              status: [],
            }),
          ),
        );
        responses.forEach((resp) => allItems.push(...resp.items));
      }

      setGeneralLeads(allItems);
      setGeneralStatusOptions(first.statusOptions ?? []);
    } catch (err) {
      console.error(err);
      setGeneralLeadsError("Nao foi possivel carregar os leads gerais.");
    } finally {
      setGeneralLeadsLoading(false);
    }
  }, []);

  useEffect(() => {
    const includeUsers =
      (usersByTabRef.current[activeTab] ?? []).length === 0;
    void loadData(includeUsers);
  }, [activeTab, loadData, timeRange]);

  useEffect(() => {
    if (scope !== "general" || activeTab !== "leads") return;
    if (generalLeadsRequestedRef.current) return;
    void loadGeneralLeads();
  }, [activeTab, loadGeneralLeads, scope]);

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

  const aggregatedMetrics = useMemo(
    () => aggregateMetrics(rows, daily, events),
    [rows, daily, events],
  );

  const renderContent = () => {
    if (scope === "general" && activeTab === "leads" && viewMode === "actions") {
      return (
        <LeadStatusMetricsView
          leads={generalLeads}
          timeRange={timeRange}
          statusOptions={generalStatusOptions}
          selectedStatuses={generalSelectedStatuses}
          onSelectedStatusesChange={(next) => setGeneralSelectedStatuses(next)}
          loading={generalLeadsLoading}
          error={generalLeadsError}
          onRetry={loadGeneralLeads}
          onLeadSelect={(lead) => {
            setSelectedLead(lead);
            setLeadDetailsOpen(true);
          }}
        />
      );
    }

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

    const viewRows = scope === "general" ? aggregatedMetrics.rows : rows;
    const viewDaily = scope === "general" ? aggregatedMetrics.daily : daily;
    const viewEvents = scope === "general" ? aggregatedMetrics.events : events;
    const viewUsers = scope === "general" ? [] : usersByTab[activeTab] ?? [];
    const selectedUserId =
      scope === "general"
        ? AGGREGATE_USER_ID
        : selectedUserByTab[activeTab] ?? null;

    return (
      <UserActionMetricsView
        entity={activeTab}
        rows={viewRows}
        daily={viewDaily}
        events={viewEvents}
        users={viewUsers}
        selectedUserId={selectedUserId}
        range={timeRange}
        viewMode={viewMode}
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
          <Tabs
            tabs={[
              { id: "general", label: "GERAL" },
              { id: "individual", label: "INDIVIDUAL" },
            ]}
            activeTabId={scope}
            onTabChange={(id) => setScope(id as MetricsScope)}
          />
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Sair
            </button>
          </form>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <MetricsTabs activeTabId={activeTab} onChange={setActiveTab} />
          <TimeRangeSelector activeRange={timeRange} onChange={setTimeRange} />
        </div>
        <p className="text-xs text-slate-500">
          Filtrando dados do período selecionado.
        </p>
        {scope === "individual" ? (
          <UserActionMetricsHeader
            rows={rows}
            users={usersByTab[activeTab] ?? []}
            selectedUserId={selectedUserByTab[activeTab] ?? null}
            onSelectedUserIdChange={handleSelectedUserChange}
          />
        ) : null}
        <div className="flex w-full items-center divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {[
            { id: "actions", label: "Acoes" },
            { id: "billing", label: "Faturamento" },
          ].map((tab) => {
            const isActive = tab.id === viewMode;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id as MetricsViewMode)}
                className={`flex-1 px-4 py-2 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80 focus-visible:z-10 first:rounded-l-lg last:rounded-r-lg ${
                  isActive
                    ? "bg-sky-100 text-sky-800"
                    : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
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
