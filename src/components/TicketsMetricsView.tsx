"use client";

import { Ticket, TimeRange } from "@/lib/domain";
import { MetricCard } from "./MetricCard";

type TicketsMetricsViewProps = {
  tickets: Ticket[];
  timeRange: TimeRange;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const isWithinRange = (dateStr: string | null, range: TimeRange) => {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (Number.isNaN(diff) || diff < 0) {
    return false;
  }

  switch (range) {
    case "today":
      return date.toDateString() === now.toDateString();
    case "week":
      return diff <= 7 * DAY_MS;
    case "month":
      return diff <= 30 * DAY_MS;
    case "year":
      return date.getFullYear() === now.getFullYear();
    default:
      return false;
  }
};

export function TicketsMetricsView({
  tickets,
  timeRange,
}: TicketsMetricsViewProps) {
  const ticketsInRange = tickets.filter((ticket) =>
    isWithinRange(ticket.createdAt ?? ticket.updatedAt, timeRange),
  );
  const openTickets = ticketsInRange.filter(
    (ticket) => ticket.status === "aberto",
  );
  const closedTickets = ticketsInRange.filter(
    (ticket) => ticket.status === "fechado",
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard label="Tickets adicionados" value={ticketsInRange.length} />
      <MetricCard label="Tickets abertos" value={openTickets.length} />
      <MetricCard label="Tickets fechados" value={closedTickets.length} />
    </div>
  );
}
