"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { ScheduleProvider } from "@/contexts/ScheduleContext";

export default function CronogramaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <ScheduleProvider>{children}</ScheduleProvider>
    </RequireAuth>
  );
}

