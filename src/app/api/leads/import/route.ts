import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type LeadImportItem = {
  status?: unknown;
  regional?: unknown;
  estado?: unknown;
  city?: unknown;
  consultor?: unknown;
  chassi?: unknown;
  modelName?: unknown;
  clienteBaseEnriquecida?: unknown;
  horimetroAtualMachineList?: unknown;
  leadTipos?: unknown;
};

type LeadInsertRow = {
  status: string | null;
  regional: string | null;
  estado: string | null;
  city: string | null;
  consultor: string | null;
  created_by: string | null;
  chassi: string | null;
  model_name: string | null;
  cliente_base_enriquecida: string | null;
  horimetro_atual_machine_list: number | null;
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
  // imported_at: string;
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

const normalizeFlag = (value: unknown): string | null => {
  if (typeof value === "boolean") return value ? "SIM" : "NAO";
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.toUpperCase() : null;
};

const leadTypeFlagMap = {
  preventiva: "lead_preventiva",
  garantia_basica: "lead_garantia_basica",
  garantia_estendida: "lead_garantia_estendida",
  reforma_componentes: "lead_reforma_de_componentes",
  lamina: "lead_lamina",
  dentes: "lead_dentes",
  rodante: "lead_rodante",
  disponibilidade: "lead_disponibilidade",
  reconexao: "lead_reconexao",
  transferencia_aor: "lead_transferencia_de_aor",
  pops: "lead_pops",
  outros: "lead_outros",
} as const;

const parseLeadTipos = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item)))
      .filter((item) => item);
  }
  if (typeof value === "string") {
    return value
      .split(/[;,|]/)
      .map((item) => item.trim())
      .filter((item) => item);
  }
  return [];
};

const buildLeadFlags = (item: LeadImportItem) => {
  const tipos = parseLeadTipos(item.leadTipos);
  if (tipos.length) {
    const selected = new Set(tipos);
    return Object.fromEntries(
      Object.entries(leadTypeFlagMap).map(([key, column]) => [
        column,
        selected.has(key) ? "SIM" : "NÃO",
      ])
    ) as Pick<
      LeadInsertRow,
      | "lead_preventiva"
      | "lead_garantia_basica"
      | "lead_garantia_estendida"
      | "lead_reforma_de_componentes"
      | "lead_lamina"
      | "lead_dentes"
      | "lead_rodante"
      | "lead_disponibilidade"
      | "lead_reconexao"
      | "lead_transferencia_de_aor"
    >;
  }

  const flags = {
    lead_preventiva: normalizeFlag((item as any).leadPreventiva),
    lead_garantia_basica: normalizeFlag((item as any).leadGarantiaBasica),
    lead_garantia_estendida: normalizeFlag((item as any).leadGarantiaEstendida),
    lead_reforma_de_componentes: normalizeFlag(
      (item as any).leadReformaDeComponentes
    ),
    lead_lamina: normalizeFlag((item as any).leadLamina),
    lead_dentes: normalizeFlag((item as any).leadDentes),
    lead_rodante: normalizeFlag((item as any).leadRodante),
    lead_disponibilidade: normalizeFlag((item as any).leadDisponibilidade),
    lead_reconexao: normalizeFlag((item as any).leadReconexao),
    lead_transferencia_de_aor: normalizeFlag(
      (item as any).leadTransferenciaDeAor
    ),
  };

  return flags;
};

const hasAnyValue = (item: LeadImportItem) => {
  return Object.values(item).some((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "boolean") return true;
    return true;
  });
};

const mapImportItem = (
  item: LeadImportItem,
  createdBy: string | null
): LeadInsertRow => ({
  status: "novo",
  regional: normalizeText(item.regional),
  estado: normalizeText(item.estado),
  city: normalizeText(item.city),
  consultor: normalizeText(item.consultor),
  created_by: createdBy,
  chassi: normalizeText(item.chassi),
  model_name: normalizeText(item.modelName),
  cliente_base_enriquecida: normalizeText(item.clienteBaseEnriquecida),
  horimetro_atual_machine_list: normalizeNumber(item.horimetroAtualMachineList),
  last_called_group: null,
  ...buildLeadFlags(item),
  // imported_at: new Date().toISOString(),
});

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
        { status: 400 }
      );
    }

    const items = (raw as { items?: unknown }).items;
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { message: "items invalido (esperado array)" },
        { status: 400 }
      );
    }

    const createdBy = user.email ?? user.id ?? null;

    const mapped = items
      .filter(
        (item) => isPlainObject(item) && hasAnyValue(item as LeadImportItem)
      )
      .map((item) => mapImportItem(item as LeadImportItem, createdBy));

    if (!mapped.length) {
      return NextResponse.json(
        { message: "Nenhuma linha valida para importar." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("leads")
      .insert(mapped)
      .select("id");

    if (error) {
      console.error("Supabase lead import error", error);
      return NextResponse.json(
        { message: "Erro ao importar leads", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length ?? mapped.length,
    });
  } catch (err) {
    console.error("Unexpected lead import error", err);
    return NextResponse.json(
      { message: "Erro inesperado ao importar leads" },
      { status: 500 }
    );
  }
}
