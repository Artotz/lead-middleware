"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ExpertConnectTicketDetails,
  fetchTicketDetails,
} from "@/lib/ticketDetails";
import { buildTicketDetailsViewModel } from "@/lib/ticketDetailsViewModel";
import { CollapsibleSection } from "@/components/ticket-details/CollapsibleSection";
import { TicketHeader } from "@/components/ticket-details/TicketHeader";
import { TicketContactCard } from "@/components/ticket-details/TicketContactCard";
import { TicketAdvisorCard } from "@/components/ticket-details/TicketAdvisorCard";
import { TicketMetaInfo } from "@/components/ticket-details/TicketMetaInfo";
import { TicketTags } from "@/components/ticket-details/TicketTags";
import { TicketMachineList } from "@/components/ticket-details/TicketMachineList";
import { TicketDescription } from "@/components/ticket-details/TicketDescription";
import { TicketWatchers } from "@/components/ticket-details/TicketWatchers";
import { TicketCustomFields } from "@/components/ticket-details/TicketCustomFields";

type TicketDetailsAsideProps = {
  ticketId: string;
  open: boolean;
  onClose: () => void;
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ExpertConnectTicketDetails }
  | { status: "error"; message: string };

function TicketDetailsSkeleton() {
  return (
    <div className="space-y-3 px-5 py-4">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TicketDetailsAside({
  ticketId,
  open,
  onClose,
}: TicketDetailsAsideProps) {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [reloadNonce, setReloadNonce] = useState(0);
  const lastTicketIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) return;
    lastTicketIdRef.current = null;
    setState({ status: "idle" });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmedId = ticketId.trim();
    if (!trimmedId) {
      setState({ status: "error", message: "ticketId inválido" });
      return;
    }

    if (lastTicketIdRef.current !== trimmedId) {
      lastTicketIdRef.current = trimmedId;
      setState({ status: "loading" });
    }

    const controller = new AbortController();
    const load = async () => {
      try {
        const data = await fetchTicketDetails(trimmedId, {
          signal: controller.signal,
        });
        setState({ status: "success", data });
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        const message =
          (err as any)?.error?.message ??
          (err as any)?.message ??
          "Falha ao carregar detalhes do ticket";
        setState({ status: "error", message: String(message) });
      }
    };

    void load();
    return () => controller.abort();
  }, [open, ticketId, reloadNonce]);

  const viewModel = useMemo(() => {
    if (state.status !== "success") return null;
    return buildTicketDetailsViewModel(state.data);
  }, [state]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes do ticket"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-[640px] flex-col border-l border-slate-200 bg-slate-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {viewModel ? (
          <TicketHeader
            number={viewModel.header.number}
            title={viewModel.header.title}
            status={viewModel.header.status}
            priority={viewModel.header.priority}
            url={viewModel.header.url}
            onClose={onClose}
          />
        ) : (
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
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
        )}

        <div className="flex-1 overflow-y-auto">
          {state.status === "loading" || state.status === "idle" ? (
            <TicketDetailsSkeleton />
          ) : null}

          {state.status === "error" ? (
            <div className="px-5 py-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-sm">
                <div className="font-semibold">Erro ao carregar ticket</div>
                <div className="mt-1">{state.message}</div>
                <button
                  type="button"
                  onClick={() => {
                    setState({ status: "loading" });
                    setReloadNonce((n) => n + 1);
                  }}
                  className="mt-3 inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : null}

          {state.status === "success" && viewModel ? (
            <div className="space-y-3 px-5 py-4">
              <CollapsibleSection title="Contato" defaultOpen>
                <TicketContactCard contact={viewModel.contact} />
              </CollapsibleSection>

              <CollapsibleSection title="Consultor / Equipe" defaultOpen>
                <TicketAdvisorCard advisor={viewModel.advisor} />
              </CollapsibleSection>

              <CollapsibleSection title="Detalhes do ticket" defaultOpen>
                <TicketMetaInfo meta={viewModel.meta} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Tags"
                defaultOpen
                rightSlot={
                  viewModel.tags.length ? (
                    <span className="text-xs font-semibold text-slate-500">
                      {viewModel.tags.length}
                    </span>
                  ) : null
                }
              >
                <TicketTags tags={viewModel.tags} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Máquinas"
                defaultOpen={false}
                rightSlot={
                  viewModel.machines.length ? (
                    <span className="text-xs font-semibold text-slate-500">
                      {viewModel.machines.length}
                    </span>
                  ) : null
                }
              >
                <TicketMachineList machines={viewModel.machines} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Resolução / Descrição"
                defaultOpen={false}
              >
                <TicketDescription description={viewModel.description} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Watchers / Participantes"
                defaultOpen={false}
                rightSlot={
                  viewModel.watchers.length ? (
                    <span className="text-xs font-semibold text-slate-500">
                      {viewModel.watchers.length}
                    </span>
                  ) : null
                }
              >
                <TicketWatchers watchers={viewModel.watchers} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Campos customizados"
                defaultOpen={false}
                rightSlot={
                  viewModel.customFields.length ? (
                    <span className="text-xs font-semibold text-slate-500">
                      {viewModel.customFields.length}
                    </span>
                  ) : null
                }
              >
                <TicketCustomFields fields={viewModel.customFields} />
              </CollapsibleSection>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
