import { FiltersState, INITIAL_FILTERS } from "./filters";
import { Lead, Ticket } from "./domain";
import { mockTickets } from "./mockData";

export type LeadsPageResponse = {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
};

export type LeadsQueryParams = Partial<
  { page: number; pageSize: number } & FiltersState
>;

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

  const response = await fetch(`/api/leads?${searchParams.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Falha ao buscar leads do Supabase");
  }
  const data = (await response.json()) as LeadsPageResponse;
  return data;
}

export async function fetchTickets(): Promise<Ticket[]> {
  return mockTickets;
}
