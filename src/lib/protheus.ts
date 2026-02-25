export const PROTHEUS_LEAD_TYPES = {
  preventiva: "MANUTENCAO PREVENTIVA",
  reconexao: "RECONEXAO",
} as const;

export type ProtheusLeadType = keyof typeof PROTHEUS_LEAD_TYPES;

export type ProtheusLeadRow = {
  a1_cgc: string | null;
  tipo_lead: string | null;
};

export type ProtheusSerieRow = {
  serie: string | null;
  tipo_lead: string | null;
};

export type ProtheusCounts = {
  preventivas: number;
  reconexoes: number;
  total: number;
};

export const buildEmptyProtheusCounts = (): ProtheusCounts => ({
  preventivas: 0,
  reconexoes: 0,
  total: 0,
});

const normalizeDocument = (value: string | null | undefined): string | null => {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length ? digits : null;
};

const formatCnpj = (digits: string) =>
  `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
    5,
    8,
  )}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;

const formatCpf = (digits: string) =>
  `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9,
  )}-${digits.slice(9, 11)}`;

export const buildDocumentVariants = (
  document: string | null | undefined,
): string[] => {
  const variants = new Set<string>();
  const raw = document?.trim();
  if (raw) variants.add(raw);

  const digits = normalizeDocument(document);
  if (digits) {
    variants.add(digits);
    if (digits.length === 14) {
      variants.add(formatCnpj(digits));
    }
    if (digits.length === 11) {
      variants.add(formatCpf(digits));
    }
  }

  return Array.from(variants);
};

const normalizeLeadType = (value: string | null | undefined) =>
  value?.trim().toUpperCase() ?? "";

const resolveCompanyId = (
  value: string | null | undefined,
  variantToCompany: Map<string, string>,
): string | null => {
  const variants = buildDocumentVariants(value);
  for (const variant of variants) {
    const companyId = variantToCompany.get(variant);
    if (companyId) return companyId;
  }
  return null;
};

export const buildProtheusCounts = (
  rows: ProtheusLeadRow[],
  variantToCompany: Map<string, string>,
): Map<string, ProtheusCounts> => {
  const map = new Map<string, ProtheusCounts>();

  rows.forEach((row) => {
    const companyId = resolveCompanyId(row.a1_cgc, variantToCompany);
    if (!companyId) return;
    const type = normalizeLeadType(row.tipo_lead);
    const entry = map.get(companyId) ?? buildEmptyProtheusCounts();

    if (type === PROTHEUS_LEAD_TYPES.preventiva) {
      entry.preventivas += 1;
      entry.total += 1;
    } else if (type === PROTHEUS_LEAD_TYPES.reconexao) {
      entry.reconexoes += 1;
      entry.total += 1;
    }

    map.set(companyId, entry);
  });

  return map;
};

export const mergeProtheusCounts = (
  base: Map<string, ProtheusCounts>,
  next: Map<string, ProtheusCounts>,
): Map<string, ProtheusCounts> => {
  const merged = new Map(base);
  next.forEach((value, key) => {
    const current = merged.get(key) ?? buildEmptyProtheusCounts();
    merged.set(key, {
      preventivas: current.preventivas + value.preventivas,
      reconexoes: current.reconexoes + value.reconexoes,
      total: current.total + value.total,
    });
  });
  return merged;
};

export const splitProtheusSeries = (rows: ProtheusSerieRow[]) => {
  const preventivas = new Set<string>();
  const reconexoes = new Set<string>();

  rows.forEach((row) => {
    const serie = row.serie?.trim();
    if (!serie) return;
    const type = normalizeLeadType(row.tipo_lead);
    if (type === PROTHEUS_LEAD_TYPES.preventiva) {
      preventivas.add(serie);
    } else if (type === PROTHEUS_LEAD_TYPES.reconexao) {
      reconexoes.add(serie);
    }
  });

  return {
    preventivas: Array.from(preventivas).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    ),
    reconexoes: Array.from(reconexoes).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    ),
  };
};
