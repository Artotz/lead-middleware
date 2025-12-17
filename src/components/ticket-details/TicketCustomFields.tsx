"use client";

import React from "react";

type TicketCustomFieldsProps = {
  fields: Array<{ name: string; value: string }>;
};

export function TicketCustomFields({ fields }: TicketCustomFieldsProps) {
  if (!fields.length) {
    return <div className="text-sm text-slate-600">N/A</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        <span>Campo</span>
        <span>Valor</span>
      </div>
      <div className="divide-y divide-slate-200">
        {fields.map((f, idx) => (
          <div
            key={`${f.name}::${idx}`}
            className="grid grid-cols-2 gap-3 px-4 py-3 text-sm text-slate-700"
          >
            <span className="font-semibold text-slate-800">{f.name}</span>
            <span className="break-words">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

