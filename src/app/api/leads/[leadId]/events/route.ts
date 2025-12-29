import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/currentUser";
import { getSupabaseUserClient } from "@/lib/supabaseUserClient";

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

const parseServiceOrderId = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) && Number.isInteger(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return null;
  return parsed;
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

    const supabase = await getSupabaseUserClient();
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

    const serviceOrderIds = (data ?? [])
      .map((row: LeadEventRow) =>
        parseServiceOrderId(row.payload?.service_order_id),
      )
      .filter((id): id is number => Boolean(id));

    const serviceOrderMap = new Map<
      number,
      { os_number: string; parts_value: unknown; labor_value: unknown; note: unknown }
    >();

    if (serviceOrderIds.length) {
      const { data: serviceOrders, error: serviceOrdersError } = await supabase
        .from("lead_service_orders")
        .select("id,os_number,parts_value,labor_value,note")
        .in("id", Array.from(new Set(serviceOrderIds)));

      if (serviceOrdersError) {
        console.error("Supabase lead_service_orders fetch error", serviceOrdersError);
        return NextResponse.json(
          { success: false, message: "Erro ao carregar OS do lead." },
          { status: 500 },
        );
      }

      (serviceOrders ?? []).forEach((order: any) => {
        if (!order?.id) return;
        serviceOrderMap.set(order.id, {
          os_number: String(order.os_number ?? ""),
          parts_value: order.parts_value,
          labor_value: order.labor_value,
          note: order.note,
        });
      });
    }

    const items = (data ?? []).map((row: LeadEventRow) => {
      const serviceOrderId = parseServiceOrderId(row.payload?.service_order_id);
      const serviceOrder = serviceOrderId
        ? serviceOrderMap.get(serviceOrderId)
        : null;
      const payload = row.payload ?? null;

      const enrichedPayload =
        payload && serviceOrder
          ? {
              ...payload,
              os: serviceOrder.os_number,
              parts_value: serviceOrder.parts_value,
              labor_value: serviceOrder.labor_value,
              note:
                typeof serviceOrder.note === "string" &&
                serviceOrder.note.trim()
                  ? serviceOrder.note
                  : payload.note,
            }
          : payload;

      return {
        leadId: row.lead_id,
        actorUserId: row.actor_user_id,
        actorEmail: row.actor_email,
        actorName: row.actor_name,
        action: row.action,
        source: row.source,
        occurredAt: row.occurred_at,
        payload: enrichedPayload,
      };
    });

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
