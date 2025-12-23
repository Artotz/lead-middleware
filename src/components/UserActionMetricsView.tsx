"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ActionEventRow,
  DailyActionMetricsRow,
  UserActionMetricsRow,
  UserIdentity,
} from "@/lib/metrics";
import {
  LEAD_ACTION_DEFINITIONS,
  TICKET_ACTION_DEFINITIONS,
} from "@/lib/events";

type EntityKind = "leads" | "tickets";

type UserActionMetricsViewProps = {
  entity: EntityKind;
  rows: UserActionMetricsRow[];
  daily: DailyActionMetricsRow[];
  users: UserIdentity[];
  events: ActionEventRow[];
  selectedUserId: string | null;
};

type ActionTone =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "slate"
  | "violet"
  | "stone";

const actionTone = (action: string): ActionTone => {
  const normalized = action.toLowerCase();
  if (normalized.includes("register_contact")) return "sky";
  if (normalized.includes("discard")) return "rose";
  if (normalized.includes("close")) return "emerald";
  if (normalized.includes("reopen")) return "amber";
  if (normalized.includes("convert")) return "violet";
  if (normalized.includes("add_tags")) return "violet";
  if (normalized.includes("remove_tags")) return "rose";
  if (normalized.includes("assign")) return "sky";
  if (normalized.includes("qualify")) return "emerald";
  if (normalized.includes("update_field")) return "slate";
  if (normalized.includes("add_note")) return "amber";
  return "stone";
};

const TONE_FILL: Record<ActionTone, string> = {
  sky: "#0EA5E9",
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",
  slate: "#475569",
  violet: "#8B5CF6",
  stone: "#78716C",
};

type ChartDatum = {
  action: string;
  label: string;
  count: number;
  tone: ActionTone;
};

type DailyChartDatum = {
  date: string;
  total: number;
};

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const formatShortDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return shortDateFormatter.format(parsed);
};

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return longDateFormatter.format(parsed);
};

const getUserLabel = (user: UserIdentity) => {
  const name = user.name?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return user.id;
};

const getActorLabel = (event: ActionEventRow) => {
  const name = event.actor_name?.trim();
  if (name) return name;
  const email = event.actor_email?.trim();
  if (email) return email;
  return event.actor_user_id;
};

const buildUserOptions = (
  users: UserIdentity[],
  rows: UserActionMetricsRow[]
) => {
  const map = new Map<string, UserIdentity>();
  users.forEach((user) => map.set(user.id, user));
  rows.forEach((row) => {
    const existing = map.get(row.actor_user_id);
    map.set(row.actor_user_id, {
      id: row.actor_user_id,
      name: row.actor_name || existing?.name,
      email: row.actor_email || existing?.email,
    });
  });
  return Array.from(map.values());
};

const getSelectedUser = (
  userOptions: UserIdentity[],
  selectedUserId: string | null
) => {
  if (!userOptions.length) return null;
  if (!selectedUserId) return userOptions[0];
  return (
    userOptions.find((user) => user.id === selectedUserId) ?? userOptions[0]
  );
};

type UserActionMetricsHeaderProps = {
  rows: UserActionMetricsRow[];
  users: UserIdentity[];
  selectedUserId: string | null;
  onSelectedUserIdChange: (id: string | null) => void;
};

