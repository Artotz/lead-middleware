"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyActionMetricsRow, UserActionMetricsRow } from "@/lib/metrics";
import { LEAD_ACTION_DEFINITIONS, TICKET_ACTION_DEFINITIONS } from "@/lib/events";

type EntityKind = "leads" | "tickets";

type UserActionMetricsViewProps = {
  entity: EntityKind;
  rows: UserActionMetricsRow[];
  daily: DailyActionMetricsRow[];
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

const truncateLabel = (value: string, maxChars = 28) => {
  if (value.length <= maxChars) return value;
  const sliceLen = Math.max(0, maxChars - 3);
  return `${value.slice(0, sliceLen)}...`;
};

type DailyChartDatum = {
  date: string;
  total: number;
};

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const formatShortDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return shortDateFormatter.format(parsed);
};

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
      <div className="font-semibold text-slate-900">{formatShortDate(datum.date)}</div>
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
}: UserActionMetricsViewProps) {
  const definitions = entity === "leads" ? LEAD_ACTION_DEFINITIONS : TICKET_ACTION_DEFINITIONS;

  const labelByAction = useMemo(() => {
    const map = new Map<string, string>();
    definitions.forEach((def) => map.set(def.id, def.label));
    return map;
  }, [definitions]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!rows.length) {
      setSelectedUserId(null);
      return;
    }

    if (selectedUserId && rows.some((row) => row.actor_user_id === selectedUserId)) {
      return;
    }

    setSelectedUserId(rows[0].actor_user_id);
  }, [rows, selectedUserId]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Nenhuma acao registrada nesse periodo.
      </div>
    );
  }

  const selectedRow =
    rows.find((row) => row.actor_user_id === selectedUserId) ?? rows[0];

  const userOptions = rows.map((row) => ({
    id: row.actor_user_id,
    label: row.actor_name || row.actor_email || row.actor_user_id,
  }));

  const chartData: ChartDatum[] = (() => {
    const entries = Object.entries(selectedRow.actions_breakdown).sort(
      (a, b) => b[1] - a[1],
    );
    const topEntries = entries.slice(0, 10);
    const remainingCount = entries.slice(10).reduce(
      (acc, [, count]) => acc + count,
      0,
    );

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
  })();

  const chartHeightClass =
    chartData.length > 9
      ? "h-[360px]"
      : chartData.length > 6
        ? "h-[280px]"
        : "h-[200px]";

  const dailySeries: DailyChartDatum[] = useMemo(() => {
    const byDate = new Map<string, number>();
    daily
      .filter((row) => row.actor_user_id === selectedRow.actor_user_id)
      .forEach((row) => {
        byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.total_actions);
      });

    return Array.from(byDate.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, total]) => ({ date, total }));
  }, [daily, selectedRow.actor_user_id]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Usuario
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900">
              {selectedRow.actor_name || selectedRow.actor_email || selectedRow.actor_user_id}
            </div>
            {selectedRow.actor_email ? (
              <div className="truncate text-xs text-slate-500">
                {selectedRow.actor_email}
              </div>
            ) : null}
          </div>

          <label className="flex w-full flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 md:w-64">
            <span>Selecionar pessoa</span>
            <select
              value={selectedRow.actor_user_id}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {userOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total de acoes
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {selectedRow.total_actions}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Itens unicos
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {selectedRow.unique_items}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Acoes por dia
        </div>
        {dailySeries.length > 0 ? (
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  tickFormatter={(value) => formatShortDate(String(value))}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} />
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
          <div className="mt-3 text-sm text-slate-500">
            Sem dados diarios para esse usuario.
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Distribuicao de acoes
        </div>

        {chartData.length > 0 ? (
          <div className={`mt-3 w-full ${chartHeightClass}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 8, right: 24, bottom: 8, left: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748B" }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={170}
                  tick={{ fontSize: 12, fill: "#334155" }}
                  tickFormatter={(value) => truncateLabel(String(value))}
                />
                <Tooltip
                  cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                  content={<ActionsTooltip />}
                />
                <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                  {chartData.map((item) => (
                    <Cell key={item.action} fill={TONE_FILL[item.tone]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">
            Nenhuma acao registrada para esse usuario.
          </div>
        )}
      </div>
    </div>
  );
}
