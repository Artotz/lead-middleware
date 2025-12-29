"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type ActionDefinition,
  type EventPayload,
  MAX_NOTE_CHARS,
  LEAD_ACTION_DEFINITIONS,
  TICKET_ACTION_DEFINITIONS,
} from "@/lib/events";

type EntityKind = "lead" | "ticket";

type ActionModalProps<Action extends string> = {
  open: boolean;
  entity: EntityKind;
  actions: ActionDefinition<Action>[];
  defaultAction?: Action;
  initialPayload?: EventPayload;
  onClose: () => void;
  onConfirm: (action: Action, payload: EventPayload) => Promise<void>;
  loading?: boolean;
  error?: string | null;
};

type ChangedFieldRow = { key: string; value: string };

const parseTags = (value: string): string[] =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const LEAD_ACTION_MODAL_DESCRIPTIONS: Record<string, string> = {
  register_contact: "Registra o contato realizado.",
  assign: "Atribui o lead a um responsavel.",
  discard: "Descarta o lead (exige motivo).",
  close_without_os: "Fecha o lead sem OS (exige motivo).",
  close_with_os: "Fecha o lead com OS e valor.",
  convert_to_ticket: "Converte esse lead em ticket.",
};

const TICKET_ACTION_MODAL_DESCRIPTIONS: Record<string, string> = {
  view: "Marca que voce visualizou o ticket.",
  add_note: "Registra uma observacao interna.",
  add_tags: "Adiciona tags ao ticket.",
  remove_tags: "Remove tags do ticket.",
  close: "Registra fechamento do ticket.",
  reopen: "Registra reabertura do ticket.",
  assign: "Atribui esse ticket.",
  external_update_detected: "Marca que houve mudanca fora do middleware.",
};

