import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseClient";
import { Lead, LeadCategory } from "@/lib/domain";

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
  const foundType =
    leadTypeOrder.find((entry) => isYes(row[entry.key] as string | null)) ??
    null;

  const tipoLead = foundType?.category ?? "indefinido";

  const horimetro =
    row.horimetro_atual_machine_list === null
      ? null
      : Number(row.horimetro_atual_machine_list);

  return {
    id: row.id,
    regional: row.regional,
    estado: row.estado,
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

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = getSupabaseServerClient();

    const { data, error, count } = await supabase
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
      .order("imported_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Supabase leads error", error);
      return NextResponse.json(
        { message: "Erro ao buscar leads", details: error.message },
        { status: 500 },
      );
    }

    const leads = (data ?? []).map(mapLeadRow);

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
