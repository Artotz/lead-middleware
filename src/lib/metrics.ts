import type { TimeRange } from "@/lib/domain";

export type MetricsRange = TimeRange;

export type UserIdentity = {
  id: string;
  name?: string;
  email?: string;
};

export type UserActionMetricsRow = {
  actor_user_id: string;
  actor_email: string;
  actor_name: string;
  total_actions: number;
  unique_items: number;
  actions_breakdown: Record<string, number>;
};

export type UserActionEventRow = {
  actor_user_id: string;
  action: string;
  item_id: string;
  occurred_at: string;
};

export type DailyActionMetricsRow = {
  actor_user_id: string;
  date: string;
  total_actions: number;
};

export const isMetricsRange = (value: string): value is MetricsRange =>
  value === "today" || value === "week" || value === "month" || value === "year";

const getUtcStartOfDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const getMetricsRangeStart = (
  range: MetricsRange,
  now: Date = new Date(),
): Date => {
  const start = getUtcStartOfDay(now);
  if (range === "today") return start;
  if (range === "week") {
    start.setUTCDate(start.getUTCDate() - 6);
    return start;
  }
  if (range === "month") {
    start.setUTCDate(start.getUTCDate() - 29);
    return start;
  }
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
};

export const getMetricsRangeEnd = (now: Date = new Date()): Date =>
  getUtcStartOfDay(now);

export const listMetricsRangeDays = (
  range: MetricsRange,
  now: Date = new Date(),
): string[] => {
  const start = getMetricsRangeStart(range, now);
  const end = getMetricsRangeEnd(now);
  const days: string[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(cursor.toISOString().slice(0, 10));
  }

  return days;
};
