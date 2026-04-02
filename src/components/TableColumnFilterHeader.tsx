"use client";

import { LeadTypesMultiSelect } from "@/components/LeadTypesMultiSelect";

type Option = {
  value: string;
  label: string;
};

type SortOption = {
  value: string;
  label: string;
};

type TableColumnFilterHeaderProps = {
  label: string;
  filterValue?: string[];
  filterOptions?: Option[];
  onFilterChange?: (next: string[]) => void;
  filterPlaceholder?: string;
  filterAllLabel?: string;
  filterSearchPlaceholder?: string;
  filterNoResultsText?: string;
  selectedCountTemplate?: string;
  selectAllLabel?: string;
  clearAllLabel?: string;
  sortValue?: string;
  sortOptions?: SortOption[];
  onSortChange?: (next: string) => void;
  sortAriaLabel?: string;
  disableSortReset?: boolean;
  defaultSortValue?: string;
};

const getNextSortValue = (
  current: string | undefined,
  options: SortOption[],
  disableSortReset = false,
  defaultSortValue?: string,
) => {
  if (!options.length) return current ?? "";
  const index = options.findIndex((option) => option.value === current);
  if (index < 0) return defaultSortValue ?? options[0]!.value;
  if (disableSortReset && index === options.length - 1) {
    return options[0]!.value;
  }
  return options[(index + 1) % options.length]!.value;
};

const getSortIcon = (value: string | undefined) => {
  if (!value || value === "__none__") return "none";
  if (value.endsWith("_asc") || value === "name") return "asc";
  if (value.endsWith("_desc")) return "desc";
  return "none";
};

export function TableColumnFilterHeader({
  label,
  filterValue = [],
  filterOptions = [],
  onFilterChange,
  filterPlaceholder,
  filterAllLabel,
  filterSearchPlaceholder,
  filterNoResultsText,
  selectedCountTemplate,
  selectAllLabel,
  clearAllLabel,
  sortValue,
  sortOptions = [],
  onSortChange,
  sortAriaLabel,
  disableSortReset = false,
  defaultSortValue,
}: TableColumnFilterHeaderProps) {
  const hasSort = Boolean(onSortChange && sortOptions.length);
  const hasFilter = Boolean(onFilterChange && filterOptions.length);
  const currentSortLabel =
    sortOptions.find((option) => option.value === sortValue)?.label ?? label;
  const sortIcon = getSortIcon(sortValue);

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          {label}
        </div>
        {hasSort ? (
          <button
            type="button"
            onClick={() =>
              onSortChange?.(
                getNextSortValue(
                  sortValue,
                  sortOptions,
                  disableSortReset,
                  defaultSortValue,
                ),
              )
            }
            aria-label={`${sortAriaLabel ?? label}: ${currentSortLabel}`}
            title={currentSortLabel}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-slate-50 text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {sortIcon === "none" ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
              >
                <path
                  d="M5 6l3-3 3 3M11 10l-3 3-3-3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : sortIcon === "asc" ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
              >
                <path
                  d="M5 7l3-3 3 3"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 4v8"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
              >
                <path
                  d="M11 9l-3 3-3-3"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 4v8"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        ) : null}
      </div>
      <div className="mt-2 min-w-0">
        {hasFilter ? (
          <LeadTypesMultiSelect
            value={filterValue}
            options={filterOptions}
            onChange={onFilterChange!}
            placeholder={filterPlaceholder}
            allSelectedLabel={filterAllLabel}
            searchPlaceholder={filterSearchPlaceholder}
            noResultsText={filterNoResultsText}
            selectedCountTemplate={selectedCountTemplate}
            selectAllLabel={selectAllLabel}
            clearAllLabel={clearAllLabel}
          />
        ) : null}
      </div>
    </div>
  );
}
