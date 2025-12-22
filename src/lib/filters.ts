import { LeadCategory } from "./domain";

export const REGIOES = ["R1", "R2", "R3"] as const;

export const ESTADOS = ["AL", "BA", "CE", "PB", "PE", "PI", "RN", "SE"] as const;

export type Regiao = (typeof REGIOES)[number];
export type Estado = (typeof ESTADOS)[number];

export type SortOrder = "recentes" | "antigos";

export type FiltersState = {
  search: string;
  regiao: Regiao | "";
  estado: Estado | "";
  tipoLead: LeadCategory | "";
  sort: SortOrder;
  groupByEmpresa?: boolean;
  groupByChassi?: boolean;
};

export const INITIAL_FILTERS: FiltersState = {
  search: "",
  regiao: "",
  estado: "",
  tipoLead: "",
  sort: "recentes",
  groupByEmpresa: false,
  groupByChassi: false,
};

export const REGIAO_FILTER_QUERIES: Record<Regiao, string> = {
  R1: "REGIONAL = 'R1'",
  R2: "REGIONAL = 'R2'",
  R3: "REGIONAL = 'R3'",
};

export const ESTADO_FILTER_QUERIES: Record<Estado, string> = {
  AL: "ESTADO = 'AL'",
  BA: "ESTADO = 'BA'",
  CE: "ESTADO = 'CE'",
  PB: "ESTADO = 'PB'",
  PE: "ESTADO = 'PE'",
  PI: "ESTADO = 'PI'",
  RN: "ESTADO = 'RN'",
  SE: "ESTADO = 'SE'",
};

// Query "global" para todas as regioes, se precisar
export const ALL_REGIOES_QUERY = "REGIONAL IN ('R1', 'R2', 'R3')";

// Exemplo de helper para montar WHERE dinamico
export function buildWhereByRegiaoEstado(
  regiao?: Regiao,
  estado?: Estado,
): string {
  const clauses: string[] = [];
  if (regiao) {
    clauses.push(`REGIONAL = '${regiao}'`);
  }
  if (estado) {
    clauses.push(`ESTADO = '${estado}'`);
  }
  if (!clauses.length) return "1 = 1";
  return clauses.join(" AND ");
}

export const LEAD_TYPES = [
  "preventiva",
  "garantia_basica",
  "garantia_estendida",
  "reforma_componentes",
  "lamina",
  "dentes",
  "rodante",
  "disponibilidade",
  "reconexao",
  "transferencia_aor",
  "pops",
  "outros",
  "indefinido",
] as const satisfies LeadCategory[];

/**
 * Consultas de filtro padrao:
 *
 * Regiao:
 * - Todas as regioes: REGIONAL IN ('R1', 'R2', 'R3')
 * - R1: REGIONAL = 'R1'
 * - R2: REGIONAL = 'R2'
 * - R3: REGIONAL = 'R3'
 *
 * Estado:
 * - AL: ESTADO = 'AL'
 * - BA: ESTADO = 'BA'
 * - CE: ESTADO = 'CE'
 * - PB: ESTADO = 'PB'
 * - PE: ESTADO = 'PE'
 * - PI: ESTADO = 'PI'
 * - RN: ESTADO = 'RN'
 * - SE: ESTADO = 'SE'
 */
