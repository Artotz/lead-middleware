import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/currentUser";
import { getSupabaseServerClient } from "@/lib/supabaseClient";
import { LEAD_SELECT_COLUMNS, mapLeadRow, type LeadRow } from "@/lib/leadData";

export const dynamic = "force-dynamic";

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

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_SELECT_COLUMNS)
      .eq("id", safeLeadId)
      .single();

    if (error) {
      console.error("Supabase lead fetch error", error);
      return NextResponse.json(
        { success: false, message: "Erro ao carregar lead." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      item: mapLeadRow(data as LeadRow),
    });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status !== 500) {
      return NextResponse.json(
        { success: false, message: "Nao autenticado." },
        { status },
      );
    }
    console.error("Unexpected lead fetch error", err);
    return NextResponse.json(
      { success: false, message: "Erro inesperado ao carregar lead." },
      { status: 500 },
    );
  }
}
