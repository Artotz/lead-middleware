import { NextResponse } from "next/server";
import { Ticket, TicketStatus } from "@/lib/domain";
import { SortOrder } from "@/lib/filters";
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
  const customerPersonName = buildName(
    row.customer_first_name,
    row.customer_last_name,
  );
  const customerOrganization = clean(row.customer_organization);
  const customerAccount = clean(row.customer_account);

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
    customerName: customerPersonName ?? customerOrganization ?? customerAccount,
    customerOrganization: customerOrganization ?? customerAccount,
    teamName: clean(row.team_name),
    updatedAt,
    createdAt,
    url: clean(row.url),
  };
};

const statusToCode: Record<TicketStatus, number | null> = {
  aberto: 1,
  fechado: 2,
  desconhecido: null,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
    const pageSize = Math.min(
      Math.max(Number(searchParams.get("pageSize") ?? "10"), 1),
      200
    );
    const search = (searchParams.get("search") ?? "").trim();
    const statusParam = searchParams.get("status") as TicketStatus | "" | null;
    const sortParam = searchParams.get("sort") as SortOrder | null;
    const sort: SortOrder = sortParam === "antigos" ? "antigos" : "recentes";
    const groupByRaw = (searchParams.get("groupBy") ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const groupByEmpresa = groupByRaw.includes("empresa");
    const groupByChassi = groupByRaw.includes("chassi");
    const consultorParam = (searchParams.get("consultor") ?? "").trim();
    const clienteParam = (searchParams.get("cliente") ?? "").trim();
    const equipeParam = (searchParams.get("equipe") ?? "").trim();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = await getSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    let query = supabase
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
        { count: "exact" }
      );

    if (groupByChassi) {
      query = query.not("serial_number", "is", null).neq("serial_number", "");
    }

    if (groupByEmpresa) {
      query = query
        .not("customer_organization", "is", null)
        .neq("customer_organization", "");
    }

    // Order respecting grouping -> empresa -> chassi -> updated_date
    const orders: { column: string; ascending: boolean }[] = [];
    if (groupByEmpresa) {
      orders.push({ column: "customer_organization", ascending: true });
    }
    if (groupByChassi) {
      orders.push({ column: "serial_number", ascending: true });
    }
    orders.push({ column: "updated_date", ascending: sort === "antigos" });

    orders.forEach((orderDef) => {
      query = query.order(orderDef.column, {
        ascending: orderDef.ascending,
        nullsFirst: true,
      });
    });

    query = query.range(from, to);

    if (statusParam) {
      const statusCode = statusToCode[statusParam];
      if (statusCode !== null) {
        query = query.eq("status", statusCode);
      }
    }

    if (search) {
      const safe = search.replace(/,/g, "\\,");
      const pattern = `%${safe}%`;
      query = query.or(
        [
          `number.ilike.${pattern}`,
          `title.ilike.${pattern}`,
          `serial_number.ilike.${pattern}`,
          `customer_organization.ilike.${pattern}`,
          `advisor_first_name.ilike.${pattern}`,
          `advisor_last_name.ilike.${pattern}`,
          `team_name.ilike.${pattern}`,
        ].join(",")
      );
    }

    if (consultorParam) {
      const safe = consultorParam.replace(/,/g, "\\,");
      const pattern = `%${safe}%`;
      query = query.or(
        [
          `advisor_first_name.ilike.${pattern}`,
          `advisor_last_name.ilike.${pattern}`,
          `advisor_email.ilike.${pattern}`,
          `advisor_racfid.ilike.${pattern}`,
        ].join(",")
      );
    }

    if (clienteParam) {
      const pattern = `%${clienteParam.replace(/,/g, "\\,")}%`;
      query = query.ilike("customer_organization", pattern);
    }

    if (equipeParam) {
      query = query.ilike("team_name", `%${equipeParam.replace(/,/g, "\\,")}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase tickets error", error);
      return NextResponse.json(
        { message: "Erro ao buscar tickets", details: error.message },
        { status: 500 }
      );
    }

    const tickets = ((data ?? []) as unknown as TicketRow[]).map(mapTicketRow);

    return NextResponse.json({
      items: tickets,
      total: count ?? tickets.length,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("Unexpected error fetching tickets", err);
    return NextResponse.json(
      { message: "Erro inesperado ao buscar tickets" },
      { status: 500 }
    );
  }
}
