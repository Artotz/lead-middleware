"use client";

import React from "react";
import { Badge } from "@/components/Badge";

type TicketWatchersProps = {
  watchers: Array<{ name: string; type: string; watchType: string }>;
};

export function TicketWatchers({ watchers }: TicketWatchersProps) {
  if (!watchers.length) {
    return <div className="text-sm text-slate-600">N/A</div>;
  }

  return (
    <div className="space-y-2">
      {watchers.map((w, idx) => (
        <div
          key={`${w.name}::${idx}`}
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {w.name}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge tone="slate">{w.type}</Badge>
              <Badge tone="sky">{w.watchType}</Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

