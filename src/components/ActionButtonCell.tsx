"use client";

import React, { useMemo, useState } from "react";
import type { EventPayload, LeadEventAction, TicketEventAction } from "@/lib/events";
import { LEAD_ACTION_DEFINITIONS, TICKET_ACTION_DEFINITIONS, isUuid } from "@/lib/events";
import { useCreateEvent } from "@/hooks/useCreateEvent";
import { ActionModal } from "@/components/ActionModal";
import { useToast } from "@/components/ToastProvider";

type LeadProps = {
  entity: "lead";
  leadId: number;
};

type TicketProps = {
  entity: "ticket";
  ticketId: string | null;
};

type ActionButtonCellProps = LeadProps | TicketProps;

export function ActionButtonCell(props: ActionButtonCellProps) {
  const toast = useToast();
  const { createLeadEvent, createTicketEvent, loading } = useCreateEvent();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo(() => {
    return props.entity === "lead"
      ? LEAD_ACTION_DEFINITIONS
      : TICKET_ACTION_DEFINITIONS;
  }, [props.entity]);

  const disabledReason =
    props.entity === "ticket" && (!props.ticketId || !isUuid(props.ticketId))
      ? "Ticket sem UUID vǭlido"
      : null;

  const buttonLabel = "Aǧǜes";

  const onConfirm = async (
    action: LeadEventAction | TicketEventAction,
    payload: EventPayload,
  ) => {
    setError(null);
    try {
      if (props.entity === "lead") {
        await createLeadEvent({
          leadId: props.leadId,
          action: action as LeadEventAction,
          payload,
        });
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

      toast.push({ variant: "success", message: "Aǧǜo registrada com sucesso." });
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
