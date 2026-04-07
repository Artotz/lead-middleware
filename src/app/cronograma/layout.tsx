"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { FilterOptionsProvider } from "@/contexts/FilterOptionsContext";
import { ScheduleProvider } from "@/contexts/ScheduleContext";

export default function CronogramaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <ScheduleProvider>
        <FilterOptionsProvider>{children}</FilterOptionsProvider>
      </ScheduleProvider>
    </RequireAuth>
  );
}

