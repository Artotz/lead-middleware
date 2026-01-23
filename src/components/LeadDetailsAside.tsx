"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Lead, LeadCategory } from "@/lib/domain";
import { LEAD_ACTION_DEFINITIONS, type EventPayload } from "@/lib/events";
import { LEAD_STATUS_LABELS } from "@/lib/filters";
import { Badge } from "@/components/Badge";
import { AssignLeadButton } from "@/components/AssignLeadButton";
import { CollapsibleSection } from "@/components/ticket-details/CollapsibleSection";
import {
  KeyValueGrid,
  type KeyValueItem,
} from "@/components/ticket-details/KeyValueGrid";

type LeadDetailsAsideProps = {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  currentUserName?: string | null;
  onLeadAssigned?: (leadId: number, assignee: string) => void;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnlyFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

const leadTypeTone: Record<LeadCategory, Parameters<typeof Badge>[0]["tone"]> =
  {
    preventiva: "sky",
    garantia_basica: "amber",
    garantia_estendida: "amber",
    reforma_componentes: "violet",
    lamina: "emerald",
    dentes: "emerald",
    rodante: "emerald",
    disponibilidade: "sky",
    reconexao: "slate",
    transferencia_aor: "slate",
    pops: "slate",
    outros: "stone",
    indefinido: "stone",
  };

const leadTypeLabel: Record<LeadCategory, string> = {
  preventiva: "Preventiva",
  garantia_basica: "Garantia basica",
  garantia_estendida: "Garantia estendida",
  reforma_componentes: "Reforma de componentes",
  lamina: "Lamina",
  dentes: "Dentes",
  rodante: "Rodante",
  disponibilidade: "Disponibilidade",
  reconexao: "Reconexao",
  transferencia_aor: "Transferencia de AOR",
  pops: "POPs",
  outros: "Outros",
  indefinido: "Indefinido",
};

const pickStatusTone = (
  status: string | null
): Parameters<typeof Badge>[0]["tone"] => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return "stone";
  if (normalized.includes("fech") || normalized.includes("conclu"))
    return "emerald";
  if (normalized.includes("cancel")) return "rose";
  if (normalized.includes("novo")) return "sky";
  if (normalized.includes("pend")) return "amber";
  return "slate";
};

const formatDateParts = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { time: "N/A", date: "N/A" };
  }
  return {
    time: dateFormatter.format(date),
    date: dateOnlyFormatter.format(date),
  };
};

const flagValue = (value: string | null) =>
  value && value.trim() ? value.trim() : "Nao";

type LeadEventItem = {
  action: string | null;
  occurredAt: string | null;
  actorName: string | null;
  actorEmail: string | null;
  source: string | null;
  payload: EventPayload | null;
};

type EventsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: LeadEventItem[] }
  | { status: "error"; message: string };

const leadActionMeta = new Map<string, { label: string; description: string }>(
  LEAD_ACTION_DEFINITIONS.map((def) => [
    def.id,
    { label: def.label, description: def.description },
  ])
);

const formatEventDate = (iso: string | null) => {
  if (!iso) return "N/A";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "N/A";
  return `${dateFormatter.format(date)} ${dateOnlyFormatter.format(date)}`;
};

const truncateText = (value: string, max = 120) => {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
};

const parseMoney = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^\d,.-]/g, "");
  if (!normalized) return null;
  let numeric = normalized;
  if (numeric.includes(",") && numeric.includes(".")) {
    numeric = numeric.replace(/\./g, "").replace(",", ".");
  } else if (numeric.includes(",")) {
    numeric = numeric.replace(",", ".");
  }
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMoney = (value: unknown): string | null => {
  const parsed = parseMoney(value);
  if (parsed === null) return null;
  return numberFormatter.format(parsed);
};

