import { NextResponse } from "next/server";
import { Ticket, TicketStatus } from "@/lib/domain";
import { SortOrder } from "@/lib/filters";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

type TicketRow = {
  ticket_id: string | null;
  number: string | null;
  title: string | null;
  status: number | string | null;
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

const mapStatus = (value: number | string | null): TicketStatus => {
  if (typeof value === "number") return statusByCode[value] ?? "desconhecido";
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

const mapTicketRow = (row: TicketRow): Ticket => {
  const statusCode =
    typeof row.status === "number"
      ? row.status
      : typeof row.status === "string" && /^\d+$/.test(row.status.trim())
      ? Number(row.status)
      : null;

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
    status: mapStatus(row.status),
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

const statusToCode: Partial<Record<TicketStatus, number | null>> = {
  aberto: 1,
  fechado: 2,
  descartado: 3,
  atribuido: 4,
  "contato realizado": 5,
  "fechado (sem OS)": 6,
  "fechado (com OS)": 7,
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
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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
      const statusText = /[\\s()]/.test(statusParam)
        ? `"${statusParam.replace(/"/g, '""')}"`
        : statusParam;
      if (statusCode === undefined) {
        query = query.eq("status", statusParam);
      } else if (statusCode === null) {
        query = query.or(`status.is.null,status.eq.${statusText}`);
      } else {
        query = query.or(`status.eq.${statusCode},status.eq.${statusText}`);
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
