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
  { id: "all", label: "Tudo" },
];

export function TimeRangeSelector({
  activeRange,
  onChange,
}: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {ranges.map((range) => {
        const isActive = range.id === activeRange;
        return (
          <button
            key={range.id}
            type="button"
            onClick={() => onChange(range.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300/80 ${
              isActive
                ? "border-sky-400 bg-sky-100 text-sky-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
