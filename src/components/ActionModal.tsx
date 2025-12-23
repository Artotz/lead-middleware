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

export function ActionModal<Action extends string>({
  open,
  entity,
  actions,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}: ActionModalProps<Action>) {
  const resolvedActions = useMemo<ActionDefinition<Action>[]>(() => {
    if (actions.length) return actions;
    return (entity === "lead"
      ? LEAD_ACTION_DEFINITIONS
      : TICKET_ACTION_DEFINITIONS) as ActionDefinition<Action>[];
  }, [actions, entity]);

  const firstAction = useMemo(
    () => resolvedActions.find((item) => !item.disabled)?.id,
    [resolvedActions],
  );
  const [action, setAction] = useState<Action | undefined>(firstAction);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [assignee, setAssignee] = useState("");
  const [tags, setTags] = useState("");
  const [osNumber, setOsNumber] = useState("");
  const [osValue, setOsValue] = useState("");
  const [method, setMethod] = useState("manual");
  const [changedFields, setChangedFields] = useState<ChangedFieldRow[]>([
    { key: "", value: "" },
  ]);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeDef = useMemo(
    () => resolvedActions.find((item) => item.id === action) ?? null,
    [action, resolvedActions],
  );

  useEffect(() => {
    if (!open) return;

    setAction(firstAction);
    setNote("");
    setReason("");
    setAssignee("");
    setTags("");
    setOsNumber("");
    setOsValue("");
    setMethod("manual");
    setChangedFields([{ key: "", value: "" }]);

    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [firstAction, open]);

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
    if (activeDef.disabled) return false;
    if (loading) return false;
    if (activeDef.requiresNote && !note.trim()) return false;
    if (activeDef.requiresReason && !reason.trim()) return false;
    if (activeDef.requiresAssignee && !assignee.trim()) return false;
    if (activeDef.requiresOs && !osNumber.trim()) return false;
    if (activeDef.requiresValue) {
      const normalized = osValue.trim().replace(",", ".");
      if (!normalized || Number.isNaN(Number(normalized))) return false;
    }
    if (activeDef.requiresTags && parseTags(tags).length === 0) return false;
    if (activeDef.requiresChangedFields) {
      const hasOne = changedFields.some(
        (row) => row.key.trim() && row.value.trim(),
      );
      if (!hasOne) return false;
    }
    return true;
  }, [
    action,
    activeDef,
    assignee,
    changedFields,
    loading,
    note,
    osNumber,
    osValue,
    reason,
    tags,
  ]);

  const handleConfirm = async () => {
    if (!action || !activeDef) return;
    if (activeDef.disabled) return;

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

    if (activeDef.requiresTags || tags.trim()) {
      const list = parseTags(tags);
      if (list.length) payload.tags = list;
    }

    const normalizedOsNumber = osNumber.trim();
    if (activeDef.requiresOs || normalizedOsNumber) {
      if (normalizedOsNumber) payload.os_number = normalizedOsNumber;
    }

    const normalizedOsValue = osValue.trim().replace(",", ".");
    if (activeDef.requiresValue || normalizedOsValue) {
      const parsedValue = Number(normalizedOsValue);
      if (Number.isFinite(parsedValue)) payload.os_value = parsedValue;
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
  const showOsNumber = Boolean(activeDef?.requiresOs);
  const showOsValue = Boolean(activeDef?.requiresValue);
  const noteRequired = Boolean(activeDef?.requiresNote);
  const noteLabel = noteRequired ? "Descricao do contato" : "Observacao (opcional)";
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
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Registrar aÃºÃ£o"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Registrar aÃºÃ£o
            </h2>
            <p className="text-xs text-slate-500">
              Escolha a aÃºÃ£o e preencha detalhes (se necessÃ¡rio).
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
              AÃºÃ£o
            </p>
            <div className="space-y-2">
              {resolvedActions.map((item) => {
                const active = item.id === action;
                const isDisabled = Boolean(item.disabled);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) setAction(item.id);
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-sky-300 bg-sky-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.description}
                          {item.disabledReason ? ` (${item.disabledReason})` : ""}
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
                  ResponsÃ¡vel <span className="text-rose-600">*</span>
                </span>
                <input
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Email ou nome"
                />
              </label>
            )}

            {showOsNumber && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>
                  OS <span className="text-rose-600">*</span>
                </span>
                <input
                  value={osNumber}
                  onChange={(e) => setOsNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Informe a OS"
                />
              </label>
            )}

            {showOsValue && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>
                  Valor <span className="text-rose-600">*</span>
                </span>
                <input
                  value={osValue}
                  onChange={(e) => setOsValue(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="0,00"
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
                <p className="text-xs text-slate-500">
                  Separe por vÃ¡rgula.
                </p>
              </label>
            )}

            {showMethod && (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>MÃ©todo</span>
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
                      setChangedFields((prev) => [...prev, { key: "", value: "" }])
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
                            i === idx ? { ...item, key: e.target.value } : item,
                          ),
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
                            i === idx ? { ...item, value: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      placeholder="Novo valor"
                    />
                  </div>
                ))}
              </div>
            )}

            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>
                {noteLabel} {noteRequired ? <span className="text-rose-600">*</span> : null}
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
    </div>
  , document.body);
}

export const LEAD_ACTIONS_FOR_UI = LEAD_ACTION_DEFINITIONS;
export const TICKET_ACTIONS_FOR_UI = TICKET_ACTION_DEFINITIONS;
