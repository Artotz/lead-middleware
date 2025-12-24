"use client";

import { useMemo, type MouseEvent } from "react";
import { useCreateEvent } from "@/hooks/useCreateEvent";
import { useToast } from "@/components/ToastProvider";

type AssignLeadButtonProps = {
  leadId: number;
  assigneeName?: string | null;
  onAssigned?: (assignee: string) => void;
  className?: string;
};

export function AssignLeadButton({
  leadId,
  assigneeName,
  onAssigned,
  className,
}: AssignLeadButtonProps) {
  const toast = useToast();
  const { createLeadEvent, loading } = useCreateEvent();

  const cleanedAssignee = useMemo(
    () => (assigneeName ?? "").trim(),
    [assigneeName],
  );

  const disabledReason = !cleanedAssignee
    ? "Usuario nao identificado."
    : null;

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (disabledReason) return;
    try {
      await createLeadEvent({
        leadId,
        action: "assign",
        payload: { assignee: cleanedAssignee },
      });
      toast.push({
        variant: "success",
        message: "Lead atribuido a voce.",
      });
      onAssigned?.(cleanedAssignee);
    } catch (err: any) {
      const message =
        typeof err?.message === "string" && err.message
          ? err.message
          : "Nao foi possivel atribuir o lead.";
      toast.push({ variant: "error", message });
    }
  };

  return (
    <button
      type="button"
      disabled={Boolean(disabledReason) || loading}
      onClick={handleClick}
      onMouseDown={(event) => event.stopPropagation()}
      title={disabledReason ?? "Atribuir lead a voce"}
      className={
        className ??
        "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {loading ? "Atribuindo..." : "Atribuir a mim"}
    </button>
  );
}
