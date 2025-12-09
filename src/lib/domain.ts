export type LeadStatus = "novo" | "em_triagem" | "descartado" | "convertido";

export type TicketStatus = "aberto" | "em_andamento" | "fechado";

export type TimeRange = "today" | "week" | "month";

export type Lead = {
  id: string;
  empresa: string;
  nomeContato: string;
  telefone: string;
  tipoLead: string;
  chassiOuMaquina: string;
  criadoEm: string;
  status: LeadStatus;
  ticketId?: string;
};

export type Ticket = {
  id: string;
  externalId: string;
  linkExterno: string;
  empresa: string;
  chassiOuMaquina: string;
  tipoLeadOrigem: string;
  criadoEm: string;
  status: TicketStatus;
  virouOS: boolean;
  leadId?: string;
};
