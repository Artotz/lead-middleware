import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { closeExpertConnectTicketById } from "@/lib/expertconnect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NormalizedError = {
  message: string;
  code:
    | "unauthenticated"
    | "invalid_ticket_id"
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

export async function PUT(
  _request: Request,
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

    const data = await closeExpertConnectTicketById(safeTicketId);
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

    if (status === 401 || status === 403) {
      return jsonError(502, {
        code: "upstream_auth_failed",
        message: "Partner API auth failed",
      });
    }

    if (status && status >= 400 && status < 600) {
      return jsonError(502, {
        code: "upstream_error",
        message: upstreamMessage ?? "Partner API error closing ticket",
        details: { upstreamStatus: status },
      });
    }

    console.error("Unexpected error in PUT /api/tickets/[ticketId]/close", err);
    return jsonError(500, {
      code: "server_error",
      message: "Unexpected error closing ticket",
    });
  }
}
