"use client";

import React from "react";

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  rightSlot,
}: CollapsibleSectionProps) {
  return (
    <details
      className="group rounded-xl border border-slate-200 bg-white shadow-sm"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          <span className="text-xs text-slate-400 transition group-open:rotate-180">
            ▾
          </span>
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </summary>
      <div className="border-t border-slate-200 px-4 py-3">{children}</div>
    </details>
  );
}

