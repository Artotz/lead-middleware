"use client";

export const COMPANY_SELECT =
  "id, document, name, state, lat, lng, csa, carteira_def, client_class, carteira_def2, classe_cliente, validacao, referencia, email_csa";

export const APPOINTMENT_SELECT =
  "id, company_id, consultant_id, consultant_name, starts_at, ends_at, status, check_in_at, check_out_at, check_in_lat, check_in_lng, check_out_lat, check_out_lng, address_snapshot, absence_reason, absence_note, notes, oportunidades";

export const COMPANY_LIST_SELECT =
  "id, document, name, state, lat, lng, csa, carteira_def, client_class, carteira_def2, classe_cliente, validacao, referencia, email_csa";

export const APPOINTMENT_LIST_SELECT =
  "id, company_id, consultant_id, consultant_name, starts_at, ends_at, status, check_in_at, check_out_at, check_in_lat, check_in_lng, check_out_lat, check_out_lng";

export type SupabaseAppointmentStatus =
  | "scheduled"
  | "in_progress"
  | "done"
  | "absent";

export type ScheduleBadgeTone =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "slate"
  | "violet"
  | "stone";

export type Company = {
  id: string;
  name: string;
  document: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  csa: string | null;
  carteiraDef: string | null;
  clientClass: string | null;
  carteiraDef2: string | null;
  classeCliente: string | null;
  validacao: string | null;
  referencia: string | null;
  emailCsa: string | null;
  createdAt: string | null;
};

export type Appointment = {
  id: string;
  companyId: string;
  consultantId: string | null;
  consultantName: string | null;
  startAt: string;
  endAt: string;
  status: SupabaseAppointmentStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInAccuracyM: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutAccuracyM: number | null;
  addressSnapshot: string | null;
  absenceReason: string | null;
  absenceNote: string | null;
  notes: string | null;
  oportunidades: string[] | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ScheduleRange = {
  startAt: Date;
  endAt: Date;
  startIso: string;
  endIso: string;
};

type SupabaseCompanyRow = {
  id: string;
  name: string;
  document: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  csa: string | null;
  carteira_def: string | null;
  client_class: string | null;
  carteira_def2: string | null;
  classe_cliente: string | null;
  validacao: string | null;
  referencia: string | null;
  email_csa: string | null;
  created_at: string | null;
};

type SupabaseAppointmentRow = {
  id: string;
  company_id: string;
  consultant_id: string | null;
  consultant_name: string | null;
  starts_at: string;
  ends_at: string;
  status: SupabaseAppointmentStatus | null;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_accuracy_m: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_accuracy_m: number | null;
  address_snapshot: string | null;
  absence_reason: string | null;
  absence_note: string | null;
  notes: string | null;
  oportunidades: string[] | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MONTHS_LONG = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_LONG = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
];

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export const STATUS_LABELS: Record<SupabaseAppointmentStatus, string> = {
  scheduled: "Agendado",
  in_progress: "Em execucao",
  done: "Concluido",
  absent: "Ausente",
};

export const STATUS_TONES: Record<SupabaseAppointmentStatus, ScheduleBadgeTone> =
  {
    scheduled: "amber",
    in_progress: "sky",
    done: "emerald",
    absent: "rose",
  };

export const OPPORTUNITY_OPTIONS = [
  { id: "preventiva", label: "Preventiva" },
  { id: "garantia_basica", label: "Garantia basica" },
  { id: "garantia_estendida", label: "Garantia estendida" },
  { id: "reforma_componentes", label: "Reforma de componentes" },
  { id: "lamina", label: "Lamina" },
  { id: "dentes", label: "Dentes" },
  { id: "rodante", label: "Rodante" },
  { id: "disponibilidade", label: "Disponibilidade" },
  { id: "reconexao", label: "Reconexao" },
  { id: "transferencia_aor", label: "Transferencia AOR" },
  { id: "pops", label: "POPs" },
  { id: "outros", label: "Outros" },
];

export const getOpportunityLabel = (id: string) =>
  OPPORTUNITY_OPTIONS.find((option) => option.id === id)?.label ?? id;

export const mapCompany = (row: SupabaseCompanyRow): Company => ({
  id: row.id,
  name: row.name,
  document: row.document ?? null,
  state: row.state ?? null,
  lat: row.lat ?? null,
  lng: row.lng ?? null,
  csa: row.csa ?? null,
  carteiraDef: row.carteira_def ?? null,
  clientClass: row.client_class ?? null,
  carteiraDef2: row.carteira_def2 ?? null,
  classeCliente: row.classe_cliente ?? null,
  validacao: row.validacao ?? null,
  referencia: row.referencia ?? null,
  emailCsa: row.email_csa ?? null,
  createdAt: row.created_at ?? null,
});

const normalizeStatus = (
  value: SupabaseAppointmentRow["status"],
): SupabaseAppointmentStatus => {
  if (value === "scheduled") return "scheduled";
  if (value === "in_progress") return "in_progress";
  if (value === "done") return "done";
  if (value === "absent") return "absent";
  return "scheduled";
};

export const mapAppointment = (row: SupabaseAppointmentRow): Appointment => ({
  id: row.id,
  companyId: row.company_id,
  consultantId: row.consultant_id ?? null,
  consultantName: row.consultant_name ?? null,
  startAt: row.starts_at,
  endAt: row.ends_at,
  status: normalizeStatus(row.status),
  checkInAt: row.check_in_at ?? null,
  checkOutAt: row.check_out_at ?? null,
  checkInLat: row.check_in_lat ?? null,
  checkInLng: row.check_in_lng ?? null,
  checkInAccuracyM: row.check_in_accuracy_m ?? null,
  checkOutLat: row.check_out_lat ?? null,
  checkOutLng: row.check_out_lng ?? null,
  checkOutAccuracyM: row.check_out_accuracy_m ?? null,
  addressSnapshot: row.address_snapshot ?? null,
  absenceReason: row.absence_reason ?? null,
  absenceNote: row.absence_note ?? null,
  notes: row.notes ?? null,
  oportunidades: row.oportunidades ?? null,
  createdBy: row.created_by ?? null,
  createdAt: row.created_at ?? null,
  updatedAt: row.updated_at ?? null,
});

export const matchesConsultantCompany = (
  company: Company,
  consultantName: string,
): boolean => {
  const normalized = consultantName.trim().toLowerCase();
  if (!normalized) return false;
  const email = company.emailCsa?.trim().toLowerCase() ?? "";
  const csa = company.csa?.trim().toLowerCase() ?? "";
  if (!email && !csa) return false;
  return (
    (email !== "" && email.includes(normalized)) ||
    (csa !== "" && csa.includes(normalized))
  );
};

export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const endOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

export const startOfWeek = (date: Date): Date => {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const base = startOfDay(date);
  base.setDate(base.getDate() - diff);
  return base;
};

export const endOfWeek = (date: Date): Date => {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months, 1);
  return startOfDay(next);
};

