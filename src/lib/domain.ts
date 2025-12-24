export type TicketStatus = "aberto" | "fechado" | "desconhecido";

export type TimeRange = "today" | "week" | "month" | "year";

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
  | "pops"
  | "outros"
  | "indefinido";

export type Lead = {
  id: number;
  status: string | null;
  regional: string | null;
  estado: string | null;
  city: string | null;
  consultor: string | null;
  nomeContato: string | null;
  createdBy: string | null;
  telefone: string | null;
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
  leadPops: string | null;
  leadOutros: string | null;
  importedAt: string;
  updatedAt: string | null;
  tipoLead: LeadCategory;
  tipoLeadList: LeadCategory[];
  ticketId?: string;
};

export type Ticket = {
  id: string;
  number: string;
  title: string;
  status: TicketStatus;
  statusCode: number | null;
  serialNumber: string | null;
  advisorName: string | null;
  customerName: string | null;
  customerOrganization: string | null;
  teamName: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  url: string | null;
};
