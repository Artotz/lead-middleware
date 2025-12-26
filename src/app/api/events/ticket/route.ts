import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/currentUser";
import { validateTicketEventInput } from "@/lib/events";
import { getSupabaseUserClient } from "@/lib/supabaseUserClient";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const parsed = validateTicketEventInput(body);

    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.error, details: parsed.details ?? null },
        { status: 400 },
      );
    }

    const supabase = await getSupabaseUserClient();
    const { data, error } = await supabase
      .from("ticket_events")
      .insert({
        ticket_id: parsed.value.ticketId,
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
      console.error("Supabase ticket_events insert error", error);
      return NextResponse.json(
        { success: false, message: "Erro ao registrar aǧǜo no ticket.", details: error.message },
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
    console.error("Unexpected ticket event error", err);
    return NextResponse.json(
      { success: false, message: "Erro inesperado ao registrar aǧǜo." },
      { status: 500 },
    );
  }
}

