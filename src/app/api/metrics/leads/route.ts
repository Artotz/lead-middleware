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
    const yearStart = rangeToStart("year");

    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("lead_events")
      .select("lead_id,actor_user_id,actor_email,actor_name,action,occurred_at");

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
    }));

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

    const usersMap = new Map<string, { id: string; name?: string; email?: string }>();
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

    const metrics = aggregateUserMetrics(rows);
    const daily = aggregateDailyMetrics(rows);
    return NextResponse.json({
      success: true,
      range,
      items: metrics,
      daily,
      users: Array.from(usersMap.values()),
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
