import { NextResponse } from "next/server";
import { LeadCategory, LeadServiceOrder } from "@/lib/domain";
import { ESTADOS, REGIOES, SortOrder } from "@/lib/filters";
import {
  LEAD_SELECT_COLUMNS,
  LeadRow,
  leadTypeOrder,
  mapLeadRow,
} from "@/lib/leadData";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type LeadServiceOrderRow = {
  id: number;
  lead_id: number | null;
  os_number: string | null;
  parts_value: number | string | null;
  labor_value: number | string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  lead: LeadRow | null;
};

const normalizeNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed || "";
};

const mapServiceOrderRow = (row: LeadServiceOrderRow): LeadServiceOrder => {
  const leadRow = row.lead as LeadRow;
  return {
    id: row.id,
    leadId: row.lead_id ?? leadRow.id,
    osNumber: normalizeText(row.os_number) || "Sem OS",
    partsValue: normalizeNumber(row.parts_value),
    laborValue: normalizeNumber(row.labor_value),
    note: row.note ?? null,
    createdAt: row.created_at ?? row.updated_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    lead: mapLeadRow(leadRow),
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
    const pageSize = Math.min(
      Math.max(Number(searchParams.get("pageSize") ?? "10"), 1),
      100,
    );
    const search = (searchParams.get("search") ?? "").trim();
    const regiaoParam = searchParams.get("regiao");
    const estadoParam = searchParams.get("estado");
    const consultorParam = (searchParams.get("consultor") ?? "").trim();
    const tipoLeadParam = searchParams.get("tipoLead") as LeadCategory | null;
    const sortParam = searchParams.get("sort") as SortOrder | null;
    const sort: SortOrder = sortParam === "antigos" ? "antigos" : "recentes";
    const groupByRaw = (searchParams.get("groupBy") ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const groupByEmpresa = groupByRaw.includes("empresa");
    const groupByChassi = groupByRaw.includes("chassi");

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Nao autenticado" }, { status: 401 });
    }

    const regiao =
      regiaoParam && REGIOES.includes(regiaoParam as (typeof REGIOES)[number])
        ? (regiaoParam as (typeof REGIOES)[number])
        : null;
    const estado =
      estadoParam && ESTADOS.includes(estadoParam as (typeof ESTADOS)[number])
        ? (estadoParam as (typeof ESTADOS)[number])
        : null;

    const applyFilters = (baseQuery: any) => {
      let filtered = baseQuery;

      if (groupByChassi) {
        filtered = filtered
          .not("leads.chassi", "is", null)
          .neq("leads.chassi", "");
      }

      if (groupByEmpresa) {
        filtered = filtered
          .not("leads.cliente_base_enriquecida", "is", null)
          .neq("leads.cliente_base_enriquecida", "");
      }

      if (regiao) {
        filtered = filtered.eq("leads.regional", regiao);
      }

      if (estado) {
        filtered = filtered.eq("leads.estado", estado);
      }

      if (consultorParam) {
        const safe = consultorParam.replace(/,/g, "\\,");
        filtered = filtered.ilike("leads.consultor", `%${safe}%`);
      }

      if (tipoLeadParam) {
        const tipoLeadDef = leadTypeOrder.find(
          (entry) => entry.category === tipoLeadParam,
        );
        if (tipoLeadDef) {
          filtered = filtered.ilike(`leads.${tipoLeadDef.key}`, "%sim%");
        }
      }

      if (search) {
        const safeTerm = search.replace(/,/g, "\\,");
        const pattern = `%${safeTerm}%`;
        filtered = filtered.or(
          [
            `os_number.ilike.${pattern}`,
            `note.ilike.${pattern}`,
            `leads.chassi.ilike.${pattern}`,
            `leads.model_name.ilike.${pattern}`,
            `leads.city.ilike.${pattern}`,
            `leads.consultor.ilike.${pattern}`,
            `leads.regional.ilike.${pattern}`,
            `leads.estado.ilike.${pattern}`,
            `leads.last_called_group.ilike.${pattern}`,
          ].join(","),
        );
      }

      return filtered;
    };

    let query = supabase
      .from("lead_service_orders")
      .select(
        [
          "id",
          "lead_id",
          "os_number",
          "parts_value",
          "labor_value",
          "note",
          "created_at",
          "updated_at",
          `lead:leads!inner(${LEAD_SELECT_COLUMNS})`,
        ].join(","),
        { count: "exact" },
      )
      .not("leads.regional", "ilike", "filtros aplicados:%");

    query = applyFilters(query);

    const orders: { column: string; ascending: boolean; foreignTable?: string }[] =
      [];
    if (groupByEmpresa) {
      orders.push({
        column: "cliente_base_enriquecida",
        ascending: true,
        foreignTable: "leads",
      });
    }
    if (groupByChassi) {
      orders.push({ column: "chassi", ascending: true, foreignTable: "leads" });
    }
    orders.push({ column: "updated_at", ascending: sort === "antigos" });

    orders.forEach((orderDef) => {
      query = query.order(orderDef.column, {
        ascending: orderDef.ascending,
        nullsFirst: true,
        foreignTable: orderDef.foreignTable,
      });
    });

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase lead_service_orders error", error);
      return NextResponse.json(
        { message: "Erro ao buscar OS", details: error.message },
        { status: 500 },
      );
    }

    const items = ((data ?? []) as unknown as LeadServiceOrderRow[])
      .filter((row) => row.lead)
      .map(mapServiceOrderRow);

    return NextResponse.json({
      items,
      total: count ?? items.length,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("Unexpected error fetching OS", err);
    return NextResponse.json(
      { message: "Erro inesperado ao buscar OS" },
      { status: 500 },
    );
  }
}
