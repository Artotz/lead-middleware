import { Lead, Ticket } from "./domain";
import { mockLeads, mockTickets } from "./mockData";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchLeads(): Promise<Lead[]> {
  await delay(300);
  return mockLeads;
}

export async function fetchTickets(): Promise<Ticket[]> {
  await delay(300);
  return mockTickets;
}
