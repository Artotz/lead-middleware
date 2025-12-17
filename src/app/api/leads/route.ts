import { NextResponse } from "next/server";
import { Lead, LeadCategory } from "@/lib/domain";
import { ESTADOS, REGIOES, SortOrder } from "@/lib/filters";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

type LeadRow = {
  id: number;
  regional: string | null;
  estado: string | null;
  city: string | null;
  chassi: string | null;
  model_name: string | null;
  cliente_base_enriquecida: string | null;
  horimetro_atual_machine_list: number | string | null;
  last_called_group: string | null;
  lead_preventiva: string | null;
  lead_garantia_basica: string | null;
  lead_garantia_estendida: string | null;
  lead_reforma_de_componentes: string | null;
  lead_lamina: string | null;
  lead_dentes: string | null;
  lead_rodante: string | null;
  lead_disponibilidade: string | null;
  lead_reconexao: string | null;
  lead_transferencia_de_aor: string | null;
  imported_at: string;
};

const leadTypeOrder: { key: keyof LeadRow; category: LeadCategory; label: string }[] =
  [
    { key: "lead_preventiva", category: "preventiva", label: "Preventiva" },
    { key: "lead_garantia_basica", category: "garantia_basica", label: "Garantia básica" },
    { key: "lead_garantia_estendida", category: "garantia_estendida", label: "Garantia estendida" },
    { key: "lead_reforma_de_componentes", category: "reforma_componentes", label: "Reforma de componentes" },
    { key: "lead_lamina", category: "lamina", label: "Lâmina" },
    { key: "lead_dentes", category: "dentes", label: "Dentes" },
    { key: "lead_rodante", category: "rodante", label: "Rodante" },
    { key: "lead_disponibilidade", category: "disponibilidade", label: "Disponibilidade" },
    { key: "lead_reconexao", category: "reconexao", label: "Reconexão" },
    { key: "lead_transferencia_de_aor", category: "transferencia_aor", label: "Transferência de AOR" },
  ];

const isYes = (value: string | null) =>
  value?.trim().toUpperCase() === "SIM";

const mapLeadRow = (row: LeadRow): Lead => {
  const foundTypes = leadTypeOrder
    .filter((entry) => isYes(row[entry.key] as string | null))
    .map((entry) => entry.category);

  const tipoLeadList: LeadCategory[] = foundTypes.length
    ? foundTypes
    : ["indefinido"];
  const tipoLead: LeadCategory = tipoLeadList[0];

  const horimetro =
    row.horimetro_atual_machine_list === null
      ? null
      : Number(row.horimetro_atual_machine_list);

  const regionalRaw = row.regional?.trim() ?? null;
  const isControlRow =
    regionalRaw?.toLowerCase().startsWith("filtros aplicados:") ?? false;
  const regional = isControlRow ? null : regionalRaw;

  const estado = row.estado?.trim() ?? null;

  return {
    id: row.id,
    regional,
    estado,
    city: row.city,
    chassi: row.chassi,
    modelName: row.model_name,
    clienteBaseEnriquecida: row.cliente_base_enriquecida,
    horimetroAtualMachineList: Number.isNaN(horimetro) ? null : horimetro,
    lastCalledGroup: row.last_called_group,
    leadPreventiva: row.lead_preventiva,
    leadGarantiaBasica: row.lead_garantia_basica,
    leadGarantiaEstendida: row.lead_garantia_estendida,
    leadReformaDeComponentes: row.lead_reforma_de_componentes,
    leadLamina: row.lead_lamina,
    leadDentes: row.lead_dentes,
    leadRodante: row.lead_rodante,
    leadDisponibilidade: row.lead_disponibilidade,
    leadReconexao: row.lead_reconexao,
    leadTransferenciaDeAor: row.lead_transferencia_de_aor,
    importedAt: row.imported_at,
    tipoLead,
    tipoLeadList,
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
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
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
        [
          "id",
          "regional",
          "estado",
          "city",
          "chassi",
          "model_name",
          "cliente_base_enriquecida",
          "horimetro_atual_machine_list",
          "last_called_group",
          "lead_preventiva",
          "lead_garantia_basica",
          "lead_garantia_estendida",
          "lead_reforma_de_componentes",
          "lead_lamina",
          "lead_dentes",
          "lead_rodante",
          "lead_disponibilidade",
          "lead_reconexao",
          "lead_transferencia_de_aor",
          "imported_at",
        ].join(","),
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
    orders.push({ column: "imported_at", ascending });

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
