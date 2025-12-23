import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/currentUser";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  aggregateDailyMetrics,
  aggregateUserMetrics,
  rangeToStart,
} from "@/lib/metricsAggregation";
import { isMetricsRange, type MetricsRange } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireCurrentUser();

    const { searchParams } = new URL(request.url);
    const rangeParam = (searchParams.get("range") ?? "week").trim();
    const range: MetricsRange = isMetricsRange(rangeParam) ? rangeParam : "week";
    const start = rangeToStart(range);

    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("ticket_events")
      .select("ticket_id,actor_user_id,actor_email,actor_name,action,occurred_at");

    if (start) {
      query = query.gte("occurred_at", start.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase ticket metrics error", error);
      return NextResponse.json(
        { success: false, message: "Erro ao buscar mǸtricas de tickets.", details: error.message },
        { status: 500 },
      );
    }

    const rows = (data ?? []).map((row: any) => ({
      actor_user_id: row.actor_user_id as string | null,
      actor_email: row.actor_email as string | null,
      actor_name: row.actor_name as string | null,
      action: row.action as string | null,
      item_id: row.ticket_id as string | null,
      occurred_at: row.occurred_at as string | null,
    }));

    const metrics = aggregateUserMetrics(rows);
    const daily = aggregateDailyMetrics(rows);
    const events = rows
      .filter(
        (row): row is {
          actor_user_id: string;
          actor_email: string | null;
          actor_name: string | null;
          action: string;
          item_id: string;
          occurred_at: string;
        } =>
          Boolean(
            row.actor_user_id &&
              row.action &&
              row.item_id !== null &&
              row.item_id !== undefined &&
              row.occurred_at,
          ),
      )
      .map((row) => ({
        actor_user_id: row.actor_user_id,
        actor_email: row.actor_email ?? "",
        actor_name: row.actor_name ?? "",
        action: row.action,
        item_id: String(row.item_id),
        occurred_at: row.occurred_at,
      }))
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
    return NextResponse.json({ success: true, range, items: metrics, daily, events });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status !== 500) {
      return NextResponse.json({ success: false, message: "Nǜo autenticado." }, { status });
    }
    console.error("Unexpected tickets metrics error", err);
    return NextResponse.json(
      { success: false, message: "Erro inesperado ao buscar mǸtricas." },
      { status: 500 },
    );
  }
}
