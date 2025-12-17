"use client";

import React from "react";
import { Badge } from "@/components/Badge";

type TicketMachineListProps = {
  machines: Array<{
    serialNumber: string;
    productNote: string;
    details: Array<{ date: string; machineHours: string }>;
  }>;
};

export function TicketMachineList({ machines }: TicketMachineListProps) {
  if (!machines.length) {
    return <div className="text-sm text-slate-600">N/A</div>;
  }

  return (
    <div className="space-y-3">
      {machines.map((machine, index) => (
        <div
          key={`${machine.serialNumber}::${index}`}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="emerald">{machine.serialNumber}</Badge>
            <span className="text-sm font-semibold text-slate-800">
              {machine.productNote}
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <span>Data</span>
              <span>Machine hours</span>
            </div>
            <div className="divide-y divide-slate-200">
              {machine.details.length ? (
                machine.details.map((d, i) => (
                  <div
                    key={`${machine.serialNumber}::${i}`}
                    className="grid grid-cols-2 gap-3 px-3 py-2 text-sm text-slate-700"
                  >
                    <span className="truncate">{d.date}</span>
                    <span className="truncate">{d.machineHours}</span>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-slate-600">N/A</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

