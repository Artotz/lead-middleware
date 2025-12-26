import { NextResponse } from "next/server";
import { LeadCategory } from "@/lib/domain";
import { ESTADOS, REGIOES, SortOrder } from "@/lib/filters";
import {
  LEAD_SELECT_COLUMNS,
  LeadRow,
  leadTypeOrder,
  mapLeadRow,
  isLeadCategory,
} from "@/lib/leadData";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

type LeadInsertRow = Omit<LeadRow, "id">;

type CreateLeadBody = {
  status?: unknown;
  regional?: unknown;
  estado?: unknown;
  city?: unknown;
  consultor?: unknown;
  nomeContato?: unknown;
  telefone?: unknown;
  chassi?: unknown;
  modelName?: unknown;
  clienteBaseEnriquecida?: unknown;
  horimetroAtualMachineList?: unknown;
  tipoLead?: unknown;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") return false;
  return Object.getPrototypeOf(value) === Object.prototype;
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 },
      );
    }

    const regiao =
      regiaoParam && REGIOES.includes(regiaoParam as (typeof REGIOES)[number])
        ? (regiaoParam as (typeof REGIOES)[number])
        : null;
    const estado =
      estadoParam && ESTADOS.includes(estadoParam as (typeof ESTADOS)[number])
        ? (estadoParam as (typeof ESTADOS)[number])
        : null;

    let query = supabase
      .from("leads")
      .select(
        LEAD_SELECT_COLUMNS,
        { count: "exact" },
      )
      .not("regional", "ilike", "filtros aplicados:%");

    if (groupByChassi) {
      query = query.not("chassi", "is", null).neq("chassi", "");
    }

    if (groupByEmpresa) {
      query = query
        .not("cliente_base_enriquecida", "is", null)
        .neq("cliente_base_enriquecida", "");
    }

    if (regiao) {
      query = query.eq("regional", regiao);
    }

    if (estado) {
      query = query.eq("estado", estado);
    }

    if (consultorParam) {
      const safe = consultorParam.replace(/,/g, "\\,");
      query = query.ilike("consultor", `%${safe}%`);
    }

    if (tipoLeadParam) {
      const tipoLeadDef = leadTypeOrder.find(
        (entry) => entry.category === tipoLeadParam,
      );
      if (tipoLeadDef) {
        query = query.ilike(tipoLeadDef.key, "%sim%");
      }
    }

    if (search) {
      const safeTerm = search.replace(/,/g, "\\,");
      const pattern = `%${safeTerm}%`;
      query = query.or(
        [
          `chassi.ilike.${pattern}`,
          `model_name.ilike.${pattern}`,
          `city.ilike.${pattern}`,
          `consultor.ilike.${pattern}`,
          `regional.ilike.${pattern}`,
          `estado.ilike.${pattern}`,
          `last_called_group.ilike.${pattern}`,
        ].join(","),
      );
    }

    const ascending = sort === "antigos";

    const orders: { column: string; ascending: boolean }[] = [];
    if (groupByEmpresa) orders.push({ column: "cliente_base_enriquecida", ascending: true });
    if (groupByChassi) orders.push({ column: "chassi", ascending: true });
    orders.push({ column: "updated_at", ascending });

    orders.forEach((orderDef) => {
      query = query.order(orderDef.column, { ascending: orderDef.ascending, nullsFirst: true });
    });

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Supabase leads error", error);
      return NextResponse.json(
        { message: "Erro ao buscar leads", details: error.message },
        { status: 500 },
      );
    }

    const cleanedRows = ((data ?? []) as unknown as LeadRow[]).filter((row) => {
      const regionalNormalized = row.regional?.trim().toLowerCase() ?? "";
      return !regionalNormalized.startsWith("filtros aplicados:");
    });

    const leads = cleanedRows.map(mapLeadRow);

    return NextResponse.json({
      items: leads,
      total: count ?? leads.length,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("Unexpected error", err);
    return NextResponse.json(
      { message: "Erro inesperado ao buscar leads" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Nao autenticado" }, { status: 401 });
    }

    const raw = (await request.json().catch(() => null)) as unknown;
    if (!isPlainObject(raw)) {
      return NextResponse.json(
        { message: "Body invalido (esperado JSON object)" },
        { status: 400 },
      );
    }

    const body = raw as CreateLeadBody;

    const regional = normalizeText(body.regional);
    const estado = normalizeText(body.estado);
    const city = normalizeText(body.city);
    const consultor = normalizeText(body.consultor);
    const nomeContato = normalizeText(body.nomeContato);
    const telefone = normalizeText(body.telefone);
    const chassi = normalizeText(body.chassi);
    const modelName = normalizeText(body.modelName);
    const clienteBaseEnriquecida = normalizeText(body.clienteBaseEnriquecida);
    const status = normalizeText(body.status);
    const horimetro = normalizeNumber(body.horimetroAtualMachineList);
    const tipoLead = isLeadCategory(body.tipoLead) ? body.tipoLead : null;

    if (regional && !REGIOES.includes(regional as (typeof REGIOES)[number])) {
      return NextResponse.json(
        { message: "Regional invalida" },
        { status: 400 },
      );
    }

    if (estado && !ESTADOS.includes(estado as (typeof ESTADOS)[number])) {
      return NextResponse.json({ message: "Estado invalido" }, { status: 400 });
    }

    const insertRow: LeadInsertRow = {
      status,
      regional,
      estado,
      city,
      consultor,
      nome_contato: nomeContato,
      telefone,
      chassi,
      model_name: modelName,
      cliente_base_enriquecida: clienteBaseEnriquecida,
      horimetro_atual_machine_list: horimetro,
      last_called_group: null,
      lead_preventiva: null,
      lead_garantia_basica: null,
      lead_garantia_estendida: null,
      lead_reforma_de_componentes: null,
      lead_lamina: null,
      lead_dentes: null,
      lead_rodante: null,
      lead_disponibilidade: null,
      lead_reconexao: null,
      lead_transferencia_de_aor: null,
      lead_pops: null,
      lead_outros: null,
      imported_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (tipoLead && tipoLead !== "indefinido") {
      const tipoDef = leadTypeOrder.find((entry) => entry.category === tipoLead);
      if (tipoDef) {
        insertRow[tipoDef.key] = "SIM";
      }
    }

    const { data, error } = await supabase
      .from("leads")
      .insert(insertRow)
      .select(LEAD_SELECT_COLUMNS)
      .single();

    if (error) {
      console.error("Supabase lead insert error", error);
      return NextResponse.json(
        { message: "Erro ao criar lead", details: error.message },
        { status: 500 },
      );
    }

    const lead = mapLeadRow(data as unknown as LeadRow);
    return NextResponse.json({ item: lead });
  } catch (err) {
    console.error("Unexpected lead insert error", err);
    return NextResponse.json(
      { message: "Erro inesperado ao criar lead" },
      { status: 500 },
    );
  }
}


