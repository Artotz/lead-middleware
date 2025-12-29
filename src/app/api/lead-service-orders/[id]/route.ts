import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const parseMoney = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^\d,.-]/g, "");
  if (!normalized) return null;
  let numeric = normalized;
  if (numeric.includes(",") && numeric.includes(".")) {
    numeric = numeric.replace(/\./g, "").replace(",", ".");
  } else if (numeric.includes(",")) {
    numeric = numeric.replace(",", ".");
  }
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseId = (value: string | undefined) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Nao autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const safeId = parseId(id);
    if (!safeId) {
      return NextResponse.json({ message: "OS invalida." }, { status: 400 });
    }

    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        { message: "Body invalido (esperado JSON)." },
        { status: 400 },
      );
    }

    const partsValue = parseMoney((raw as any).parts_value);
    const laborValue = parseMoney((raw as any).labor_value);
    const noteRaw = (raw as any).note;
    const note =
      typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : null;

    if (partsValue === null || laborValue === null) {
      return NextResponse.json(
        { message: "Valores invalidos para OS." },
        { status: 400 },
      );
    }

    if (partsValue < 0 || laborValue < 0) {
      return NextResponse.json(
        { message: "Valores da OS devem ser >= 0." },
        { status: 400 },
      );
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("lead_service_orders")
      .update({
        parts_value: partsValue,
        labor_value: laborValue,
        note,
        updated_at: updatedAt,
      })
      .eq("id", safeId)
      .select("id,lead_id,parts_value,labor_value,note,updated_at")
      .single();

    if (error) {
      console.error("Supabase lead_service_orders update error", error);
      return NextResponse.json(
        { message: "Erro ao atualizar OS.", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      item: {
        id: data.id,
        leadId: data.lead_id,
        partsValue: Number(data.parts_value),
        laborValue: Number(data.labor_value),
        note: data.note ?? null,
        updatedAt: data.updated_at ?? updatedAt,
      },
    });
  } catch (err) {
    console.error("Unexpected OS update error", err);
    return NextResponse.json(
      { message: "Erro inesperado ao atualizar OS." },
      { status: 500 },
    );
  }
}
