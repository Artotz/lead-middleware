import { FiltersState, INITIAL_FILTERS } from "./filters";
import { Lead, Ticket } from "./domain";
import {
  INITIAL_TICKET_FILTERS,
  TicketFiltersState,
} from "./ticketFilters";
import type { MetricsRange, UserActionMetricsRow } from "./metrics";

export type LeadsPageResponse = {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
};

export type LeadsQueryParams = Partial<
  { page: number; pageSize: number } & FiltersState
>;

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
    sort = INITIAL_FILTERS.sort,
    groupByChassi = INITIAL_FILTERS.groupByChassi ?? false,
    groupByEmpresa = INITIAL_FILTERS.groupByEmpresa ?? false,
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
};

async function fetchMetrics(path: string, range: MetricsRange) {
  const response = await fetch(`${path}?range=${encodeURIComponent(range)}`, {
    cache: "no-store",
  });
  ensureAuthenticated(response);
  if (!response.ok) {
    throw new Error("Falha ao buscar mÇ¸tricas");
  }
  return (await response.json()) as MetricsApiResponse;
}

export async function fetchLeadMetrics(range: MetricsRange) {
  return fetchMetrics("/api/metrics/leads", range);
}

export async function fetchTicketMetrics(range: MetricsRange) {
  return fetchMetrics("/api/metrics/tickets", range);
}
