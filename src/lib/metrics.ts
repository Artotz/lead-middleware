export type MetricsRange = "today" | "week" | "month" | "all";

export type UserActionMetricsRow = {
  actor_user_id: string;
  actor_email: string;
  actor_name: string;
  total_actions: number;
  unique_items: number;
  actions_breakdown: Record<string, number>;
};

export type DailyActionMetricsRow = {
  actor_user_id: string;
  date: string;
  total_actions: number;
};

export const isMetricsRange = (value: string): value is MetricsRange =>
  value === "today" || value === "week" || value === "month" || value === "all";
