import type { ReactNode } from "react";

type PaginationControlsProps = {
  summary: ReactNode;
  pageInfo: ReactNode;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  className?: string;
  buttonClassName?: string;
};

export function PaginationControls({
  summary,
  pageInfo,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  className,
  buttonClassName,
}: PaginationControlsProps) {
  const resolvedButtonClassName = buttonClassName ?? "px-3 py-1.5";

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600 ${className ?? ""}`}
    >
      <div>{summary}</div>
      <div className="flex items-center gap-2">
        <span>{pageInfo}</span>
        <button
          type="button"
          onClick={onPrev}
          disabled={prevDisabled}
          aria-label={prevLabel}
          className={`rounded-lg border transition ${resolvedButtonClassName} ${
            prevDisabled
              ? "border-slate-200 text-slate-400"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {prevLabel}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label={nextLabel}
          className={`rounded-lg border transition ${resolvedButtonClassName} ${
            nextDisabled
              ? "border-slate-200 text-slate-400"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
