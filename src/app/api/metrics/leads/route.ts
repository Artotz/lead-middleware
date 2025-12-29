import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/currentUser";
import { getSupabaseUserClient } from "@/lib/supabaseUserClient";
import {
  aggregateDailyMetrics,
  aggregateUserMetrics,
  rangeToStart,
} from "@/lib/metricsAggregation";
import { isMetricsRange, type MetricsRange } from "@/lib/metrics";

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  try {
    await requireCurrentUser();

    const { searchParams } = new URL(request.url);
    const rangeParam = (searchParams.get("range") ?? "week").trim();
    const includeUsersParam = (searchParams.get("includeUsers") ?? "1").trim();
    const range: MetricsRange = isMetricsRange(rangeParam) ? rangeParam : "week";
    const start = rangeToStart(range);
    const yearStart = rangeToStart("year");

    const supabase = await getSupabaseUserClient();
    let query = supabase
      .from("lead_events")
      .select("lead_id,actor_user_id,actor_email,actor_name,action,occurred_at,payload");

    query = query.gte("occurred_at", start.toISOString());

    const { data, error } = await query;

    if (error) {
      console.error("Supabase lead metrics error", error);
      return NextResponse.json(
        { success: false, message: "Erro ao buscar mǸtricas de leads.", details: error.message },
        { status: 500 },
      );
    }

    const rows = (data ?? []).map((row: any) => ({
      actor_user_id: row.actor_user_id as string | null,
      actor_email: row.actor_email as string | null,
      actor_name: row.actor_name as string | null,
      action: row.action as string | null,
      item_id: row.lead_id as number | null,
      occurred_at: row.occurred_at as string | null,
      payload: row.payload as Record<string, unknown> | null,
    }));

    const serviceOrderIds = rows
      .map((row) => parseServiceOrderId(row.payload?.service_order_id))
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
        console.error("Supabase lead_service_orders metrics error", serviceOrdersError);
        return NextResponse.json(
          { success: false, message: "Erro ao buscar OS de leads.", details: serviceOrdersError.message },
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

    const enrichedRows = rows.map((row) => {
      const serviceOrderId = parseServiceOrderId(row.payload?.service_order_id);
      const serviceOrder = serviceOrderId
        ? serviceOrderMap.get(serviceOrderId)
        : null;
      if (!serviceOrder || !row.payload) return row;
      return {
        ...row,
        payload: {
          ...row.payload,
          os: serviceOrder.os_number,
          parts_value: serviceOrder.parts_value,
          labor_value: serviceOrder.labor_value,
          note:
            typeof serviceOrder.note === "string" && serviceOrder.note.trim()
              ? serviceOrder.note
              : row.payload.note,
        },
      };
    });

    const usersMap = new Map<string, { id: string; name?: string; email?: string }>();
    const includeUsers = includeUsersParam !== "0";
    if (includeUsers) {
      const { data: userData, error: userError } = await supabase
        .from("lead_events")
        .select("actor_user_id,actor_email,actor_name")
        .gte("occurred_at", yearStart.toISOString());

      if (userError) {
        console.error("Supabase lead users error", userError);
        return NextResponse.json(
          { success: false, message: "Erro ao buscar usuarios de leads.", details: userError.message },
          { status: 500 },
        );
      }

      (userData ?? []).forEach((row: any) => {
        const id = (row.actor_user_id as string | null)?.trim();
        if (!id) return;
        const existing = usersMap.get(id);
        usersMap.set(id, {
          id,
          name: (row.actor_name as string | null)?.trim() || existing?.name,
          email: (row.actor_email as string | null)?.trim() || existing?.email,
        });
      });
    }

    const metrics = aggregateUserMetrics(enrichedRows);
    const daily = aggregateDailyMetrics(enrichedRows);
    return NextResponse.json({
      success: true,
      range,
      items: metrics,
      daily,
      users: Array.from(usersMap.values()),
      events: enrichedRows
        .filter(
          (row) => row.actor_user_id && row.action && row.item_id && row.occurred_at
        )
        .map((row) => ({
          actor_user_id: row.actor_user_id as string,
          action: row.action as string,
          item_id: String(row.item_id as number),
          occurred_at: row.occurred_at as string,
          payload: (row.payload as Record<string, unknown> | null) ?? null,
        })),
    });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status !== 500) {
      return NextResponse.json({ success: false, message: "Nǜo autenticado." }, { status });
    }
    console.error("Unexpected leads metrics error", err);
    return NextResponse.json(
      { success: false, message: "Erro inesperado ao buscar mǸtricas." },
      { status: 500 },
    );
  }
}
