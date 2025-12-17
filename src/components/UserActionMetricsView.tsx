"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import type { UserActionMetricsRow } from "@/lib/metrics";
import { LEAD_ACTION_DEFINITIONS, TICKET_ACTION_DEFINITIONS } from "@/lib/events";

type EntityKind = "leads" | "tickets";

type UserActionMetricsViewProps = {
  entity: EntityKind;
  rows: UserActionMetricsRow[];
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

export function UserActionMetricsView({ entity, rows }: UserActionMetricsViewProps) {
  const definitions = entity === "leads" ? LEAD_ACTION_DEFINITIONS : TICKET_ACTION_DEFINITIONS;

  const labelByAction = useMemo(() => {
    const map = new Map<string, string>();
    definitions.forEach((def) => map.set(def.id, def.label));
    return map;
  }, [definitions]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Nenhuma acao registrada nesse periodo.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <span>Usuario</span>
        <span>Total</span>
        <span>Itens</span>
      </div>

      <div className="divide-y divide-slate-200">
        {rows.map((row) => {
          const entries = Object.entries(row.actions_breakdown).sort((a, b) => b[1] - a[1]);
          const topEntries = entries.slice(0, 10);
          const remainingCount = entries.slice(10).reduce((acc, [, count]) => acc + count, 0);

          const chartData: ChartDatum[] = [
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
          const chartHeight = Math.min(360, Math.max(160, chartData.length * 28 + 40));

          return (
            <div key={row.actor_user_id} className="px-5 py-4">
              <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr] items-start gap-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {row.actor_name || row.actor_email || row.actor_user_id}
                  </div>
                  {row.actor_email && (
                    <div className="truncate text-xs text-slate-500">
                      {row.actor_email}
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-900">{row.total_actions}</div>
                <div className="text-sm font-semibold text-slate-900">{row.unique_items}</div>
              </div>

              {chartData.length > 0 && (
                <div className="mt-4 w-full" style={{ height: chartHeight }}>
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
