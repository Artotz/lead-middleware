"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = { id: string; label: string };

type OpportunitiesModalProps = {
  open: boolean;
  options: Option[];
  initialSelected?: string[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (selected: string[]) => void;
};

export function OpportunitiesModal({
  open,
  options,
  initialSelected = [],
  loading = false,
  onClose,
  onConfirm,
}: OpportunitiesModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(initialSelected);
    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, initialSelected]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const toggleOption = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const canConfirm = useMemo(() => !loading, [loading]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar oportunidades"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Oportunidades percebidas
            </h2>
            <p className="text-xs text-slate-500">
              Selecione as oportunidades antes do checkout.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Fechar
          </button>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2">
          {options.map((option) => {
            const active = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleOption(option.id)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`h-3 w-3 rounded-full border ${
                    active
                      ? "border-emerald-400 bg-emerald-500"
                      : "border-slate-300 bg-white"
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={!canConfirm}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

