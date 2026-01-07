import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  fetchExpertConnectTicketById,
  updateExpertConnectTicketById,
  type TicketResourceUpdateInput,
} from "@/lib/expertconnect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NormalizedError = {
  message: string;
  code:
    | "unauthenticated"
    | "invalid_ticket_id"
    | "invalid_payload"
    | "not_found"
    | "upstream_auth_failed"
    | "upstream_error"
    | "server_error";
  details?: unknown;
};

const jsonError = (status: number, body: NormalizedError) =>
  NextResponse.json(body, { status });

const pickUpstreamMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const maybeMessage =
    (payload as any).message ??
    (payload as any).error?.message ??
    (payload as any).error_description ??
    (payload as any).title;
  if (typeof maybeMessage === "string" && maybeMessage.trim()) {
    return maybeMessage.trim().slice(0, 300);
  }
  return null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ ticketId: string }> },
) {
  try {
    const { ticketId } = await context.params;
    const safeTicketId = (ticketId ?? "").trim();

    if (!safeTicketId) {
      return jsonError(400, {
        code: "invalid_ticket_id",
        message: "ticketId é obrigatório",
      });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, {
        code: "unauthenticated",
        message: "Não autenticado",
      });
    }

    const data = await fetchExpertConnectTicketById(safeTicketId);
    return NextResponse.json(data);
  } catch (err) {
    const status = typeof (err as any)?.status === "number" ? (err as any).status : null;
    const payload = (err as any)?.payload;
    const upstreamMessage = pickUpstreamMessage(payload);

    if (status === 404) {
      return jsonError(404, {
        code: "not_found",
        message: "Ticket não encontrado",
      });
    }

    if (status === 400) {
      return jsonError(400, {
        code: "invalid_ticket_id",
        message: upstreamMessage ?? "Parâmetros inválidos",
      });
    }

    if (status === 401 || status === 403) {
      return jsonError(502, {
        code: "upstream_auth_failed",
        message: "Falha ao autenticar na Partner API",
      });
    }

    if (status && status >= 400 && status < 600) {
      return jsonError(502, {
        code: "upstream_error",
        message: upstreamMessage ?? "Erro ao buscar ticket na Partner API",
        details: { upstreamStatus: status },
      });
    }

    console.error("Unexpected error in GET /api/tickets/[ticketId]", err);
    return jsonError(500, {
      code: "server_error",
      message: "Erro inesperado ao buscar ticket",
    });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ ticketId: string }> },
) {
  try {
    const { ticketId } = await context.params;
    const safeTicketId = (ticketId ?? "").trim();

    if (!safeTicketId) {
      return jsonError(400, {
        code: "invalid_ticket_id",
        message: "ticketId is required",
      });
    }

    let payload: TicketResourceUpdateInput | null = null;
    try {
      const body = await request.json();
      if (body && typeof body === "object" && !Array.isArray(body)) {
        payload = body as TicketResourceUpdateInput;
      }
    } catch {
      payload = null;
    }

    if (!payload) {
      return jsonError(400, {
        code: "invalid_payload",
        message: "Invalid request body",
      });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, {
        code: "unauthenticated",
        message: "Not authenticated",
      });
    }

    let updatePayload: TicketResourceUpdateInput = { ...payload };
    const hasResolutionField = Object.prototype.hasOwnProperty.call(
      payload,
      "resolution",
    );
    const hasDescriptionField = Object.prototype.hasOwnProperty.call(
      payload,
      "description",
    );

    if (hasResolutionField || hasDescriptionField) {
      const details = await fetchExpertConnectTicketById(safeTicketId);
      const currentDetails =
        details && typeof details === "object" ? (details as any) : null;

      if (hasResolutionField) {
        const currentResolution = currentDetails?.resolution;
        const resolutionText =
          typeof currentResolution === "string" ? currentResolution.trim() : "";

        if (resolutionText) {
          delete updatePayload.resolution;
        }
      }

      if (hasDescriptionField) {
        const currentDescription = currentDetails?.description;
        const descriptionText =
          typeof currentDescription === "string" ? currentDescription.trim() : "";

        if (descriptionText) {
          delete updatePayload.description;
        }
      }
    }

    if (!Object.keys(updatePayload).length) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "fields_already_set",
      });
    }

    const data = await updateExpertConnectTicketById(
      safeTicketId,
      updatePayload,
    );
    return NextResponse.json(data ?? { success: true });
  } catch (err) {
    const status =
      typeof (err as any)?.status === "number" ? (err as any).status : null;
    const payload = (err as any)?.payload;
    const upstreamMessage = pickUpstreamMessage(payload);

    if (status === 404) {
      return jsonError(404, {
        code: "not_found",
        message: "Ticket not found",
      });
    }

    if (status === 400) {
      return jsonError(400, {
        code: "invalid_payload",
        message: upstreamMessage ?? "Invalid request payload",
      });
    }

    if (status === 401 || status === 403) {
      return jsonError(502, {
        code: "upstream_auth_failed",
        message: "Partner API auth failed",
      });
    }

    if (status && status >= 400 && status < 600) {
      return jsonError(502, {
        code: "upstream_error",
        message: upstreamMessage ?? "Partner API error updating ticket",
        details: { upstreamStatus: status },
      });
    }

    console.error("Unexpected error in PUT /api/tickets/[ticketId]", err);
    return jsonError(500, {
      code: "server_error",
      message: "Unexpected error updating ticket",
    });
  }
}
