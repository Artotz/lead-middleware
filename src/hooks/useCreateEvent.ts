"use client";

import { useCallback, useState } from "react";
import type { EventPayload, LeadEventAction, TicketEventAction } from "@/lib/events";

type ApiSuccess<T> = { success: true; event: T };
type ApiError = { success: false; message?: string; details?: unknown };

const ensureAuthenticated = (response: Response) => {
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login?message=Faǧa login para continuar.";
    }
    throw new Error("auth_required");
  }
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  ensureAuthenticated(response);

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    // ignore
  }

  if (!response.ok) {
    const message =
      (json as ApiError | null)?.message ??
      "Nǜo foi possǭvel registrar aǧǜo.";
    throw new Error(message);
  }

  if (!json?.success) {
    throw new Error(json?.message ?? "Falha ao registrar aǧǜo.");
  }

  return (json as ApiSuccess<T>).event;
}

export function useCreateEvent() {
  const [loading, setLoading] = useState(false);

  const createLeadEvent = useCallback(
    async (input: { leadId: number; action: LeadEventAction; payload: EventPayload }) => {
      setLoading(true);
      try {
        return await postJson("/api/events/lead", input);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createTicketEvent = useCallback(
    async (input: { ticketId: string; action: TicketEventAction; payload: EventPayload }) => {
      setLoading(true);
      try {
        return await postJson("/api/events/ticket", input);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { createLeadEvent, createTicketEvent, loading };
}

