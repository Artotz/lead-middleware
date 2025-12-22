import "server-only";

import type {
  DailyActionMetricsRow,
  MetricsRange,
  UserActionMetricsRow,
} from "@/lib/metrics";

const DAY_MS = 24 * 60 * 60 * 1000;

export function rangeToStart(range: MetricsRange): Date | null {
  const now = new Date();
  if (range === "all") return null;
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (range === "week") return new Date(now.getTime() - 7 * DAY_MS);
  return new Date(now.getTime() - 30 * DAY_MS);
}

type RawEventRow<ItemId extends string | number> = {
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string | null;
  item_id: ItemId | null;
};

export function aggregateUserMetrics<ItemId extends string | number>(
  rows: RawEventRow<ItemId>[],
): UserActionMetricsRow[] {
  const byUser = new Map<
    string,
    {
      actor_user_id: string;
      actor_email: string;
      actor_name: string;
      total_actions: number;
      uniqueItems: Set<string>;
      actions_breakdown: Record<string, number>;
    }
  >();

  rows.forEach((row) => {
    const actorId = row.actor_user_id?.trim();
    const action = row.action?.trim();
    if (!actorId || !action) return;

    const key = actorId;
    const current = byUser.get(key) ?? {
      actor_user_id: actorId,
      actor_email: row.actor_email?.trim() ?? "",
      actor_name: row.actor_name?.trim() ?? "",
      total_actions: 0,
      uniqueItems: new Set<string>(),
      actions_breakdown: {},
    };

    current.total_actions += 1;
    current.actions_breakdown[action] = (current.actions_breakdown[action] ?? 0) + 1;

    if (row.item_id !== null && row.item_id !== undefined) {
      current.uniqueItems.add(String(row.item_id));
    }

    if (!current.actor_email && row.actor_email) current.actor_email = row.actor_email;
    if (!current.actor_name && row.actor_name) current.actor_name = row.actor_name;

    byUser.set(key, current);
  });

  return Array.from(byUser.values())
    .map((row) => ({
      actor_user_id: row.actor_user_id,
      actor_email: row.actor_email,
      actor_name: row.actor_name,
      total_actions: row.total_actions,
      unique_items: row.uniqueItems.size,
      actions_breakdown: row.actions_breakdown,
    }))
    .sort((a, b) => b.total_actions - a.total_actions);
}

type RawDailyRow = {
  actor_user_id: string | null;
  occurred_at: string | null;
};

export function aggregateDailyMetrics(rows: RawDailyRow[]): DailyActionMetricsRow[] {
  const byDay = new Map<string, Map<string, number>>();

  rows.forEach((row) => {
    const actorId = row.actor_user_id?.trim();
    if (!actorId) return;

    const occurredAt = row.occurred_at;
    if (!occurredAt) return;

    const date = new Date(occurredAt);
    if (Number.isNaN(date.getTime())) return;
    const dayKey = date.toISOString().slice(0, 10);

    const byActor = byDay.get(dayKey) ?? new Map<string, number>();
    byActor.set(actorId, (byActor.get(actorId) ?? 0) + 1);
    byDay.set(dayKey, byActor);
  });

  return Array.from(byDay.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .flatMap(([date, byActor]) =>
      Array.from(byActor.entries())
        .sort(([actorA], [actorB]) => actorA.localeCompare(actorB))
        .map(([actor_user_id, total_actions]) => ({
          actor_user_id,
          date,
          total_actions,
        }))
    );
}