export function UserActionMetricsHeader({
  rows,
  users,
  selectedUserId,
  onSelectedUserIdChange,
}: UserActionMetricsHeaderProps) {
  const userOptions = useMemo(
    () => buildUserOptions(users, rows),
    [rows, users]
  );
  const selectedUser = useMemo(
    () => getSelectedUser(userOptions, selectedUserId),
    [selectedUserId, userOptions]
  );

  useEffect(() => {
    if (!userOptions.length) {
      if (selectedUserId !== null) {
        onSelectedUserIdChange(null);
      }
      return;
    }

    if (
      selectedUserId &&
      userOptions.some((user) => user.id === selectedUserId)
    ) {
      return;
    }

    onSelectedUserIdChange(userOptions[0].id);
  }, [onSelectedUserIdChange, selectedUserId, userOptions]);

  const selectedRow = selectedUser
    ? rows.find((row) => row.actor_user_id === selectedUser.id) ?? null
    : null;

  const selectedDisplayName =
    selectedRow?.actor_name ||
    selectedRow?.actor_email ||
    (selectedUser ? getUserLabel(selectedUser) : "Nenhum usuario");
  const selectedEmail = selectedRow?.actor_email || selectedUser?.email || "";
  const periodMessage =
    rows.length === 0
      ? "Nenhuma acao registrada nesse periodo."
      : !selectedRow
      ? "Nenhuma acao registrada para esse usuario no periodo."
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Usuario
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-slate-900">
            {selectedDisplayName}
          </div>
          {selectedEmail ? (
            <div className="truncate text-xs text-slate-500">
              {selectedEmail}
            </div>
          ) : null}
          {/* {periodMessage ? (
            <div className="mt-2 text-xs text-slate-500">{periodMessage}</div>
          ) : null} */}
        </div>

        <label className="flex w-full flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 md:w-64">
          <span>Selecionar pessoa</span>
          <select
            value={selectedUser?.id ?? ""}
            onChange={(event) => onSelectedUserIdChange(event.target.value)}
            disabled={!userOptions.length}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {userOptions.length ? (
              userOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {getUserLabel(option)}
                </option>
              ))
            ) : (
              <option value="">Nenhum usuario</option>
            )}
          </select>
        </label>
      </div>
    </div>
  );
}

function ActionsTooltip({
  active,
  payload,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const datum = (payload[0] as { payload?: ChartDatum }).payload;
  if (!datum) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-semibold text-slate-900">{datum.label}</div>
      <div className="mt-1 text-slate-600">
        {datum.count} {datum.count === 1 ? "acao" : "acoes"}
      </div>
    </div>
  );
}

function DailyActionsTooltip({
  active,
  payload,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const datum = (payload[0] as { payload?: DailyChartDatum }).payload;
  if (!datum) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-semibold text-slate-900">
        {formatShortDate(datum.date)}
      </div>
      <div className="mt-1 text-slate-600">
        {datum.total} {datum.total === 1 ? "acao" : "acoes"}
      </div>
    </div>
  );
}

