import type { Lead, LeadCategory } from "@/lib/domain";

export const LEAD_SELECT_COLUMNS = [
  "id",
  "status",
  "regional",
  "estado",
  "city",
  "consultor",
  "nome_contato",
  "telefone",
  "created_by",
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
  "lead_pops",
  "lead_outros",
  "imported_at",
  "updated_at",
].join(",");

export type LeadRow = {
  id: number;
  status: string | null;
  regional: string | null;
  estado: string | null;
  city: string | null;
  consultor: string | null;
  nome_contato: string | null;
  telefone: string | null;
  created_by?: string | null;
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
  lead_pops: string | null;
  lead_outros: string | null;
  imported_at: string;
  updated_at: string | null;
};

export type LeadTypeColumn =
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
  | "lead_pops"
  | "lead_outros";

export const leadTypeOrder: { key: LeadTypeColumn; category: LeadCategory; label: string }[] =
  [
    { key: "lead_preventiva", category: "preventiva", label: "Preventiva" },
    { key: "lead_garantia_basica", category: "garantia_basica", label: "Garantia b sica" },
    {
      key: "lead_garantia_estendida",
      category: "garantia_estendida",
      label: "Garantia estendida",
    },
    {
      key: "lead_reforma_de_componentes",
      category: "reforma_componentes",
      label: "Reforma de componentes",
    },
    { key: "lead_lamina", category: "lamina", label: "Lƒmina" },
    { key: "lead_dentes", category: "dentes", label: "Dentes" },
    { key: "lead_rodante", category: "rodante", label: "Rodante" },
    { key: "lead_disponibilidade", category: "disponibilidade", label: "Disponibilidade" },
    { key: "lead_reconexao", category: "reconexao", label: "ReconexÆo" },
    {
      key: "lead_transferencia_de_aor",
      category: "transferencia_aor",
      label: "Transferˆncia de AOR",
    },
    { key: "lead_pops", category: "pops", label: "POPs" },
    { key: "lead_outros", category: "outros", label: "Outros" },
  ];

export const isLeadCategory = (value: unknown): value is LeadCategory => {
  if (typeof value !== "string") return false;
  if (value === "indefinido") return true;
  return leadTypeOrder.some((entry) => entry.category === value);
};

const isYes = (value: string | null) =>
  value?.trim().toUpperCase() === "SIM";

export const mapLeadRow = (row: LeadRow): Lead => {
  const foundTypes = leadTypeOrder
    .filter((entry) => isYes(row[entry.key] as string | null))
    .map((entry) => entry.category);

  const tipoLeadList: LeadCategory[] = foundTypes.length ? foundTypes : ["indefinido"];
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
  const status = row.status?.trim() ?? null;

  return {
    id: row.id,
    status,
    regional,
    estado,
    city: row.city,
    consultor: row.consultor,
    nomeContato: row.nome_contato,
    telefone: row.telefone,
    createdBy: row.created_by ?? null,
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
    leadPops: row.lead_pops,
    leadOutros: row.lead_outros,
    importedAt: row.imported_at,
    updatedAt: row.updated_at ?? row.imported_at,
    tipoLead,
    tipoLeadList,
  };
};
