"use client";

import React from "react";
import { Badge } from "@/components/Badge";

type TicketHeaderProps = {
  number: string;
  title: string;
  status: string;
  priority: string;
  url: string | null;
  onClose: () => void;
};

const statusTone = (status: string): Parameters<typeof Badge>[0]["tone"] => {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("open") || normalized.includes("abert")) return "amber";
  if (normalized.includes("close") || normalized.includes("fech")) return "emerald";
  if (normalized.includes("cancel")) return "rose";
  return "slate";
};

const priorityTone = (priority: string): Parameters<typeof Badge>[0]["tone"] => {
  const normalized = priority.trim().toLowerCase();
  if (normalized.includes("high") || normalized.includes("alta") || normalized.includes("urgent")) return "rose";
  if (normalized.includes("medium") || normalized.includes("média") || normalized.includes("media")) return "amber";
  if (normalized.includes("low") || normalized.includes("baixa")) return "slate";
  return "violet";
};

export function TicketHeader({
  number,
  title,
  status,
  priority,
  url,
  onClose,
}: TicketHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="slate">#{number}</Badge>
            <Badge tone={statusTone(status)}>{status}</Badge>
            <Badge tone={priorityTone(priority)}>Prioridade: {priority}</Badge>
          </div>
          <h2 className="mt-2 line-clamp-2 text-base font-semibold text-slate-900">
            {title}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Abrir no ExpertConnect
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