export function UserActionMetricsView({
  entity,
  rows,
  daily,
  users,
  events,
  selectedUserId,
}: UserActionMetricsViewProps) {
  const definitions =
    entity === "leads" ? LEAD_ACTION_DEFINITIONS : TICKET_ACTION_DEFINITIONS;

  const labelByAction = useMemo(() => {
    const map = new Map<string, string>();
    definitions.forEach((def) => map.set(def.id, def.label));
    return map;
  }, [definitions]);

  const [actionFilter, setActionFilter] = useState<string>("all");

  const userOptions = useMemo(
    () => buildUserOptions(users, rows),
    [rows, users]
  );
  const selectedUser = useMemo(
    () => getSelectedUser(userOptions, selectedUserId),
    [selectedUserId, userOptions]
  );

  const eventsForUser = useMemo(() => {
    if (!selectedUser) return [];
    return events.filter((event) => event.actor_user_id === selectedUser.id);
  }, [events, selectedUser?.id]);

  const actionFilterOptions = useMemo(() => {
    const unique = new Set<string>();
    eventsForUser.forEach((event) => {
      if (event.action) unique.add(event.action);
    });
    return Array.from(unique).sort((a, b) =>
      (labelByAction.get(a) ?? a).localeCompare(labelByAction.get(b) ?? b),
    );
  }, [eventsForUser, labelByAction]);

  useEffect(() => {
    if (actionFilter === "all") return;
    if (!actionFilterOptions.includes(actionFilter)) {
      setActionFilter("all");
    }
  }, [actionFilter, actionFilterOptions]);

  const selectedRow = selectedUser
    ? rows.find((row) => row.actor_user_id === selectedUser.id) ?? null
    : null;

  const totalActions = selectedRow?.total_actions ?? 0;
  const uniqueItems = selectedRow?.unique_items ?? 0;
  const dailyEmptyMessage = selectedUser
    ? "Sem dados diarios para esse usuario no periodo."
    : "Sem dados diarios para esse periodo.";
  const distributionEmptyMessage = selectedUser
    ? "Nenhuma acao registrada para esse usuario no periodo."
    : "Nenhuma acao registrada nesse periodo.";
  const eventsEmptyMessage =
    actionFilter === "all"
      ? "Nenhuma acao registrada nesse periodo."
      : "Nenhuma acao encontrada para esse filtro.";
  const itemLabel = entity === "tickets" ? "Ticket" : "Lead";

  const actionEntries = useMemo(() => {
    const breakdown = selectedRow?.actions_breakdown ?? {};
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  }, [selectedRow]);

  const chartData: ChartDatum[] = useMemo(() => {
    const topEntries = actionEntries.slice(0, 10);
    const remainingCount = actionEntries
      .slice(10)
      .reduce((acc, [, count]) => acc + count, 0);

    return [
      ...topEntries.map(([action, count]) => ({
        action,
        label: labelByAction.get(action) ?? action,
        count,
        tone: actionTone(action),
      })),
      ...(remainingCount > 0
        ? [
            {
              action: "__other__",
              label: "Outras acoes",
              count: remainingCount,
              tone: "slate" as const,
            },
          ]
        : []),
    ];
  }, [actionEntries, labelByAction]);

  const distributionChartHeight = "h-[260px]";

  const dailySeries: DailyChartDatum[] = useMemo(() => {
    if (!selectedUser) return [];
    const byDate = new Map<string, number>();
    daily
      .filter((row) => row.actor_user_id === selectedUser.id)
      .forEach((row) => {
        byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.total_actions);
      });

    return Array.from(byDate.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, total]) => ({ date, total }));
  }, [daily, selectedUser?.id]);

  const filteredEvents = useMemo(() => {
    if (actionFilter === "all") return eventsForUser;
    return eventsForUser.filter((event) => event.action === actionFilter);
  }, [actionFilter, eventsForUser]);

  const orderedEvents = useMemo(
    () =>
      [...filteredEvents].sort((a, b) =>
        b.occurred_at.localeCompare(a.occurred_at),
      ),
    [filteredEvents],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
        {/* <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total de acoes
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {totalActions}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Itens unicos
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {uniqueItems}
            </div>
          </div>
        </div> */}
      </div>

      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Acoes por dia
        </div>
        {dailySeries.length > 0 ? (
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailySeries}
                margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  tickFormatter={(value) => formatShortDate(String(value))}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748B" }}
                />
                <Tooltip
                  cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }}
                  content={<DailyActionsTooltip />}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">{dailyEmptyMessage}</div>
        )}
      </div>

      <div className="px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Distribuicao de acoes
        </div>

        {chartData.length > 0 ? (
          <div className={`mt-3 w-full ${distributionChartHeight}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ActionsTooltip />} />
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius="45%"
                  outerRadius="80%"
                  strokeWidth={1}
                  paddingAngle={2}
                >
                  {chartData.map((item) => (
                    <Cell key={item.action} fill={TONE_FILL[item.tone]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">
            {distributionEmptyMessage}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lista de acoes do periodo
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Filtrar acao</span>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="all">Todas</option>
              {actionFilterOptions.map((actionId) => (
                <option key={actionId} value={actionId}>
                  {labelByAction.get(actionId) ?? actionId}
                </option>
              ))}
            </select>
          </label>
        </div>
        {orderedEvents.length > 0 ? (
          <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {orderedEvents.map((event) => (
              <div
                key={`${event.occurred_at}-${event.actor_user_id}-${event.action}-${event.item_id}`}
                className="flex flex-col gap-1 px-3 py-2 text-sm text-slate-700"
              >
                <div className="text-xs text-slate-500">
                  {formatDateTime(event.occurred_at)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">
                    {getActorLabel(event)}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-semibold text-slate-900">
                    {labelByAction.get(event.action) ?? event.action}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">
                    {itemLabel} {event.item_id}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{event.action}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">
            {eventsEmptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
