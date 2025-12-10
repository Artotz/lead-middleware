"use client";

import { Lead, TimeRange } from "@/lib/domain";
import { MetricCard } from "./MetricCard";

type LeadsMetricsViewProps = {
  leads: Lead[];
  timeRange: TimeRange;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const isWithinRange = (dateStr: string, range: TimeRange) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 0) {
    return false;
  }

  switch (range) {
    case "today":
      return date.toDateString() === now.toDateString();
    case "week":
      return diff <= 7 * DAY_MS;
    case "month":
      return diff <= 30 * DAY_MS;
    default:
      return false;
  }
};

export function LeadsMetricsView({ leads, timeRange }: LeadsMetricsViewProps) {
  const leadsInRange = leads.filter((lead) =>
    isWithinRange(lead.importedAt, timeRange),
  );

  const leadsWithTipo = leadsInRange.filter(
    (lead) => lead.tipoLead && lead.tipoLead !== "indefinido",
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard label="Leads adicionados" value={leadsInRange.length} />
      <MetricCard
        label="Leads com tipo identificado"
        value={leadsWithTipo.length}
        subtitle="Possuem tipo marcado"
      />
    </div>
  );
}