const renderTemplate = (template: string, tokens: Record<string, string>) => {
  const parts: React.ReactNode[] = [];
  const regex = /\{(\w+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    const [raw, key] = match;
    if (match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }
    const value = tokens[key] ?? "...";
    parts.push(
      <span
        key={`${key}-${match.index}`}
        className="rounded-sm bg-slate-100 px-1 font-semibold text-slate-900"
      >
        {value}
      </span>
    );
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  return parts;
};

const formatActorName = (value: string | null) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "Sistema";
  if (trimmed.includes("@")) {
    const handle = trimmed.split("@")[0];
    return handle.replace(/\./g, " ");
  }
  return trimmed;
};

const summarizePayload = (
  payload: EventPayload | null,
  action?: string | null
): string[] => {
  if (!payload) return [];
  const parts: string[] = [];

  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const noteLabel = action === "register_contact" ? "Contato" : "Nota";
  if (note) parts.push(`${noteLabel}: ${truncateText(note)}`);

  const tags =
    Array.isArray(payload.tags) && payload.tags.length
      ? payload.tags.map((tag) => String(tag)).filter(Boolean)
      : [];
  if (tags.length) parts.push(`Tags: ${tags.join(", ")}`);

  const assignee =
    typeof payload.assignee === "string" ? payload.assignee.trim() : "";
  if (assignee) parts.push(`Responsavel: ${assignee}`);

  const reason =
    typeof payload.reason === "string" ? payload.reason.trim() : "";
  if (reason) parts.push(`Motivo: ${truncateText(reason, 90)}`);

  const osValue = typeof payload.os === "string" ? payload.os.trim() : "";
  if (osValue) parts.push(`OS: ${osValue}`);

  const partsValue = formatMoney(payload.parts_value);
  const laborValue = formatMoney(payload.labor_value);
  if (partsValue) parts.push(`Pecas: ${partsValue}`);
  if (laborValue) parts.push(`Mao de obra: ${laborValue}`);
  const valorValue = formatMoney(payload.valor);
  const totalValue =
    partsValue || laborValue
      ? formatMoney(
          (parseMoney(payload.parts_value) ?? 0) +
            (parseMoney(payload.labor_value) ?? 0)
        )
      : valorValue;
  if (totalValue && (partsValue || laborValue)) parts.push(`Total: ${totalValue}`);
  if (!partsValue && !laborValue && valorValue) parts.push(`Valor: ${valorValue}`);

  const method =
    typeof payload.method === "string" ? payload.method.trim() : "";
  if (method) parts.push(`Metodo: ${method}`);

  const changedFields = payload.changed_fields;
  if (changedFields && typeof changedFields === "object") {
    const entries = Object.entries(changedFields as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .filter((entry) => entry.trim());
    if (entries.length) parts.push(`Campos: ${entries.join(", ")}`);
  }

  return parts;
};

function LeadHeader({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const leadTypes = lead.tipoLeadList?.length
    ? lead.tipoLeadList
    : [lead.tipoLead];
  const headerSubtitle = [lead.chassi ?? "Sem chassi", lead.modelName ?? "N/A"]
    .filter(Boolean)
    .join(" - ");

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="slate">Lead #{lead.id}</Badge>
            <Badge tone={pickStatusTone(lead.status)}>
              {lead.status ?? "Sem status"}
            </Badge>
            {leadTypes.map((tipo) => (
              <Badge key={tipo} tone={leadTypeTone[tipo]}>
                {leadTypeLabel[tipo]}
              </Badge>
            ))}
          </div>
          <h2 className="mt-2 line-clamp-2 text-base font-semibold text-slate-900">
            {lead.clienteBaseEnriquecida ?? "Sem cliente"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{headerSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          X
        </button>
      </div>
    </div>
  );
}

export function LeadDetailsAside({
  lead,
  open,
  onClose,
  currentUserName,
  onLeadAssigned,
}: LeadDetailsAsideProps) {
  const [eventsState, setEventsState] = useState<EventsState>({
    status: "idle",
  });
  const [eventsReloadNonce, setEventsReloadNonce] = useState(0);
  const leadId = lead?.id ?? null;
  const hasLeadId = typeof leadId === "number" && Number.isFinite(leadId);

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
    if (!open) {
      setEventsState({ status: "idle" });
      return;
    }

    if (!hasLeadId) {
      setEventsState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    setEventsState({ status: "loading" });

    const load = async () => {
      try {
        const response = await fetch(
          `/api/leads/${encodeURIComponent(String(leadId))}/events`,
          { signal: controller.signal, cache: "no-store" }
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            payload?.message ?? "Falha ao carregar eventos do lead.";
          throw new Error(message);
        }
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        setEventsState({ status: "success", data: items });
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        const message =
          typeof err?.message === "string" && err.message
            ? err.message
            : "Falha ao carregar eventos do lead.";
        setEventsState({ status: "error", message });
      }
    };

    void load();
    return () => controller.abort();
  }, [hasLeadId, leadId, open, eventsReloadNonce]);

  const summaryItems = useMemo<KeyValueItem[]>(() => {
    if (!lead) return [];
    const importedParts = formatDateParts(lead.importedAt);
    const consultorValue = lead.consultor ?? null;
    const canAssignLead =
      !consultorValue?.trim() && Boolean(currentUserName?.trim());
    const consultorDisplay = canAssignLead ? (
      <AssignLeadButton
        leadId={lead.id}
        assigneeName={currentUserName}
        onAssigned={(assignee) => onLeadAssigned?.(lead.id, assignee)}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      />
    ) : (
      consultorValue ?? "Sem consultor"
    );
    const items: KeyValueItem[] = [
      { label: "Lead ID", value: String(lead.id) },
      { label: "Status", value: lead.status ?? "Sem status" },
      { label: "Criado por", value: lead.createdBy ?? "Nao informado" },
      { label: "Cliente", value: lead.clienteBaseEnriquecida ?? "Sem cliente" },
      { label: "Contato", value: lead.nomeContato ?? "Sem contato" },
      { label: "Telefone", value: lead.telefone ?? "Sem telefone" },
      {
        label: "Consultor",
        value: consultorDisplay,
      },
      { label: "Regional", value: lead.regional ?? "Sem regional" },
      { label: "Estado", value: lead.estado ?? "Sem estado" },
      { label: "Cidade", value: lead.city ?? "Sem cidade" },
      { label: "Grupo chamado", value: lead.lastCalledGroup ?? "Sem grupo" },
      {
        label: "Importado em",
        value: `${importedParts.date} ${importedParts.time}`,
      },
    ];
    return items;
  }, [currentUserName, lead, onLeadAssigned]);

  const equipmentItems = useMemo<KeyValueItem[]>(() => {
    if (!lead) return [];
    return [
      { label: "Chassi", value: lead.chassi ?? "Sem chassi" },
      { label: "Modelo", value: lead.modelName ?? "N/A" },
      {
        label: "Horimetro atual",
        value:
          lead.horimetroAtualMachineList !== null
            ? `${numberFormatter.format(lead.horimetroAtualMachineList)} h`
            : "N/A",
      },
    ];
  }, [lead]);

  const bancoItems = useMemo<KeyValueItem[]>(() => {
    if (!lead) return [];
    return [
      { label: "Preventiva", value: flagValue(lead.leadPreventiva) },
      { label: "Garantia basica", value: flagValue(lead.leadGarantiaBasica) },
      {
        label: "Garantia estendida",
        value: flagValue(lead.leadGarantiaEstendida),
      },
      {
        label: "Reforma de componentes",
        value: flagValue(lead.leadReformaDeComponentes),
      },
      { label: "Lamina", value: flagValue(lead.leadLamina) },
      { label: "Dentes", value: flagValue(lead.leadDentes) },
      { label: "Rodante", value: flagValue(lead.leadRodante) },
      { label: "Disponibilidade", value: flagValue(lead.leadDisponibilidade) },
      { label: "Reconexao", value: flagValue(lead.leadReconexao) },
      {
        label: "Transferencia de AOR",
        value: flagValue(lead.leadTransferenciaDeAor),
      },
    ];
  }, [lead]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes do lead"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-[640px] flex-col border-l border-slate-200 bg-slate-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {lead ? (
          <LeadHeader lead={lead} onClose={onClose} />
        ) : (
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">
                Nenhum lead selecionado
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                X
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {lead ? (
            <div className="space-y-3 px-5 py-4">
              <CollapsibleSection title="Resumo do lead" defaultOpen>
                <KeyValueGrid items={summaryItems} />
              </CollapsibleSection>

              <CollapsibleSection title="Equipamento" defaultOpen>
                <KeyValueGrid items={equipmentItems} />
              </CollapsibleSection>

              <CollapsibleSection title="Tipos do lead" defaultOpen>
                <div className="flex flex-wrap gap-2">
                  {(lead.tipoLeadList?.length
                    ? lead.tipoLeadList
                    : [lead.tipoLead]
                  ).map((tipo) => (
                    <Badge key={tipo} tone={leadTypeTone[tipo]}>
                      {leadTypeLabel[tipo]}
                    </Badge>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Eventos do lead" defaultOpen>
                {!hasLeadId ? (
                  <div className="text-sm text-slate-600">
                    Lead sem identificador valido.
                  </div>
                ) : null}

                {hasLeadId && eventsState.status === "loading" ? (
                  <div className="text-sm text-slate-600">
                    Carregando eventos do lead...
                  </div>
                ) : null}

                {hasLeadId && eventsState.status === "error" ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    <div className="font-semibold">
                      Erro ao carregar eventos
                    </div>
                    <div className="mt-1">{eventsState.message}</div>
                    <button
                      type="button"
                      onClick={() => setEventsReloadNonce((prev) => prev + 1)}
                      className="mt-3 inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : null}

                {hasLeadId && eventsState.status === "success" ? (
                  eventsState.data.length ? (
                    <div className="space-y-2">
                      {eventsState.data.map((event, index) => {
                        const meta = event.action
                          ? leadActionMeta.get(event.action)
                          : null;
                        const label = meta?.label ?? event.action ?? "Acao";
                        const description = meta?.description ?? null;
                        const when = formatEventDate(event.occurredAt);
                        const actor = formatActorName(event.actorName);
                        const payload = event.payload ?? {};
                        const noteRaw =
                          typeof payload.note === "string"
                            ? payload.note.trim()
                            : "";
                        const reasonRaw =
                          typeof payload.reason === "string"
                            ? payload.reason.trim()
                            : "";
                        const assignee =
                          typeof payload.assignee === "string"
                            ? payload.assignee.trim()
                            : "";
                        const osValue =
                          typeof payload.os === "string"
                            ? payload.os.trim()
                            : "";
                        const partsValue = formatMoney(payload.parts_value) ?? "";
                        const laborValue = formatMoney(payload.labor_value) ?? "";
                        const totalValue = formatMoney(
                          (parseMoney(payload.parts_value) ?? 0) +
                            (parseMoney(payload.labor_value) ?? 0)
                        );
                        const valorValue =
                          totalValue ??
                          (typeof payload.valor === "string"
                            ? payload.valor.trim()
                            : "");
                        const methodValue =
                          typeof payload.method === "string"
                            ? payload.method.trim()
                            : "";
                        const statusByAction: Record<string, string> = {
                          assign: "atribuido",
                          register_contact: "em contato",
                          discard: "descartado",
                          close_without_os: "fechado_sem_os",
                          close_with_os: "fechado_com_os",
                        };
                        const statusValue = event.action
                          ? statusByAction[event.action] ?? ""
                          : "";
                        const statusLabel = statusValue
                          ? LEAD_STATUS_LABELS[statusValue] ?? statusValue
                          : "";
                        const descriptionNodes = description
                          ? renderTemplate(description, {
                              actor,
                              note: noteRaw ? truncateText(noteRaw) : "...",
                              reason: reasonRaw
                                ? truncateText(reasonRaw, 90)
                                : "...",
                              assignee: assignee || "...",
                              os: osValue || "...",
                              valor: valorValue || "...",
                              method: methodValue || "manual",
                              status: statusLabel || "...",
                            })
                          : null;
                        const payloadLines = summarizePayload(
                          event.payload,
                          event.action
                        );

                        return (
                          <div
                            key={`${event.action ?? "event"}-${index}`}
                            className="rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-slate-900 break-words">
                                  {descriptionNodes ?? label}
                                </div>
                              </div>
                              <div className="flex-shrink-0 text-right text-xs text-slate-400">
                                {when}
                              </div>
                            </div>
                            {payloadLines.length ? (
                              <div className="mt-2 text-xs text-slate-600">
                                {payloadLines.join(" | ")}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">
                      Nenhum evento registrado para este lead.
                    </div>
                  )
                ) : null}
              </CollapsibleSection>

              <CollapsibleSection title="Sinais do banco" defaultOpen={false}>
                <KeyValueGrid items={bancoItems} />
              </CollapsibleSection>
            </div>
          ) : (
            <div className="px-5 py-4 text-sm text-slate-600">
              Selecione um lead para visualizar os detalhes.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
