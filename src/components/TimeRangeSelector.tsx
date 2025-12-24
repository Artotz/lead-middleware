"use client";

import { TimeRange } from "@/lib/domain";

type TimeRangeSelectorProps = {
  activeRange: TimeRange;
  onChange: (range: TimeRange) => void;
};

const ranges: { id: TimeRange; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Essa semana" },
  { id: "month", label: "Esse mês" },
  { id: "year", label: "Ano" },
];

export function TimeRangeSelector({
  activeRange,
  onChange,
}: TimeRangeSelectorProps) {
  return (
    <div className="inline-flex items-center divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {ranges.map((range) => {
        const isActive = range.id === activeRange;
        return (
          <button
            key={range.id}
            type="button"
            onClick={() => onChange(range.id)}
            className={`px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80 focus-visible:z-10 first:rounded-l-lg last:rounded-r-lg ${
              isActive
                ? "bg-sky-100 text-sky-800"
                : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
