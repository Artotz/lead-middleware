import { Ticket } from "./domain";

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const mockTickets: Ticket[] = [
  {
    id: "ticket-1",
    number: "EXT-4321",
    title: "Ticket de exemplo (mock)",
    status: "aberto",
    statusCode: 1,
    serialNumber: "310L-ABC123",
    advisorName: "Consultor 1",
    customerName: "Cliente A",
    teamName: "Equipe Azul",
    updatedAt: daysAgo(1),
    createdAt: daysAgo(3),
    url: "https://example.com/tickets/EXT-4321",
  },
  {
    id: "ticket-2",
    number: "EXT-2310",
    title: "Ticket fechado (mock)",
    status: "fechado",
    statusCode: 2,
    serialNumber: "850J-FOO777",
    advisorName: "Consultora 2",
    customerName: "Cliente B",
    teamName: "Equipe Verde",
    updatedAt: daysAgo(4),
    createdAt: daysAgo(5),
    url: "https://example.com/tickets/EXT-2310",
  },
  {
    id: "ticket-3",
    number: "EXT-9988",
    title: "Ticket sem chassi (mock)",
    status: "desconhecido",
    statusCode: null,
    serialNumber: null,
    advisorName: null,
    customerName: "Cliente C",
    teamName: "Equipe Laranja",
    updatedAt: daysAgo(9),
    createdAt: daysAgo(10),
    url: "https://example.com/tickets/EXT-9988",
  },
];
