"use client";

import React, { useMemo, useState } from "react";
import type {
  ActionDefinition,
  ActionRole,
  EventPayload,
  LeadEventAction,
  TicketEventAction,
} from "@/lib/events";
import {
  LEAD_ACTION_DEFINITIONS,
  TICKET_ACTION_DEFINITIONS,
  isUuid,
} from "@/lib/events";
import { useCreateEvent } from "@/hooks/useCreateEvent";
import { ActionModal } from "@/components/ActionModal";
import { useToast } from "@/components/ToastProvider";

type LeadProps = {
  entity: "lead";
  leadId: number;
  leadStatus?: string | null;
  currentUserRole?: ActionRole;
  onLeadStatusChange?: (leadId: number, status: string) => void;
};

type TicketProps = {
  entity: "ticket";
  ticketId: string | null;
  ticketStatus?: string | null;
  currentUserRole?: ActionRole;
};

type ActionButtonCellProps = LeadProps | TicketProps;

const normalizeStatus = (value?: string | null) =>
  value?.trim().toLowerCase() ?? "";

const isRoleAllowed = (def: ActionDefinition<string>, role: ActionRole) => {
  if (!def.allowedRoles) return true;
  return def.allowedRoles.includes(role);
};

const isStatusAllowed = (
  def: ActionDefinition<string>,
  status?: string | null
) => {
  if (!def.allowedStatuses) return true;
  if (def.allowedStatuses.length === 0) return false;
  if (def.allowedStatuses.includes("*")) return true;
  const normalized = normalizeStatus(status);
  if (!normalized) return false;
  return def.allowedStatuses.some(
    (item) => item.trim().toLowerCase() === normalized
  );
};

export function ActionButtonCell(props: ActionButtonCellProps) {
  const toast = useToast();
  const { createLeadEvent, createTicketEvent, loading } = useCreateEvent();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentRole: ActionRole = props.currentUserRole ?? "user";
  const currentStatus =
    props.entity === "lead" ? props.leadStatus : props.ticketStatus;

  const actions = useMemo(() => {
    const base =
      props.entity === "lead"
        ? LEAD_ACTION_DEFINITIONS
        : TICKET_ACTION_DEFINITIONS;
    return base.map((item) => {
      const roleAllowed = isRoleAllowed(item, currentRole);
      const statusAllowed = isStatusAllowed(item, currentStatus);
      return {
        ...item,
        disabled: Boolean(item.disabled) || !roleAllowed || !statusAllowed,
      };
    });
  }, [currentRole, currentStatus, props.entity]);

  const disabledReason =
    props.entity === "ticket" && (!props.ticketId || !isUuid(props.ticketId))
      ? "Ticket sem UUID válido"
      : null;

  const buttonLabel = "Ações";

  const onConfirm = async (
    action: LeadEventAction | TicketEventAction,
    payload: EventPayload
  ) => {
    setError(null);
    try {
      if (props.entity === "lead") {
        await createLeadEvent({
          leadId: props.leadId,
          action: action as LeadEventAction,
          payload,
        });
        const statusByAction: Partial<Record<LeadEventAction, string>> = {
          assign: "atribuido",
          register_contact: "em contato",
          discard: "descartado",
          close_without_os: "fechado_sem_os",
          close_with_os: "fechado_com_os",
        };
        const nextStatus = statusByAction[action as LeadEventAction];
        if (nextStatus) {
          props.onLeadStatusChange?.(props.leadId, nextStatus);
        }
      } else {
        if (!props.ticketId) {
          throw new Error("Ticket sem id vǭlido.");
        }
        await createTicketEvent({
          ticketId: props.ticketId,
          action: action as TicketEventAction,
          payload,
        });
      }

      toast.push({
        variant: "success",
        message: "Aǧǜo registrada com sucesso.",
      });
      setOpen(false);
    } catch (err: any) {
      const message =
        typeof err?.message === "string" && err.message
          ? err.message
          : "Nǜo foi possǭvel registrar aǧǜo.";
      setError(message);
      toast.push({ variant: "error", message });
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={Boolean(disabledReason)}
        onClick={(e) => {
          e.stopPropagation();
          setError(null);
          setOpen(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        title={disabledReason ?? "Registrar aǧǜo"}
      >
        {buttonLabel}
      </button>

      <ActionModal
        open={open}
        entity={props.entity}
        actions={actions as any}
        loading={loading}
        error={error}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm as any}
      />
    </>
  );
}
