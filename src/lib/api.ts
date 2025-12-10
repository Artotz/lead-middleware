import { Lead, Ticket } from "./domain";
import { mockTickets } from "./mockData";

export type LeadsPageResponse = {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
};

export async function fetchLeads(
  params?: Partial<{ page: number; pageSize: number }>,
): Promise<LeadsPageResponse> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const response = await fetch(
    `/api/leads?page=${page}&pageSize=${pageSize}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Falha ao buscar leads do Supabase");
  }
  const data = (await response.json()) as LeadsPageResponse;
  return data;
}

export async function fetchTickets(): Promise<Ticket[]> {
  return mockTickets;
}
