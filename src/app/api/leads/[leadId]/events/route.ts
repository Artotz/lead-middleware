import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/currentUser";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type LeadEventRow = {
  lead_id: number | null;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string | null;
  source: string | null;
  occurred_at: string | null;
  payload: Record<string, unknown> | null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ leadId: string }> },
) {
  try {
    await requireCurrentUser();

    const { leadId } = await context.params;
    const safeLeadId = Number((leadId ?? "").trim());

    if (!Number.isFinite(safeLeadId) || !Number.isInteger(safeLeadId) || safeLeadId <= 0) {
      return NextResponse.json(
        { success: false, message: "leadId invalido." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("lead_events")
      .select(
        "lead_id,actor_user_id,actor_email,actor_name,action,source,occurred_at,payload",
      )
      .eq("lead_id", safeLeadId)
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Supabase lead events error", error);
      return NextResponse.json(
        { success: false, message: "Erro ao buscar eventos do lead." },
        { status: 500 },
      );
    }

    const items = (data ?? []).map((row: LeadEventRow) => ({
      leadId: row.lead_id,
      actorUserId: row.actor_user_id,
      actorEmail: row.actor_email,
      actorName: row.actor_name,
      action: row.action,
      source: row.source,
      occurredAt: row.occurred_at,
      payload: row.payload,
    }));

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status !== 500) {
      return NextResponse.json(
        { success: false, message: "Nao autenticado." },
        { status },
      );
    }
    console.error("Unexpected lead events error", err);
    return NextResponse.json(
      { success: false, message: "Erro inesperado ao buscar eventos." },
      { status: 500 },
    );
  }
}
