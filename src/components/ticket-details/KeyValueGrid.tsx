"use client";

import React from "react";

export type KeyValueItem = {
  label: string;
  value: React.ReactNode;
};

type KeyValueGridProps = {
  items: KeyValueItem[];
  columns?: 1 | 2;
};

export function KeyValueGrid({ items, columns = 2 }: KeyValueGridProps) {
  const gridClass =
    columns === 1 ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2";

  return (
    <div className={gridClass}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {item.label}
          </div>
          <div className="mt-1 break-words text-sm text-slate-800">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

