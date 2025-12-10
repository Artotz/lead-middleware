export type TicketStatus = "aberto" | "em_andamento" | "fechado";

export type TimeRange = "today" | "week" | "month";

export type LeadCategory =
  | "preventiva"
  | "garantia_basica"
  | "garantia_estendida"
  | "reforma_componentes"
  | "lamina"
  | "dentes"
  | "rodante"
  | "disponibilidade"
  | "reconexao"
  | "transferencia_aor"
  | "indefinido";

export type Lead = {
  id: number;
  regional: string | null;
  estado: string | null;
  city: string | null;
  chassi: string | null;
  modelName: string | null;
  clienteBaseEnriquecida: string | null;
  horimetroAtualMachineList: number | null;
  lastCalledGroup: string | null;
  leadPreventiva: string | null;
  leadGarantiaBasica: string | null;
  leadGarantiaEstendida: string | null;
  leadReformaDeComponentes: string | null;
  leadLamina: string | null;
  leadDentes: string | null;
  leadRodante: string | null;
  leadDisponibilidade: string | null;
  leadReconexao: string | null;
  leadTransferenciaDeAor: string | null;
  importedAt: string;
  tipoLead: LeadCategory;
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
