import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/currentUser";
import { validateLeadEventInput } from "@/lib/events";
import { getSupabaseUserClient } from "@/lib/supabaseUserClient";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const parsed = validateLeadEventInput(body);

    if (!parsed.ok) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error,
          details: parsed.details ?? null,
        },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseUserClient();
    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .select("consultor")
      .eq("id", parsed.value.leadId)
      .single();

    if (leadError) {
      console.error("Supabase lead fetch error", leadError);
      return NextResponse.json(
        { success: false, message: "Erro ao carregar lead." },
        { status: 500 }
      );
    }

    const leadConsultor = (leadRow?.consultor ?? "").trim().toLowerCase();
    const currentUserName = (user.name ?? "").trim().toLowerCase();

    if (parsed.value.action === "register_contact") {
      if (!leadConsultor || leadConsultor !== currentUserName) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Voce so pode registrar contato em leads atribuidos a voce.",
          },
          { status: 403 }
        );
      }
    }

    const updatePayload: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.value.action === "assign" && parsed.value.payload.assignee) {
      updatePayload.consultor = parsed.value.payload.assignee;
      updatePayload.status = "atribuido";
    }

    if (parsed.value.action === "discard") {
      updatePayload.status = "descartado";
    }

    if (parsed.value.action === "register_contact") {
      updatePayload.status = "em contato";
    }

    if (parsed.value.action === "close_without_os") {
      updatePayload.status = "fechado_sem_os";
    }

    if (parsed.value.action === "close_with_os") {
      updatePayload.status = "fechado_com_os";
    }

    let eventPayload = parsed.value.payload;

    if (parsed.value.action === "close_with_os") {
      const osNumber =
        typeof parsed.value.payload.os === "string"
          ? parsed.value.payload.os.trim()
          : "";
      const partsValueRaw = parsed.value.payload.parts_value;
      const laborValueRaw = parsed.value.payload.labor_value;
      const partsValue =
        typeof partsValueRaw === "number" ? partsValueRaw : Number(partsValueRaw);
      const laborValue =
        typeof laborValueRaw === "number" ? laborValueRaw : Number(laborValueRaw);
      const noteRaw = parsed.value.payload.note;
      const note =
        typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : null;

      if (
        !Number.isFinite(partsValue) ||
        !Number.isFinite(laborValue) ||
        partsValue < 0 ||
        laborValue < 0
      ) {
        return NextResponse.json(
          { success: false, message: "Valores da OS invalidos." },
          { status: 400 }
        );
      }

      const { data: serviceOrder, error: serviceOrderError } = await supabase
        .from("lead_service_orders")
        .insert({
          lead_id: parsed.value.leadId,
          os_number: osNumber,
          parts_value: partsValue,
          labor_value: laborValue,
          note,
        })
        .select("id")
        .single();

      if (serviceOrderError) {
        console.error("Supabase lead_service_orders insert error", serviceOrderError);
        return NextResponse.json(
          { success: false, message: "Erro ao registrar OS do lead." },
          { status: 500 }
        );
      }

      const { os, parts_value, labor_value, note, ...restPayload } =
        parsed.value.payload;
      eventPayload = {
        ...restPayload,
        service_order_id: serviceOrder.id,
      };
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", parsed.value.leadId);
    if (updateError) {
      console.error("Supabase lead update error", updateError);
      return NextResponse.json(
        { success: false, message: "Erro ao atualizar lead." },
        { status: 500 }
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
        payload: eventPayload,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Supabase lead_events insert error", error);
      return NextResponse.json(
        {
          success: false,
          message: "Erro ao registrar aǧǜo no lead.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status !== 500) {
      return NextResponse.json(
        { success: false, message: "Nǜo autenticado." },
        { status }
      );
    }
    console.error("Unexpected lead event error", err);
    return NextResponse.json(
      { success: false, message: "Erro inesperado ao registrar aǧǜo." },
      { status: 500 }
    );
  }
}
