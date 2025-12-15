import { FiltersState, INITIAL_FILTERS } from "./filters";
import { Lead, Ticket } from "./domain";
import {
  INITIAL_TICKET_FILTERS,
  TicketFiltersState,
} from "./ticketFilters";

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
  if (!response.ok) {
    throw new Error("Falha ao buscar tickets do Supabase");
  }
  const data = (await response.json()) as TicketsPageResponse;
  return data;
}

export async function fetchTicketOptions() {
  const response = await fetch("/api/tickets/options", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Falha ao buscar opções de tickets");
  }
  return (await response.json()) as TicketFilterOptions;
}
