import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/currentUser";
import { validateTicketEventInput } from "@/lib/events";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { TicketStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

const STATUS_CODE_BY_STATUS: Record<TicketStatus, number | null> = {
  aberto: 1,
  fechado: 2,
  descartado: 3,
  atribuido: 4,
  "contato realizado": 5,
  "fechado (sem OS)": 6,
  "fechado (com OS)": 7,
  desconhecido: null,
};

const normalizeStatusText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const statusByText: Record<string, TicketStatus> = {
  aberto: "aberto",
  fechado: "fechado",
  descartado: "descartado",
  atribuido: "atribuido",
  "contato realizado": "contato realizado",
  "fechado (sem os)": "fechado (sem OS)",
  "fechado sem os": "fechado (sem OS)",
  "fechado (com os)": "fechado (com OS)",
  "fechado com os": "fechado (com OS)",
};

const statusByCode: Record<number, TicketStatus> = {
  1: "aberto",
  2: "fechado",
  3: "descartado",
  4: "atribuido",
  5: "contato realizado",
  6: "fechado (sem OS)",
  7: "fechado (com OS)",
};

const normalizeTicketStatus = (value: unknown): TicketStatus => {
  if (typeof value === "number") {
    return statusByCode[value] ?? "desconhecido";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "desconhecido";
    if (/^\d+$/.test(trimmed)) {
      const code = Number(trimmed);
      return statusByCode[code] ?? "desconhecido";
    }
    return statusByText[normalizeStatusText(trimmed)] ?? "desconhecido";
  }
  return "desconhecido";
};

const shouldUseNumericStatus = (value: unknown) =>
  typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value.trim()));

const buildAssigneeCandidates = (
  assignee: string,
  user: { id: string; email: string; name: string },
) => {
  const normalizedAssignee = assignee.trim().toLowerCase();
  const candidates = [user.id, user.email, user.name]
    .filter(Boolean)
    .map((item) => item.trim().toLowerCase());
  return { normalizedAssignee, candidates };
};

const isAssignedToUser = (
  assignee: string,
  user: { id: string; email: string; name: string },
) => {
  const { normalizedAssignee, candidates } = buildAssigneeCandidates(
    assignee,
    user,
  );
  if (!normalizedAssignee) return false;
  return candidates.some(
    (candidate) =>
      normalizedAssignee === candidate || normalizedAssignee.includes(candidate),
  );
};

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

    const supabase = getSupabaseAdminClient();
    const { data: ticketRows, error: ticketError } = await supabase
      .from("tickets")
      .select("status")
      .eq("ticket_id", parsed.value.ticketId)
      .limit(1);

    if (ticketError) {
      console.error("Supabase ticket lookup error", ticketError);
      return NextResponse.json(
        { success: false, message: "Erro ao buscar ticket.", details: ticketError.message },
        { status: 500 },
      );
    }

    const ticketRow = ticketRows?.[0];
    if (!ticketRow) {
      return NextResponse.json(
        { success: false, message: "Ticket nao encontrado." },
        { status: 404 },
      );
    }

    const currentStatus = normalizeTicketStatus((ticketRow as { status?: unknown }).status);
    const useNumericStatus = shouldUseNumericStatus((ticketRow as { status?: unknown }).status);

    if (parsed.value.action === "register_contact") {
      if (currentStatus !== "atribuido") {
        return NextResponse.json(
          {
            success: false,
            message: "Tentativa de contato permitida apenas para tickets atribuidos.",
          },
          { status: 400 },
        );
      }

      const { data: assignEvents, error: assignError } = await supabase
        .from("ticket_events")
        .select("payload, occurred_at")
        .eq("ticket_id", parsed.value.ticketId)
        .eq("action", "assign")
        .order("occurred_at", { ascending: false })
        .limit(1);

      if (assignError) {
        console.error("Supabase ticket assign lookup error", assignError);
        return NextResponse.json(
          { success: false, message: "Erro ao validar atribuicao.", details: assignError.message },
          { status: 500 },
        );
      }

      const lastAssign = assignEvents?.[0];
      const assignee =
        lastAssign && typeof (lastAssign as any).payload?.assignee === "string"
          ? String((lastAssign as any).payload.assignee)
          : "";
      const assigneeCheck = buildAssigneeCandidates(assignee, user);
      const assignedToUser = isAssignedToUser(assignee, user);
      console.log("ticket assign check", {
        ticketId: parsed.value.ticketId,
        currentStatus,
        lastAssign,
        assignee: assigneeCheck.normalizedAssignee,
        candidates: assigneeCheck.candidates,
        assignedToUser,
      });
      if (!assignee || !assignedToUser) {
        return NextResponse.json(
          {
            success: false,
            message: "Ticket nao esta atribuido ao usuario atual.",
          },
          { status: 400 },
        );
      }
    }

    const nextStatusByAction: Partial<Record<string, TicketStatus>> = {
      discard: "descartado",
      assign: "atribuido",
      register_contact: "contato realizado",
      close: "fechado",
      close_without_os: "fechado (sem OS)",
      close_with_os: "fechado (com OS)",
      reopen: "aberto",
    };

    const nextStatus = nextStatusByAction[parsed.value.action];
    if (nextStatus) {
      const primaryValue = useNumericStatus
        ? STATUS_CODE_BY_STATUS[nextStatus]
        : nextStatus;
      const fallbackValue = useNumericStatus
        ? nextStatus
        : STATUS_CODE_BY_STATUS[nextStatus];

      const updateStatus = async (status: number | string | null) =>
        supabase
          .from("tickets")
          .update({ status, updated_date: new Date().toISOString() })
          .eq("ticket_id", parsed.value.ticketId);

      const { error: updateError } = await updateStatus(primaryValue);
      if (updateError) {
        const shouldRetry =
          fallbackValue !== undefined &&
          fallbackValue !== null &&
          fallbackValue !== primaryValue;
        if (shouldRetry) {
          const { error: retryError } = await updateStatus(fallbackValue);
          if (retryError) {
            console.error("Supabase ticket update error", retryError);
            return NextResponse.json(
              {
                success: false,
                message: "Erro ao atualizar ticket.",
                details: retryError.message,
              },
              { status: 500 },
            );
          }
        } else {
          console.error("Supabase ticket update error", updateError);
          return NextResponse.json(
            {
              success: false,
              message: "Erro ao atualizar ticket.",
              details: updateError.message,
            },
            { status: 500 },
          );
        }
      }
    }
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