export type WeekRange = {
  startAt: Date;
  endAt: Date;
  label: string;
};

export const getWeeksForMonth = (month: Date): WeekRange[] => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const rangeStart = startOfWeek(firstDay);
  const rangeEnd = endOfWeek(lastDay);
  const weeks: WeekRange[] = [];

  let cursor = rangeStart;
  while (cursor <= rangeEnd) {
    const weekStart = new Date(cursor);
    const weekEnd = addDays(weekStart, 6);
    weeks.push({
      startAt: weekStart,
      endAt: weekEnd,
      label: `${formatDateLabel(weekStart)} - ${formatDateLabel(weekEnd)}`,
    });
    cursor = addDays(cursor, 7);
  }

  return weeks;
};

export const normalizeRange = (range: {
  startAt: Date;
  endAt: Date;
}): ScheduleRange => {
  const start = startOfDay(range.startAt);
  const end = endOfDay(range.endAt);
  return {
    startAt: start,
    endAt: end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

export const getWeekRange = (date: Date) => ({
  startAt: startOfWeek(date),
  endAt: endOfWeek(date),
});

export const formatTime = (value: string | Date | null | undefined) => {
  if (!value) return "--:--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return timeFormatter.format(date);
};

export const formatDateLabel = (date: Date) => {
  const month = MONTHS_SHORT[date.getMonth()] ?? "";
  return `${String(date.getDate()).padStart(2, "0")} ${month}`;
};

export const formatMonthLabel = (date: Date) => {
  const month = MONTHS_LONG[date.getMonth()] ?? "";
  return `${month} ${date.getFullYear()}`;
};

export const formatWeekday = (date: Date, variant: "short" | "long") => {
  const index = date.getDay();
  return variant === "short"
    ? WEEKDAY_SHORT[index] ?? ""
    : WEEKDAY_LONG[index] ?? "";
};

export const formatDuration = (startAt: string, endAt: string): string => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "--";
  }
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return "--";
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
};

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isAppointmentDone = (appointment: Appointment): boolean =>
  appointment.status === "done" || Boolean(appointment.checkOutAt);

export const isAppointmentAbsent = (appointment: Appointment): boolean =>
  appointment.status === "absent" || Boolean(appointment.absenceReason);

export const isAppointmentInProgress = (appointment: Appointment): boolean =>
  appointment.status === "in_progress" || Boolean(appointment.checkInAt);

export const isAppointmentPending = (appointment: Appointment): boolean =>
  !isAppointmentDone(appointment) &&
  !isAppointmentAbsent(appointment) &&
  !isAppointmentInProgress(appointment);
