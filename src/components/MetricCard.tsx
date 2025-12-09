"use client";

type MetricCardProps = {
  label: string;
  value: number;
  subtitle?: string;
};

export function MetricCard({ label, value, subtitle }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        {subtitle && (
          <span className="text-xs text-slate-500">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