export function ActionModal<Action extends string>({
  open,
  entity,
  actions,
  defaultAction,
  initialPayload,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}: ActionModalProps<Action>) {
  const [action, setAction] = useState<Action | undefined>(undefined);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [assignee, setAssignee] = useState("");
  const [os, setOs] = useState("");
  const [partsValue, setPartsValue] = useState("");
  const [laborValue, setLaborValue] = useState("");
  const [tags, setTags] = useState("");
  const [method, setMethod] = useState("manual");
  const [changedFields, setChangedFields] = useState<ChangedFieldRow[]>([
    { key: "", value: "" },
  ]);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeDef = useMemo(
    () => actions.find((item) => item.id === action) ?? null,
    [action, actions]
  );

  useEffect(() => {
    if (!open) return;

    setAction(defaultAction);
    setNote(typeof initialPayload?.note === "string" ? initialPayload.note : "");
    setReason(
      typeof initialPayload?.reason === "string" ? initialPayload.reason : "",
    );
    setAssignee(
      typeof initialPayload?.assignee === "string"
        ? initialPayload.assignee
        : "",
    );
    setOs(typeof initialPayload?.os === "string" ? initialPayload.os : "");
    setPartsValue(
      initialPayload?.parts_value !== undefined &&
        initialPayload?.parts_value !== null
        ? String(initialPayload.parts_value)
        : "",
    );
    setLaborValue(
      initialPayload?.labor_value !== undefined &&
        initialPayload?.labor_value !== null
        ? String(initialPayload.labor_value)
        : "",
    );
    setTags(
      Array.isArray(initialPayload?.tags)
        ? initialPayload?.tags.join(", ")
        : "",
    );
    setMethod(
      typeof initialPayload?.method === "string"
        ? initialPayload.method
        : "manual",
    );
    setChangedFields(() => {
      const entries = initialPayload?.changed_fields;
      if (!entries || typeof entries !== "object") {
        return [{ key: "", value: "" }];
      }
      const rows = Object.entries(entries as Record<string, unknown>)
        .map(([key, value]) => ({
          key,
          value: typeof value === "string" ? value : String(value),
        }))
        .filter((row) => row.key.trim() || row.value.trim());
      return rows.length ? rows : [{ key: "", value: "" }];
    });

    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [defaultAction, initialPayload, open]);

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

  const canConfirm = useMemo(() => {
    if (!activeDef || !action) return false;
    if (loading) return false;
    if (activeDef.disabled) return false;
    if (activeDef.requiresNote && !note.trim()) return false;
    if (activeDef.requiresReason && !reason.trim()) return false;
    if (activeDef.requiresAssignee && !assignee.trim()) return false;
    if (activeDef.requiresOs && !os.trim()) return false;
    if (activeDef.requiresPartsValue && !partsValue.trim()) return false;
    if (activeDef.requiresLaborValue && !laborValue.trim()) return false;
    if (activeDef.requiresTags && parseTags(tags).length === 0) return false;
    if (activeDef.requiresChangedFields) {
      const hasOne = changedFields.some(
        (row) => row.key.trim() && row.value.trim()
      );
      if (!hasOne) return false;
    }
    return true;
  }, [
    action,
    activeDef,
    assignee,
    changedFields,
    laborValue,
    loading,
    note,
    os,
    partsValue,
    reason,
    tags,
  ]);

  const handleConfirm = async () => {
    if (!action || !activeDef) return;

    const payload: EventPayload = {};

    const normalizedNote = note.trim().slice(0, MAX_NOTE_CHARS);
    if (normalizedNote) payload.note = normalizedNote;

    if (activeDef.requiresReason || reason.trim()) {
      const normalizedReason = reason.trim();
      if (normalizedReason) payload.reason = normalizedReason;
    }

    if (activeDef.requiresAssignee) {
      payload.assignee = assignee.trim();
    } else if (assignee.trim()) {
      payload.assignee = assignee.trim();
    }

    if (activeDef.requiresOs) {
      payload.os = os.trim();
    } else if (os.trim()) {
      payload.os = os.trim();
    }

    if (activeDef.requiresPartsValue) {
      payload.parts_value = partsValue.trim();
    } else if (partsValue.trim()) {
      payload.parts_value = partsValue.trim();
    }

    if (activeDef.requiresLaborValue) {
      payload.labor_value = laborValue.trim();
    } else if (laborValue.trim()) {
      payload.labor_value = laborValue.trim();
    }

    if (activeDef.requiresTags || tags.trim()) {
      const list = parseTags(tags);
      if (list.length) payload.tags = list;
    }

    if (entity === "lead" && action === ("convert_to_ticket" as Action)) {
      payload.method = method.trim() || "manual";
    }

    if (entity === "lead" && action === ("update_field" as Action)) {
      const entries = changedFields
        .map((row) => [row.key.trim(), row.value.trim()] as const)
        .filter(([k, v]) => Boolean(k) && Boolean(v));
      if (entries.length) {
        payload.changed_fields = Object.fromEntries(entries);
      }
    }

    await onConfirm(action, payload);
  };

  const showMethod =
    entity === "lead" && action === ("convert_to_ticket" as Action);
  const showChangedFields =
    entity === "lead" && action === ("update_field" as Action);
  const showTags =
    entity === "ticket" &&
    (action === ("add_tags" as Action) || action === ("remove_tags" as Action));
  const showAssignee = Boolean(activeDef?.requiresAssignee);
  const showOs = Boolean(activeDef?.requiresOs);
  const showPartsValue = Boolean(activeDef?.requiresPartsValue);
  const showLaborValue = Boolean(activeDef?.requiresLaborValue);
  const noteRequired = Boolean(activeDef?.requiresNote);
  const showNote = Boolean(activeDef && !activeDef.hideNote);
  const noteLabel = noteRequired
    ? "Descricao do contato"
    : "Observacao (opcional)";
  const notePlaceholder = noteRequired
    ? "Descreva o contato realizado"
    : "Adicione contexto (ate 2000 caracteres)";

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Registrar ação"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Registrar ação
            </h2>
            <p className="text-xs text-slate-500">
              Escolha a ação e preencha detalhes (se necessário).
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

        <div className="grid gap-4 p-5 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ação
            </p>
            <div className="space-y-2">
              {actions.map((item) => {
                const active = item.id === action;
                const isDisabled = Boolean(item.disabled);
                const description =
                  (entity === "lead"
                    ? LEAD_ACTION_MODAL_DESCRIPTIONS[item.id]
                    : TICKET_ACTION_MODAL_DESCRIPTIONS[item.id]) ??
                  item.description;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (!isDisabled) setAction(item.id);
                    }}
                    disabled={isDisabled}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-sky-300 bg-sky-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-500">
                          {description}
                        </div>
                      </div>
                      <div
                        className={`h-3 w-3 rounded-full border ${
                          active
                            ? "border-sky-400 bg-sky-500"
                            : "border-slate-300 bg-white"
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Detalhes
            </p>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {error}
              </div>
            )}

            {activeDef?.requiresReason && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>
                  Motivo <span className="text-rose-600">*</span>
                </span>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Explique o motivo"
                  required
                />
              </label>
            )}

            {showAssignee && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>
                  Responsável <span className="text-rose-600">*</span>
                </span>
                <input
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Email ou nome"
                />
              </label>
            )}

            {showOs && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>
                  OS <span className="text-rose-600">*</span>
                </span>
                <input
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Numero da OS"
                />
              </label>
            )}

            {showPartsValue && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>
                  Pecas <span className="text-rose-600">*</span>
                </span>
                <input
                  value={partsValue}
                  onChange={(e) => setPartsValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Ex.: 2500"
                />
              </label>
            )}

            {showLaborValue && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>
                  Mao de obra <span className="text-rose-600">*</span>
                </span>
                <input
                  value={laborValue}
                  onChange={(e) => setLaborValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Ex.: 500"
                />
              </label>
            )}

            {showTags && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>
                  Tags <span className="text-rose-600">*</span>
                </span>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Ex.: urgente, callback, vip"
                />
                <p className="text-xs text-slate-500">Separe por vírgula.</p>
              </label>
            )}

            {showMethod && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Método</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="manual">Manual</option>
                </select>
              </label>
            )}

            {showChangedFields && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    Campos alterados <span className="text-rose-600">*</span>
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setChangedFields((prev) => [
                        ...prev,
                        { key: "", value: "" },
                      ])
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Adicionar
                  </button>
                </div>
                {changedFields.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input
                      value={row.key}
                      onChange={(e) =>
                        setChangedFields((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, key: e.target.value } : item
                          )
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      placeholder="Campo"
                    />
                    <input
                      value={row.value}
                      onChange={(e) =>
                        setChangedFields((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, value: e.target.value }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      placeholder="Novo valor"
                    />
                  </div>
                ))}
              </div>
            )}

            {showNote && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>
                  {noteLabel}{" "}
                  {noteRequired ? (
                    <span className="text-rose-600">*</span>
                  ) : null}
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={MAX_NOTE_CHARS}
                  rows={4}
                  required={noteRequired}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder={notePlaceholder}
                />
                <div className="flex justify-end text-xs text-slate-400">
                  {note.length}/{MAX_NOTE_CHARS}
                </div>
              </label>
            )}
          </div>
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
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Registrando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export const LEAD_ACTIONS_FOR_UI = LEAD_ACTION_DEFINITIONS;
export const TICKET_ACTIONS_FOR_UI = TICKET_ACTION_DEFINITIONS;
