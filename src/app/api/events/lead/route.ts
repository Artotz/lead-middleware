import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/currentUser";
import { validateLeadEventInput } from "@/lib/events";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const parsed = validateLeadEventInput(body);

    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.error, details: parsed.details ?? null },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const updatePayload: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.value.action === "assign" && parsed.value.payload.assignee) {
      updatePayload.consultor = parsed.value.payload.assignee;
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", parsed.value.leadId);
    if (updateError) {
      console.error("Supabase lead update error", updateError);
      return NextResponse.json(
        { success: false, message: "Erro ao atualizar lead." },
        { status: 500 },
      );
    }

    const { data, error } = await supabase
      .from("lead_events")
      .insert({
        lead_id: parsed.value.leadId,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_name: user.name,
        action: parsed.value.action,
        source: "middleware",
        payload: parsed.value.payload,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Supabase lead_events insert error", error);
      return NextResponse.json(
        { success: false, message: "Erro ao registrar aǧǜo no lead.", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status !== 500) {
      return NextResponse.json(
        { success: false, message: "Nǜo autenticado." },
        { status },
      );
    }
    console.error("Unexpected lead event error", err);
    return NextResponse.json(
      { success: false, message: "Erro inesperado ao registrar aǧǜo." },
      { status: 500 },
    );
  }
}
