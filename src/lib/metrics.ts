export type MetricsRange = "today" | "week" | "month";

export type UserActionMetricsRow = {
  actor_user_id: string;
  actor_email: string;
  actor_name: string;
  total_actions: number;
  unique_items: number;
  actions_breakdown: Record<string, number>;
};

export const isMetricsRange = (value: string): value is MetricsRange =>
  value === "today" || value === "week" || value === "month";

