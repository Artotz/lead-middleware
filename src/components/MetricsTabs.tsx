"use client";

import { Tabs } from "./Tabs";

type MetricsTabId = "leads" | "tickets";

type MetricsTabsProps = {
  activeTabId: MetricsTabId;
  onChange: (tab: MetricsTabId) => void;
};

export function MetricsTabs({ activeTabId, onChange }: MetricsTabsProps) {
  return (
    <Tabs
      tabs={[
        { id: "leads", label: "LEADS" },
        { id: "tickets", label: "TICKETS" },
      ]}
      activeTabId={activeTabId}
      onTabChange={(id) => onChange(id as MetricsTabId)}
    />
  );
}
