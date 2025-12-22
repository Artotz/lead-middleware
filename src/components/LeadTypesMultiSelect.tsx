"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

type LeadTypesMultiSelectProps = {
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

const buildSummary = (value: string[], placeholder?: string) => {
  if (!value.length) return placeholder ?? "Selecionar tipos";
  if (value.length === 1) return value[0];
  if (value.length === 2) return `${value[0]}, ${value[1]}`;
  return `${value.length} selecionados`;
};

export function LeadTypesMultiSelect({
  value,
  options,
  onChange,
  placeholder,
}: LeadTypesMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const summary = useMemo(
    () => buildSummary(value, placeholder),
    [value, placeholder],
  );

  const toggleOption = useCallback(
    (option: string) => {
      const selected = new Set(value);
      if (selected.has(option)) {
        selected.delete(option);
      } else {
        selected.add(option);
      }
      onChange(Array.from(selected));
    },
    [onChange, value],
  );

  const focusOption = (index: number) => {
    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        "button[data-option]",
      ) ?? [];
    if (!buttons.length) return;
    const clamped = Math.max(0, Math.min(index, buttons.length - 1));
    buttons[clamped]?.focus();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(0);
    }
  };

  const handleOptionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        "button[data-option]",
      ) ?? [];
    const currentIndex = Array.from(buttons).indexOf(
      event.currentTarget,
    );

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(currentIndex + 1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(currentIndex - 1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      focusOption(buttons.length - 1);
    }
  };

  return (
    <div ref={wrapperRef} className="relative z-20">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      >
        <span
          className={`truncate ${
            value.length ? "text-slate-900" : "text-slate-400"
          }`}
        >
          {summary}
        </span>
        <span className="text-slate-400">v</span>
      </button>

      {open ? (
        <div
          className="absolute left-0 bottom-full z-50 mb-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          role="listbox"
          aria-multiselectable="true"
          id={listId}
        >
          <div className="border-b border-slate-200 px-2 py-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Buscar tipo..."
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div
            ref={listRef}
            className="max-h-[240px] overflow-y-auto p-1"
          >
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const selected = value.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-option
                    onClick={() => toggleOption(option)}
                    onKeyDown={handleOptionKeyDown}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-slate-700 transition hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                        selected
                          ? "border-sky-400 bg-sky-50 text-sky-700"
                          : "border-slate-300 text-transparent"
                      }`}
                      aria-hidden="true"
                    >
                      x
                    </span>
                    <span className="truncate">{option}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-slate-500">
                Nenhum resultado
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
