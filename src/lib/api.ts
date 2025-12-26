import { FiltersState, INITIAL_FILTERS } from "./filters";
import { Lead, LeadCategory, Ticket } from "./domain";
import {
  INITIAL_TICKET_FILTERS,
  TicketFiltersState,
} from "./ticketFilters";
import type {
  DailyActionMetricsRow,
  MetricsRange,
  UserActionEventRow,
  UserActionMetricsRow,
  UserIdentity,
} from "./metrics";

export type LeadsPageResponse = {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  statusOptions?: string[];
};

export type LeadsQueryParams = Partial<
  { page: number; pageSize: number; consultor: string } & FiltersState
>;

export type CreateLeadInput = {
  status?: string | null;
  regional?: string | null;
  estado?: string | null;
  city?: string | null;
  consultor?: string | null;
  nomeContato?: string | null;
  telefone?: string | null;
  chassi?: string | null;
  modelName?: string | null;
  clienteBaseEnriquecida?: string | null;
  horimetroAtualMachineList?: number | null;
  tipoLead?: LeadCategory | null;
};

export type CreateLeadResponse = {
  item: Lead;
};

export type LeadResponse = {
  success: true;
  item: Lead;
};

export type LeadImportItem = {
  status?: string | null;
  regional?: string | null;
  estado?: string | null;
  city?: string | null;
  consultor?: string | null;
  nomeContato?: string | null;
  telefone?: string | null;
  chassi?: string | null;
  clienteBaseEnriquecida?: string | null;
  horimetroAtualMachineList?: number | string | null;
  leadTipos?: string[] | string | null;
};

export type LeadImportResponse = {
  success: true;
  inserted: number;
};

export type TicketsPageResponse = {
  items: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  options?: TicketFilterOptions;
};

export type TicketsQueryParams = Partial<
  { page: number; pageSize: number } & TicketFiltersState
>;

export type TicketFilterOptions = {
  consultores: string[];
  clientes: string[];
  equipes: string[];
};

const ensureAuthenticated = (response: Response) => {
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login?message=Faça login para continuar.";
    }
    throw new Error("auth_required");
  }
};

export async function fetchLeads(
  params?: LeadsQueryParams,
): Promise<LeadsPageResponse> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;

  const {
    search = INITIAL_FILTERS.search,
    regiao = INITIAL_FILTERS.regiao,
    estado = INITIAL_FILTERS.estado,
    tipoLead = INITIAL_FILTERS.tipoLead,
    status = INITIAL_FILTERS.status,
    sort = INITIAL_FILTERS.sort,
    groupByChassi = INITIAL_FILTERS.groupByChassi ?? false,
    groupByEmpresa = INITIAL_FILTERS.groupByEmpresa ?? false,
    consultor = "",
  } = params ?? {};

  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort,
  });

  if (search) searchParams.set("search", search);
  if (regiao) searchParams.set("regiao", regiao);
  if (estado) searchParams.set("estado", estado);
  if (tipoLead) searchParams.set("tipoLead", tipoLead);
  if (status) searchParams.set("status", status);
  if (consultor) searchParams.set("consultor", consultor);
  const groupBy: string[] = [];
  if (groupByEmpresa) groupBy.push("empresa");
  if (groupByChassi) groupBy.push("chassi");
  if (groupBy.length) searchParams.set("groupBy", groupBy.join(","));

  const response = await fetch(`/api/leads?${searchParams.toString()}`, {
    cache: "no-store",
  });
  ensureAuthenticated(response);
  if (!response.ok) {
    throw new Error("Falha ao buscar leads do Supabase");
  }
  const data = (await response.json()) as LeadsPageResponse;
  return data;
}

export async function createLead(input: CreateLeadInput): Promise<CreateLeadResponse> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  ensureAuthenticated(response);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Falha ao criar lead");
  }
  return (await response.json()) as CreateLeadResponse;
}

export async function importLeads(
  items: LeadImportItem[],
): Promise<LeadImportResponse> {
  const response = await fetch("/api/leads/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  ensureAuthenticated(response);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Falha ao importar leads");
  }
  return (await response.json()) as LeadImportResponse;
}

export async function fetchTickets(
  params?: TicketsQueryParams,
): Promise<TicketsPageResponse> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;

  const {
    search = INITIAL_TICKET_FILTERS.search,
    status = INITIAL_TICKET_FILTERS.status,
    sort = INITIAL_TICKET_FILTERS.sort,
    groupByEmpresa = INITIAL_TICKET_FILTERS.groupByEmpresa,
    groupByChassi = INITIAL_TICKET_FILTERS.groupByChassi,
    consultor = INITIAL_TICKET_FILTERS.consultor,
    cliente = INITIAL_TICKET_FILTERS.cliente,
    equipe = INITIAL_TICKET_FILTERS.equipe,
  } = params ?? {};

  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort,
  });

  if (search) searchParams.set("search", search);
  if (status) searchParams.set("status", status);
  if (consultor) searchParams.set("consultor", consultor);
  if (cliente) searchParams.set("cliente", cliente);
  if (equipe) searchParams.set("equipe", equipe);
  const groupBy: string[] = [];
  if (groupByEmpresa) groupBy.push("empresa");
  if (groupByChassi) groupBy.push("chassi");
  if (groupBy.length) searchParams.set("groupBy", groupBy.join(","));

  const response = await fetch(`/api/tickets?${searchParams.toString()}`, {
    cache: "no-store",
  });
  ensureAuthenticated(response);
  if (!response.ok) {
    throw new Error("Falha ao buscar tickets do Supabase");
  }
  const data = (await response.json()) as TicketsPageResponse;
  return data;
}

export async function fetchTicketOptions() {
  const response = await fetch("/api/tickets/options", { cache: "no-store" });
  ensureAuthenticated(response);
  if (!response.ok) {
    throw new Error("Falha ao buscar opВリes de tickets");
  }
  return (await response.json()) as TicketFilterOptions;
}

export type MetricsApiResponse = {
  success: true;
  range: MetricsRange;
  items: UserActionMetricsRow[];
  daily: DailyActionMetricsRow[];
  users: UserIdentity[];
  events: UserActionEventRow[];
};

type FetchMetricsOptions = {
  includeUsers?: boolean;
};

async function fetchMetrics(
  path: string,
  range: MetricsRange,
  options?: FetchMetricsOptions,
) {
  const includeUsers = options?.includeUsers ?? true;
  const searchParams = new URLSearchParams({
    range: String(range),
    includeUsers: includeUsers ? "1" : "0",
  });
  const response = await fetch(`${path}?${searchParams.toString()}`, {
    cache: "no-store",
  });
  ensureAuthenticated(response);
  if (!response.ok) {
    throw new Error("Falha ao buscar mÇ¸tricas");
  }
  return (await response.json()) as MetricsApiResponse;
}

export async function fetchLeadMetrics(
  range: MetricsRange,
  options?: FetchMetricsOptions,
) {
  return fetchMetrics("/api/metrics/leads", range, options);
}

export async function fetchLeadById(leadId: number): Promise<Lead> {
  const response = await fetch(`/api/leads/${encodeURIComponent(String(leadId))}`, {
    cache: "no-store",
  });
  ensureAuthenticated(response);
  if (!response.ok) {
    throw new Error("Falha ao buscar lead");
  }
  const data = (await response.json()) as LeadResponse;
  return data.item;
}

export async function fetchTicketMetrics(
  range: MetricsRange,
  options?: FetchMetricsOptions,
) {
  return fetchMetrics("/api/metrics/tickets", range, options);
}
