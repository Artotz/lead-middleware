import { NextResponse } from "next/server";
import { Ticket, TicketStatus } from "@/lib/domain";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

type TicketRow = {
  ticket_id: string | null;
  number: string | null;
  title: string | null;
  status: number | null;
  serial_number: string | null;
  advisor_first_name: string | null;
  advisor_last_name: string | null;
  advisor_email: string | null;
  advisor_racfid: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_organization: string | null;
  customer_account: string | null;
  team_name: string | null;
  updated_date: string | null;
  created_date: string | null;
  url: string | null;
};

const clean = (value: string | null) => value?.trim() || null;

const buildName = (first: string | null, last: string | null) => {
  const firstClean = clean(first);
  const lastClean = clean(last);
  if (firstClean && lastClean) {
    return `${firstClean} ${lastClean}`;
  }
  return firstClean ?? lastClean;
};

const mapStatus = (code: number | null): TicketStatus => {
  if (code === 1) return "aberto";
  if (code === 2) return "fechado";
  return "desconhecido";
};

const mapTicketRow = (row: TicketRow): Ticket => {
  const statusCode =
    typeof row.status === "number"
      ? row.status
      : row.status === null
        ? null
        : Number(row.status);

  const number = clean(row.number) ?? "Sem número";
  const title = clean(row.title) ?? "Sem título";
  const updatedAt = row.updated_date ?? row.created_date ?? null;
  const createdAt = row.created_date ?? row.updated_date ?? null;

  return {
    id: clean(row.ticket_id) ?? number,
    number,
    title,
    status: mapStatus(statusCode),
    statusCode,
    serialNumber: clean(row.serial_number),
    advisorName:
      buildName(row.advisor_first_name, row.advisor_last_name) ??
      clean(row.advisor_email) ??
      clean(row.advisor_racfid),
    customerName:
      clean(row.customer_organization) ??
      buildName(row.customer_first_name, row.customer_last_name) ??
      clean(row.customer_account),
    teamName: clean(row.team_name),
    updatedAt,
    createdAt,
    url: clean(row.url),
  };
};

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("tickets")
      .select(
        [
          "ticket_id",
          "number",
          "title",
          "status",
          "serial_number",
          "advisor_first_name",
          "advisor_last_name",
          "advisor_email",
          "advisor_racfid",
          "customer_first_name",
          "customer_last_name",
          "customer_organization",
          "customer_account",
          "team_name",
          "updated_date",
          "created_date",
          "url",
        ].join(","),
      )
      .order("updated_date", { ascending: false });

    if (error) {
      console.error("Supabase tickets error", error);
      return NextResponse.json(
        { message: "Erro ao buscar tickets", details: error.message },
        { status: 500 },
      );
    }

    const tickets = (data ?? []).map(mapTicketRow);

    return NextResponse.json(tickets);
  } catch (err) {
    console.error("Unexpected error fetching tickets", err);
    return NextResponse.json(
      { message: "Erro inesperado ao buscar tickets" },
      { status: 500 },
    );
  }
}
