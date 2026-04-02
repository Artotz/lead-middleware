"use client";

import Link from "next/link";
import {
  Suspense,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/Badge";
import { LeadTypesMultiSelect } from "@/components/LeadTypesMultiSelect";
import { PaginationControls } from "@/components/PaginationControls";
import { PageShell } from "@/components/PageShell";
import { TableColumnFilterHeader } from "@/components/TableColumnFilterHeader";
import { Tabs } from "@/components/Tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSchedule } from "@/contexts/ScheduleContext";
import {
  buildDocumentVariants,
  buildEmptyProtheusCounts,
  buildProtheusCounts,
  mergeProtheusCounts,
  type ProtheusCounts,
  type ProtheusLeadRow,
} from "@/lib/protheus";
import {
  APPOINTMENT_LIST_SELECT,
  COMPANY_LIST_SELECT,
  addDays,
  addMonths,
  formatDateLabel,
  formatMonthLabel,
  formatTime,
  formatWeekday,
  getWeeksForMonth,
  isSameDay,
  isAppointmentDone,
  OPPORTUNITY_OPTIONS,
  STATUS_TONES,
  matchesConsultantCompany,
  startOfDay,
  mapAppointment,
  mapCompany,
  type SupabaseAppointmentStatus,
  type Appointment,
  type Company,
  toDateKey,
} from "@/lib/schedule";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { loadSessionStorage, saveSessionStorage } from "@/lib/sessionStorage";
import {
  createTranslator,
  getMessages,
  type Locale,
  type Translate,
} from "@/lib/i18n";
import { ScheduleMapView } from "./components/ScheduleMapView";
import { CreateAppointmentModal } from "./components/CreateAppointmentPanel";

type CronogramaClientProps = {
  initialTab?: "cronograma" | "agendamentos" | "empresas" | "dashboard";
  locale: Locale;
};

type TimelineItem = {
  appointment: Appointment;
  start: Date;
  end: Date;
};

type TimelineLayoutItem = TimelineItem & {
  lane: number;
  lanes: number;
};

type DashboardScope = "general" | "individual";
type DashboardView = "week" | "month" | "year";
type DashboardStage = "visita" | "atuacao";
type AppointmentListStatusFilter = SupabaseAppointmentStatus | "expired";

type OrcamentoResumoRow = {
  cnpj: string | number | null;
  vs1_numorc: number | string | null;
  vs1_filial: number | string | null;
  vs1_vtotnf: number | string | null;
  status: string | null;
};

type LastVisitRow = {
  company_id: string;
  starts_at: string;
  ends_at: string;
  status: SupabaseAppointmentStatus | null;
  check_out_at: string | null;
};

type ActivityRow = {
  apontamento_id: string | null;
  registro_tipo: string | null;
};

type ActionDashboardRow = {
  apontamento_id: string | null;
  resultado: "em_andamento" | "vendido" | "perdido" | null;
  valor: number | string | null;
  tipo_oportunidade: string | null;
  motivo_perda: string | null;
  created_at: string | null;
  created_by: string | null;
  company_id?: string | null;
};

type ActionAppointmentRefRow = {
  id: string;
  company_id: string | null;
};

type CronogramaSessionState = {
  viewMode: "board" | "grid" | "map";
  dashboardView: DashboardView;
  dashboardStage: DashboardStage;
  selectedConsultantId: string | null;
  selectedListConsultantIds: string[];
  selectedDashboardActorIds: string[];
  companySort:
    | "name"
    | "name_desc"
    | "csa_asc"
    | "csa_desc"
    | "preventivas"
    | "reconexoes"
    | "cotacoes"
    | "last_visit";
  companyPage: number;
  companySearch: string;
  companyNameFilter: string[];
  companyConsultantFilter: string[];
  companyVisibleColumns: string[];
  appointmentSearch: string;
  appointmentCompanyFilter: string[];
  appointmentConsultantFilter: string[];
  appointmentVisibleColumns: string[];
  appointmentStatus: AppointmentListStatusFilter[];
  appointmentOpportunity: string[];
  cronogramaStatus: SupabaseAppointmentStatus[];
  appointmentSort:
    | "date_desc"
    | "date_asc"
    | "alpha_asc"
    | "alpha_desc"
    | "consultant_asc"
    | "consultant_desc"
    | "cotacoes";
  appointmentPage: number;
  showOutsidePortfolio: boolean;
  selectedMonth: string;
  selectedWeekIndex: number;
};

const CRONOGRAMA_SESSION_STORAGE_KEY = "cronograma:ui-state";

const statusCardStyles: Record<SupabaseAppointmentStatus, string> = {
  scheduled: "border-amber-300 bg-amber-50 text-amber-900",
  in_progress: "border-sky-300 bg-sky-50 text-sky-900",
  done: "border-emerald-300 bg-emerald-50 text-emerald-900",
  absent: "border-rose-300 bg-rose-50 text-rose-900",
  atuado: "border-violet-300 bg-violet-50 text-violet-900",
};

const statusChartColors: Record<SupabaseAppointmentStatus, string> = {
  scheduled: "#F59E0B",
  in_progress: "#0EA5E9",
  done: "#10B981",
  absent: "#F43F5E",
  atuado: "#8B5CF6",
};

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

const formatChartLabel = (value: unknown, decimals?: number) => {
  const numeric =
    typeof value === "number" || typeof value === "string"
      ? toNumber(value)
      : null;
  if (!numeric) return "";
  if (decimals != null) return numeric.toFixed(decimals);
  return String(numeric);
};

const shouldShowActualTimeRange = (appointment: Appointment) =>
  appointment.status === "done" || appointment.status === "atuado";

const getAppointmentTimeDisplay = (
  appointment: Appointment,
  t: Translate,
) => {
  if (!shouldShowActualTimeRange(appointment)) {
    const scheduledRange = `${formatTime(appointment.startAt)} - ${formatTime(appointment.endAt)}`;
    return {
      title: scheduledRange,
      content: scheduledRange,
      isActual: false,
    };
  }

  const checkInLabel = appointment.checkInAt
    ? formatTime(appointment.checkInAt)
    : t("schedule.timeline.pending");
  const checkOutLabel = appointment.checkOutAt
    ? formatTime(appointment.checkOutAt)
    : t("schedule.timeline.pending");

  return {
    title: `${t("schedule.timeline.checkIn")}: ${checkInLabel} • ${t("schedule.timeline.checkOut")}: ${checkOutLabel}`,
    content: `${checkInLabel} - ${checkOutLabel}`,
    isActual: true,
  };
};

const RADIAN = Math.PI / 180;

type PieSliceRenderProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
  value?: number | string;
};

const renderPieOuterLabel = ({
  cx = 0,
  cy = 0,
  midAngle = 0,
  outerRadius = 0,
  percent = 0,
  value,
}: PieSliceRenderProps) => {
  const numericValue = toNumber(value);
  if (numericValue == null || numericValue <= 0 || percent <= 0) return null;

  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#475569"
      fontSize={12}
      fontWeight={600}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${numericValue} (${Math.round(percent * 100)}%)`}
    </text>
  );
};

const renderPieLabelLine = ({
  cx = 0,
  cy = 0,
  midAngle = 0,
  outerRadius = 0,
  percent = 0,
}: PieSliceRenderProps) => {
  if (percent <= 0) return <g />;

  const startRadius = outerRadius + 4;
  const endRadius = outerRadius + 14;
  const startX = cx + startRadius * Math.cos(-midAngle * RADIAN);
  const startY = cy + startRadius * Math.sin(-midAngle * RADIAN);
  const endX = cx + endRadius * Math.cos(-midAngle * RADIAN);
  const endY = cy + endRadius * Math.sin(-midAngle * RADIAN);

  return (
    <path
      d={`M ${startX} ${startY} L ${endX} ${endY}`}
      fill="none"
      stroke="#94A3B8"
      strokeWidth={1}
    />
  );
};

const formatAverageDuration = (minutes: number | null, t: Translate) => {
  if (minutes == null || minutes <= 0) return t("schedule.noData");
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours && mins) {
    return t("schedule.dashboard.durationHoursMinutes", {
      hours,
      minutes: String(mins).padStart(2, "0"),
    });
  }
  if (hours) {
    return t("schedule.dashboard.durationHours", { hours });
  }
  return t("schedule.dashboard.durationMinutes", { minutes: mins });
};

const DASHBOARD_VIEW_VALUES = ["week", "month", "year"] as const;

const getMonthRange = (date: Date) => ({
  startAt: new Date(date.getFullYear(), date.getMonth(), 1),
  endAt: new Date(date.getFullYear(), date.getMonth() + 1, 0),
});

const getYearRange = (date: Date) => ({
  startAt: new Date(date.getFullYear(), 0, 1),
  endAt: new Date(date.getFullYear(), 11, 31),
});

const normalizeCnpj = (value: string | number | null | undefined) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length ? digits : null;
};

const isOpenQuoteStatus = (status: string | null | undefined) =>
  status?.trim().toUpperCase() === "ABERTO";

const resolveTimelineRange = (
  appointment: Appointment,
): { start: Date; end: Date } => {
  const scheduledStart = new Date(appointment.startAt);
  const scheduledEnd = new Date(appointment.endAt);
  const isDone = isAppointmentDone(appointment);
  const checkIn = appointment.checkInAt
    ? new Date(appointment.checkInAt)
    : null;
  const checkOut = appointment.checkOutAt
    ? new Date(appointment.checkOutAt)
    : null;

  const start =
    isDone && checkIn && !Number.isNaN(checkIn.getTime())
      ? checkIn
      : scheduledStart;
  const end =
    isDone && checkOut && !Number.isNaN(checkOut.getTime())
      ? checkOut
      : scheduledEnd;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const fallbackStart = new Date();
    const fallbackEnd = new Date(fallbackStart.getTime() + 30 * 60000);
    return { start: fallbackStart, end: fallbackEnd };
  }

  if (end.getTime() <= start.getTime()) {
    return {
      start,
      end: new Date(start.getTime() + 30 * 60000),
    };
  }

  return { start, end };
};

const isExpiredAppointment = (appointment: Appointment, todayStart: Date) => {
  if (appointment.status !== "scheduled") return false;
  const start = new Date(appointment.startAt);
  if (Number.isNaN(start.getTime())) return false;
  return start < todayStart;
};

const layoutTimelineItems = (items: TimelineItem[]): TimelineLayoutItem[] => {
  if (!items.length) return [];
  const sorted = [...items].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  return sorted.map((item) => ({ ...item, lane: 0, lanes: 1 }));
};

const TAB_VALUES = ["cronograma", "agendamentos", "empresas", "dashboard"] as const;
const VIEW_MODE_VALUES = ["board", "grid", "map"] as const;
const DASHBOARD_SCOPE_VALUES = ["general", "individual"] as const;
const DASHBOARD_STAGE_VALUES = ["visita", "atuacao"] as const;
const COMPANY_SORT_VALUES = [
  "name",
  "name_desc",
  "csa_asc",
  "csa_desc",
  "preventivas",
  "reconexoes",
  "cotacoes",
  "last_visit",
] as const;
const APPOINTMENT_SORT_VALUES = [
  "date_desc",
  "date_asc",
  "alpha_asc",
  "alpha_desc",
  "consultant_asc",
  "consultant_desc",
  "cotacoes",
] as const;
const APPOINTMENT_STATUS_VALUES = [
  "scheduled",
  "in_progress",
  "done",
  "absent",
  "atuado",
] as const;
const APPOINTMENT_LIST_STATUS_VALUES = [
  ...APPOINTMENT_STATUS_VALUES,
  "expired",
] as const;
const COMPANY_COLUMN_VALUES = [
  "empresa",
  "estado",
  "csa",
  "carteira",
  "classe",
  "referencia",
  "ultimaVisita",
  "oportunidades",
  "cotacoes",
] as const;
const APPOINTMENT_COLUMN_VALUES = [
  "empresa",
  "consultor",
  "data",
  "horario",
  "status",
  "oportunidades",
  "cotacoes",
] as const;

const parseEnum = <T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T => (value && allowed.includes(value as T) ? (value as T) : fallback);

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseMonth = (value: string | null, fallback: Date) => {
  if (!value) return fallback;
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(month)) return fallback;
  if (month < 0 || month > 11) return fallback;
  return new Date(year, month, 1);
};

const parseWeekIndex = (value: string | null): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed - 1;
};

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const parseCsv = (value: string | null) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const sanitizeSelection = <T extends string>(
  values: string[],
  allowed: readonly T[],
  fallback: readonly T[],
): T[] => {
  const validValues = values.filter((value): value is T =>
    allowed.includes(value as T),
  );
  return validValues.length ? Array.from(new Set(validValues)) : [...fallback];
};

type ToolbarRowProps = {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
};

function ToolbarRow({ summary, children, className }: ToolbarRowProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {summary}
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        {children}
      </div>
    </div>
  );
}

type ToolbarFieldProps = {
  label?: string;
  srOnlyLabel?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

function ToolbarField({
  label,
  srOnlyLabel = false,
  children,
  className,
  contentClassName,
}: ToolbarFieldProps) {
  return (
    <label
      className={`relative z-0 flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus-within:z-30 sm:w-auto ${className ?? ""}`}
    >
      {label ? (
        <span
          className={
            srOnlyLabel
              ? "sr-only"
              : "text-xs uppercase tracking-wide text-slate-500"
          }
        >
          {label}
        </span>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </label>
  );
}

type PeriodOption = {
  value: string;
  label: string;
};

type PeriodNavigatorProps = {
  label: string;
  prevLabel: string;
  nextLabel: string;
  value: string;
  options: PeriodOption[];
  onChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  trailing?: ReactNode;
  containerClassName?: string;
};

function PeriodNavigator({
  label,
  prevLabel,
  nextLabel,
  value,
  options,
  onChange,
  onPrev,
  onNext,
  trailing,
  containerClassName,
}: PeriodNavigatorProps) {
  return (
    <div
      className={`${containerClassName ?? ""} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrev} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
          <span className="sr-only">{prevLabel}</span>
          &lt;
        </button>
        <ToolbarField
          label={label}
          srOnlyLabel
          className="sm:min-w-[220px]"
          contentClassName="w-full"
        >
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={label}
            className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ToolbarField>
        <button type="button" onClick={onNext} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
          <span className="sr-only">{nextLabel}</span>
          &gt;
        </button>
      </div>

      {trailing ? (
        <div className="flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

function CronogramaClientContent({
  initialTab = "cronograma",
  locale,
}: CronogramaClientProps) {
  const {
    range,
    appointments,
    companies,
    consultants,
    loading,
    error,
    selectedConsultantId,
    setRange,
    refresh,
    setSelectedConsultantId,
  } = useSchedule();
  const t = useMemo(() => createTranslator(getMessages(locale)), [locale]);
  const { role } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const today = useMemo(() => new Date(), []);
  const defaultSelectedMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );
  const defaultSelectedWeekIndex = useMemo(() => {
    const monthWeeks = getWeeksForMonth(defaultSelectedMonth);
    if (!monthWeeks.length) return 0;
    const todayKey = toDateKey(today);
    const currentWeekIndex = monthWeeks.findIndex(
      (week) =>
        todayKey >= toDateKey(week.startAt) &&
        todayKey <= toDateKey(week.endAt),
    );
    return currentWeekIndex >= 0 ? currentWeekIndex : 0;
  }, [defaultSelectedMonth, today]);
  const defaultCronogramaState = useMemo<CronogramaSessionState>(
    () => ({
      viewMode: "grid",
      dashboardView: "week",
      dashboardStage: "visita",
      selectedConsultantId: null,
      selectedListConsultantIds: [],
      selectedDashboardActorIds: [],
      companySort: "name",
      companyPage: 1,
      companySearch: "",
      companyNameFilter: [],
      companyConsultantFilter: [],
      companyVisibleColumns: [...COMPANY_COLUMN_VALUES],
      appointmentSearch: "",
      appointmentCompanyFilter: [],
      appointmentConsultantFilter: [],
      appointmentVisibleColumns: [...APPOINTMENT_COLUMN_VALUES],
      appointmentStatus: [],
      appointmentOpportunity: [],
      cronogramaStatus: [],
      appointmentSort: "date_desc",
      appointmentPage: 1,
      showOutsidePortfolio: false,
      selectedMonth: toMonthKey(defaultSelectedMonth),
      selectedWeekIndex: defaultSelectedWeekIndex,
    }),
    [defaultSelectedMonth, defaultSelectedWeekIndex],
  );
  const persistedCronogramaState = useMemo(
    () =>
      loadSessionStorage(
        CRONOGRAMA_SESSION_STORAGE_KEY,
        defaultCronogramaState,
        (value) => {
          if (!value || typeof value !== "object") return defaultCronogramaState;
          const data = value as Partial<CronogramaSessionState>;
          return {
            viewMode: parseEnum(
              typeof data.viewMode === "string" ? data.viewMode : null,
              VIEW_MODE_VALUES,
              defaultCronogramaState.viewMode,
            ),
            dashboardView: parseEnum(
              typeof data.dashboardView === "string" ? data.dashboardView : null,
              DASHBOARD_VIEW_VALUES,
              defaultCronogramaState.dashboardView,
            ),
            dashboardStage: parseEnum(
              typeof data.dashboardStage === "string" ? data.dashboardStage : null,
              DASHBOARD_STAGE_VALUES,
              defaultCronogramaState.dashboardStage,
            ),
            selectedConsultantId:
              typeof data.selectedConsultantId === "string"
                ? data.selectedConsultantId
                : null,
            selectedListConsultantIds: Array.isArray(data.selectedListConsultantIds)
              ? data.selectedListConsultantIds.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            selectedDashboardActorIds: Array.isArray(data.selectedDashboardActorIds)
              ? data.selectedDashboardActorIds.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            companySort: parseEnum(
              typeof data.companySort === "string" ? data.companySort : null,
              COMPANY_SORT_VALUES,
              defaultCronogramaState.companySort,
            ),
            companyPage: parsePositiveInt(
              typeof data.companyPage === "number"
                ? String(data.companyPage)
                : null,
              1,
            ),
            companySearch:
              typeof data.companySearch === "string" ? data.companySearch : "",
            companyNameFilter: Array.isArray(data.companyNameFilter)
              ? data.companyNameFilter.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            companyConsultantFilter: Array.isArray(data.companyConsultantFilter)
              ? data.companyConsultantFilter.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            companyVisibleColumns: sanitizeSelection(
              Array.isArray(data.companyVisibleColumns)
                ? data.companyVisibleColumns
                : [],
              COMPANY_COLUMN_VALUES,
              COMPANY_COLUMN_VALUES,
            ),
            appointmentSearch:
              typeof data.appointmentSearch === "string"
                ? data.appointmentSearch
                : "",
            appointmentCompanyFilter: Array.isArray(data.appointmentCompanyFilter)
              ? data.appointmentCompanyFilter.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            appointmentConsultantFilter: Array.isArray(data.appointmentConsultantFilter)
              ? data.appointmentConsultantFilter.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            appointmentVisibleColumns: sanitizeSelection(
              Array.isArray(data.appointmentVisibleColumns)
                ? data.appointmentVisibleColumns
                : [],
              APPOINTMENT_COLUMN_VALUES,
              APPOINTMENT_COLUMN_VALUES,
            ),
            appointmentStatus: Array.isArray(data.appointmentStatus)
              ? data.appointmentStatus.filter(
                  (status): status is AppointmentListStatusFilter =>
                    APPOINTMENT_LIST_STATUS_VALUES.includes(
                      status as AppointmentListStatusFilter,
                    ),
                )
              : [],
            appointmentOpportunity: Array.isArray(data.appointmentOpportunity)
              ? data.appointmentOpportunity.filter((opportunity) =>
                  OPPORTUNITY_OPTIONS.some((option) => option.id === opportunity),
                )
              : [],
            cronogramaStatus: Array.isArray(data.cronogramaStatus)
              ? data.cronogramaStatus.filter(
                  (status): status is SupabaseAppointmentStatus =>
                    APPOINTMENT_STATUS_VALUES.includes(
                      status as SupabaseAppointmentStatus,
                    ),
                )
              : [],
            appointmentSort: parseEnum(
              typeof data.appointmentSort === "string"
                ? data.appointmentSort
                : null,
              APPOINTMENT_SORT_VALUES,
              defaultCronogramaState.appointmentSort,
            ),
            appointmentPage: parsePositiveInt(
              typeof data.appointmentPage === "number"
                ? String(data.appointmentPage)
                : null,
              1,
            ),
            showOutsidePortfolio: data.showOutsidePortfolio === true,
            selectedMonth: toMonthKey(
              parseMonth(
                typeof data.selectedMonth === "string" ? data.selectedMonth : null,
                defaultSelectedMonth,
              ),
            ),
            selectedWeekIndex:
              typeof data.selectedWeekIndex === "number" &&
              Number.isInteger(data.selectedWeekIndex) &&
              data.selectedWeekIndex >= 0
                ? data.selectedWeekIndex
                : defaultSelectedWeekIndex,
          };
        },
      ),
    [defaultCronogramaState, defaultSelectedMonth, defaultSelectedWeekIndex],
  );
  const normalizeConsultantText = useCallback(
    (value: string | null | undefined) =>
      value ? value.replace(/\s+/g, " ").trim() : "",
    [],
  );
  const normalizeIdentity = useCallback(
    (value: string | null | undefined) => value?.trim().toLowerCase() ?? "",
    [],
  );
  const formatActorDisplayName = useCallback((value: string | null | undefined) => {
    const raw = value?.trim() ?? "";
    if (!raw.includes("@")) return raw;

    const [localPart] = raw.split("@");
    const parts = localPart
      .split(".")
      .map((item) => item.trim())
      .filter(Boolean);

    const isNameLike =
      parts.length >= 2 &&
      parts.every((part) => /^[a-zà-ÿ-]+$/i.test(part));

    if (!isNameLike) return raw;

    return parts
      .map((part) =>
        part
          .split("-")
          .map((token) =>
            token ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase() : "",
          )
          .join("-"),
      )
      .join(" ");
  }, []);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "BRL",
      }),
    [locale],
  );
  const formatCurrency = useMemo(
    () => (value: number | null | undefined) =>
      value == null ? t("schedule.noData") : currencyFormatter.format(value),
    [currencyFormatter, t],
  );

  const [viewMode, setViewMode] = useState<"board" | "grid" | "map">(
    persistedCronogramaState.viewMode,
  );
  const activeTab = initialTab;
  const [dashboardView, setDashboardView] = useState<DashboardView>(
    persistedCronogramaState.dashboardView,
  );
  const [dashboardStage, setDashboardStage] = useState<DashboardStage>(
    persistedCronogramaState.dashboardStage,
  );
  const isVisitDashboard = dashboardStage === "visita";
  const [generalAppointments, setGeneralAppointments] = useState<Appointment[]>(
    [],
  );
  const [generalCompanies, setGeneralCompanies] = useState<Company[]>([]);
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const generalRequestIdRef = useRef(0);
  const [generalListCompanies, setGeneralListCompanies] = useState<Company[]>(
    [],
  );
  const [generalListCompaniesLoading, setGeneralListCompaniesLoading] =
    useState(false);
  const [generalListCompaniesError, setGeneralListCompaniesError] = useState<
    string | null
  >(null);
  const generalListCompaniesRequestIdRef = useRef(0);
  const [activityCounts, setActivityCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [activityByConsultantCounts, setActivityByConsultantCounts] = useState<
    Map<string, number>
  >(new Map());
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const activityRequestIdRef = useRef(0);
  const [dashboardActions, setDashboardActions] = useState<ActionDashboardRow[]>(
    [],
  );
  const [actionDataLoading, setActionDataLoading] = useState(false);
  const [actionDataError, setActionDataError] = useState<string | null>(null);
  const actionDataRequestIdRef = useRef(0);
  const [actionReloadKey, setActionReloadKey] = useState(0);
  const [selectedListConsultantIds, setSelectedListConsultantIds] = useState<string[]>(
    persistedCronogramaState.selectedListConsultantIds,
  );
  const [selectedDashboardActorIds, setSelectedDashboardActorIds] = useState<string[]>(
    persistedCronogramaState.selectedDashboardActorIds,
  );
  const [companySort, setCompanySort] = useState<
    | "name"
    | "name_desc"
    | "csa_asc"
    | "csa_desc"
    | "preventivas"
    | "reconexoes"
    | "cotacoes"
    | "last_visit"
  >(persistedCronogramaState.companySort);
  const [companyPage, setCompanyPage] = useState(persistedCronogramaState.companyPage);
  const [appointmentSearch, setAppointmentSearch] = useState(
    persistedCronogramaState.appointmentSearch,
  );
  const [appointmentCompanyFilter, setAppointmentCompanyFilter] = useState<string[]>(
    persistedCronogramaState.appointmentCompanyFilter,
  );
  const [appointmentConsultantFilter, setAppointmentConsultantFilter] = useState<string[]>(
    persistedCronogramaState.appointmentConsultantFilter,
  );
  const [appointmentVisibleColumns, setAppointmentVisibleColumns] = useState(
    [...persistedCronogramaState.appointmentVisibleColumns],
  );
  const [appointmentStatus, setAppointmentStatus] = useState<
    AppointmentListStatusFilter[]
  >(persistedCronogramaState.appointmentStatus);
  const [appointmentOpportunity, setAppointmentOpportunity] = useState<string[]>(
    persistedCronogramaState.appointmentOpportunity,
  );
  const [cronogramaStatus, setCronogramaStatus] = useState<
    SupabaseAppointmentStatus[]
  >(persistedCronogramaState.cronogramaStatus);
  const [appointmentSort, setAppointmentSort] = useState<
    | "date_desc"
    | "date_asc"
    | "alpha_asc"
    | "alpha_desc"
    | "consultant_asc"
    | "consultant_desc"
    | "cotacoes"
  >(persistedCronogramaState.appointmentSort);
  const [appointmentPage, setAppointmentPage] = useState(
    persistedCronogramaState.appointmentPage,
  );
  const [listAppointments, setListAppointments] = useState<Appointment[]>([]);
  const [listAppointmentsLoading, setListAppointmentsLoading] = useState(false);
  const [listAppointmentsError, setListAppointmentsError] = useState<
    string | null
  >(null);
  const listAppointmentsRequestIdRef = useRef(0);
  const [showOutsidePortfolio, setShowOutsidePortfolio] = useState(
    persistedCronogramaState.showOutsidePortfolio,
  );
  const [loadedConsultantId, setLoadedConsultantId] = useState<string | null>(
    null,
  );
  const companiesPerPage = 20;
  const appointmentsPerPage = 20;
  const [selectedMonth, setSelectedMonth] = useState(() =>
    parseMonth(persistedCronogramaState.selectedMonth, defaultSelectedMonth),
  );
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(
    persistedCronogramaState.selectedWeekIndex,
  );
  const [showCompanies, setShowCompanies] = useState(true);
  const [showCheckIns, setShowCheckIns] = useState(true);
  const [showCheckOuts, setShowCheckOuts] = useState(true);
  const [companySearch, setCompanySearch] = useState(
    persistedCronogramaState.companySearch,
  );
  const [companyNameFilter, setCompanyNameFilter] = useState<string[]>(
    persistedCronogramaState.companyNameFilter,
  );
  const [companyConsultantFilter, setCompanyConsultantFilter] = useState<string[]>(
    persistedCronogramaState.companyConsultantFilter,
  );
  const [companyVisibleColumns, setCompanyVisibleColumns] = useState(
    [...persistedCronogramaState.companyVisibleColumns],
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [protheusCounts, setProtheusCounts] = useState<
    Map<string, ProtheusCounts>
  >(new Map());
  const [protheusLoading, setProtheusLoading] = useState(false);
  const [protheusError, setProtheusError] = useState<string | null>(null);
  const protheusRequestIdRef = useRef(0);
  const [openQuotesTotals, setOpenQuotesTotals] = useState<Map<string, number>>(
    new Map(),
  );
  const [openQuotesLoading, setOpenQuotesLoading] = useState(false);
  const [openQuotesError, setOpenQuotesError] = useState<string | null>(null);
  const openQuotesRequestIdRef = useRef(0);
  const [lastVisitByCompany, setLastVisitByCompany] = useState<
    Map<string, Date>
  >(new Map());
  const [lastVisitLoading, setLastVisitLoading] = useState(false);
  const [lastVisitError, setLastVisitError] = useState<string | null>(null);
  const lastVisitRequestIdRef = useRef(0);
  const panelClass =
    "rounded-2xl border border-slate-200 bg-white shadow-lg shadow-black/5";
  const toolbarCardClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm";
  const softButtonClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900";
  const primaryButtonClass =
    "rounded-lg border border-slate-200 bg-[#FFDE00] px-3 py-2 text-sm font-semibold text-[#0B0D10] shadow-md shadow-black/40 transition hover:brightness-95";
  const toggleActiveClass =
    "!bg-[#FFDE00] border-[#F2A900] text-slate-900 shadow-sm";
  const toggleInactiveClass =
    "border-slate-200 text-slate-600 hover:bg-slate-50";
  const opportunityBadgeLimit = 2;
  const suggestionHighlightClass =
    "border-warning/80 bg-amber-100 ring-1 ring-warning/30";
  const canCreateAppointment = role === "admin";
  const toolbarInputClass =
    "w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";
  const actionActorOptions = useMemo(() => {
    const counts = new Map<string, number>();
    dashboardActions.forEach((action) => {
      const actor = action.created_by?.trim().toLowerCase();
      if (!actor) return;
      counts.set(actor, (counts.get(actor) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, name: formatActorDisplayName(id), count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"))
      .map(({ id, name }) => ({ id, name }));
  }, [dashboardActions, formatActorDisplayName]);
  const consultantOptions = useMemo(
    () => consultants.map((item) => ({ value: item.id, label: item.name })),
    [consultants],
  );
  const consultantOptionValues = useMemo(
    () => consultantOptions.map((item) => item.value),
    [consultantOptions],
  );
  const selectedConsultantOptions = useMemo(
    () =>
      consultants.filter((item) => selectedListConsultantIds.includes(item.id)),
    [consultants, selectedListConsultantIds],
  );
  const selectedConsultantLookup = useMemo(() => {
    const ids = new Set<string>();
    const names = new Set<string>();
    selectedConsultantOptions.forEach((item) => {
      ids.add(item.id.trim().toLowerCase());
      names.add(item.name.trim().toLowerCase());
    });
    return { ids, names };
  }, [selectedConsultantOptions]);
  const allConsultantsSelected =
    consultantOptionValues.length > 0 &&
    selectedListConsultantIds.length === consultantOptionValues.length;
  const dashboardActorOptionValues = useMemo(
    () => actionActorOptions.map((item) => item.id),
    [actionActorOptions],
  );
  const allDashboardActorsSelected =
    dashboardActorOptionValues.length > 0 &&
    selectedDashboardActorIds.length === dashboardActorOptionValues.length;

  const consultantMultiSelectControl = (
    <ToolbarField
      label={t("schedule.consultant")}
      srOnlyLabel
      className="sm:min-w-[240px]"
      contentClassName="w-full"
    >
      <div className="w-full min-w-[220px]">
        <LeadTypesMultiSelect
          value={selectedListConsultantIds}
          options={consultantOptions}
          onChange={setSelectedListConsultantIds}
          placeholder={t("schedule.consultant")}
          allSelectedLabel={t("schedule.dashboard.allConsultants")}
          searchPlaceholder={t("schedule.appointmentsSearchPlaceholder")}
          noResultsText={t("schedule.emptyConsultant")}
          selectedCountTemplate={t("schedule.multiSelectSelectedCount")}
          selectAllLabel={t("schedule.multiSelectSelectAll")}
          clearAllLabel={t("schedule.multiSelectClearAll")}
        />
      </div>
    </ToolbarField>
  );

  const dashboardActorMultiSelectControl = (
    <ToolbarField
      label={t("schedule.actionsList.actorLabel")}
      srOnlyLabel
      className="sm:min-w-[240px]"
      contentClassName="w-full"
    >
      <div className="w-full min-w-[220px]">
        <LeadTypesMultiSelect
          value={selectedDashboardActorIds}
          options={actionActorOptions.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={setSelectedDashboardActorIds}
          placeholder={t("schedule.actionsList.actorLabel")}
          allSelectedLabel={t("schedule.dashboard.allActors")}
          searchPlaceholder={t("schedule.actionsList.searchPlaceholder")}
          noResultsText={t("schedule.emptyConsultant")}
          selectedCountTemplate={t("schedule.multiSelectSelectedCount")}
          selectAllLabel={t("schedule.multiSelectSelectAll")}
          clearAllLabel={t("schedule.multiSelectClearAll")}
        />
      </div>
    </ToolbarField>
  );

  const scheduleConsultantControl = (
    <ToolbarField
      label={t("schedule.consultant")}
      srOnlyLabel
      className="sm:min-w-[220px]"
      contentClassName="w-full"
    >
      <select
        value={selectedConsultantId ?? ""}
        onChange={(event) => {
          const next = event.target.value || null;
          setSelectedConsultantId(next);
        }}
        disabled={!consultants.length}
        aria-label={t("schedule.consultant")}
        className={toolbarInputClass}
      >
        {consultants.length ? (
          consultants.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))
        ) : (
          <option value="">{t("schedule.emptyConsultant")}</option>
        )}
      </select>
    </ToolbarField>
  );

  const isSuggestedAppointment = useCallback(
    (appointment: Appointment) => {
      const creator = normalizeIdentity(appointment.createdBy);
      const consultant = normalizeIdentity(appointment.consultantName);
      if (!creator || !consultant) return false;
      return creator !== consultant;
    },
    [normalizeIdentity],
  );

  const companySkeletonRows = useMemo(
    () => Array.from({ length: companiesPerPage }, (_, index) => index),
    [companiesPerPage],
  );
  const appointmentSkeletonRows = useMemo(
    () => Array.from({ length: appointmentsPerPage }, (_, index) => index),
    [appointmentsPerPage],
  );

  const weeks = useMemo(() => getWeeksForMonth(selectedMonth), [selectedMonth]);

  useEffect(() => {
    if (!weeks.length) return;
    setSelectedWeekIndex((current) => {
      if (current >= 0 && current < weeks.length) return current;
      const todayKey = toDateKey(today);
      const index = weeks.findIndex(
        (week) =>
          todayKey >= toDateKey(week.startAt) &&
          todayKey <= toDateKey(week.endAt),
      );
      return index >= 0 ? index : 0;
    });
  }, [weeks, today]);

  useEffect(() => {
    if (!persistedCronogramaState.selectedConsultantId) return;
    if (!consultants.length) return;
    if (
      consultants.some(
        (item) => item.id === persistedCronogramaState.selectedConsultantId,
      ) &&
      selectedConsultantId !== persistedCronogramaState.selectedConsultantId
    ) {
      setSelectedConsultantId(persistedCronogramaState.selectedConsultantId);
    }
  }, [
    consultants,
    persistedCronogramaState.selectedConsultantId,
    selectedConsultantId,
    setSelectedConsultantId,
  ]);

  useEffect(() => {
    setSelectedListConsultantIds((current) => {
      if (!consultantOptionValues.length) return [];
      const sanitized = current.filter((value) =>
        consultantOptionValues.includes(value),
      );
      if (sanitized.length) return sanitized;
      return consultantOptionValues;
    });
  }, [consultantOptionValues]);

  useEffect(() => {
    setSelectedDashboardActorIds((current) => {
      if (!dashboardActorOptionValues.length) return [];
      const sanitized = current.filter((value) =>
        dashboardActorOptionValues.includes(value),
      );
      if (sanitized.length) return sanitized;
      return dashboardActorOptionValues;
    });
  }, [dashboardActorOptionValues]);

  useEffect(() => {
    saveSessionStorage(CRONOGRAMA_SESSION_STORAGE_KEY, {
      viewMode,
      dashboardView,
      dashboardStage,
      selectedConsultantId,
      selectedListConsultantIds,
      selectedDashboardActorIds,
      companySort,
      companyPage,
      companySearch,
      companyNameFilter,
      companyConsultantFilter,
      companyVisibleColumns,
      appointmentSearch,
      appointmentCompanyFilter,
      appointmentConsultantFilter,
      appointmentVisibleColumns,
      appointmentStatus,
      appointmentOpportunity,
      cronogramaStatus,
      appointmentSort,
      appointmentPage,
      showOutsidePortfolio,
      selectedMonth: toMonthKey(selectedMonth),
      selectedWeekIndex,
    } satisfies CronogramaSessionState);
  }, [
    appointmentOpportunity,
    appointmentPage,
    appointmentCompanyFilter,
    appointmentConsultantFilter,
    appointmentSearch,
    appointmentSort,
    appointmentStatus,
    appointmentVisibleColumns,
    companyPage,
    companyNameFilter,
    companyConsultantFilter,
    companySearch,
    companySort,
    companyVisibleColumns,
    cronogramaStatus,
    dashboardStage,
    dashboardView,
    selectedDashboardActorIds,
    selectedListConsultantIds,
    selectedConsultantId,
    selectedMonth,
    selectedWeekIndex,
    showOutsidePortfolio,
    viewMode,
  ]);

  const selectedWeek = weeks[selectedWeekIndex] ?? weeks[0];
  const dashboardRange = useMemo(() => {
    if (dashboardView === "year") return getYearRange(selectedMonth);
    if (dashboardView === "month") return getMonthRange(selectedMonth);
    if (selectedWeek) {
      return {
        startAt: selectedWeek.startAt,
        endAt: selectedWeek.endAt,
      };
    }
    return getMonthRange(selectedMonth);
  }, [dashboardView, selectedMonth, selectedWeek]);
  const defaultCreateDate = useMemo(() => {
    if (!selectedWeek) return today;
    const todayKey = toDateKey(today);
    const startKey = toDateKey(selectedWeek.startAt);
    const endKey = toDateKey(selectedWeek.endAt);
    if (todayKey >= startKey && todayKey <= endKey) return today;
    return selectedWeek.startAt;
  }, [selectedWeek, today]);

  useEffect(() => {
    if (activeTab === "dashboard") {
      setRange(dashboardRange);
      return;
    }
    if (!selectedWeek) return;
    setRange({ startAt: selectedWeek.startAt, endAt: selectedWeek.endAt });
  }, [activeTab, dashboardRange, selectedWeek, setRange]);

  const weekDays = useMemo(() => {
    if (!selectedWeek) return [];
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(selectedWeek.startAt, index);
      return {
        date,
        label: formatWeekday(date, "long"),
        shortLabel: formatWeekday(date, "short"),
        dateLabel: formatDateLabel(date),
        isToday: isSameDay(date, today),
      };
    });
  }, [selectedWeek, today]);

  const dayNumberFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
      }),
    [locale],
  );
  const monthShortFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
      }),
    [locale],
  );
  const monthDayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
      }),
    [locale],
  );
  const fullDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    [locale],
  );
  const monthYearFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }),
    [locale],
  );
  const yearNumberFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
      }),
    [locale],
  );

  const monthSelectOptions = useMemo(() => {
    const options: PeriodOption[] = [];
    const baseYear = selectedMonth.getFullYear();
    for (let year = baseYear - 4; year <= baseYear + 3; year += 1) {
      for (let month = 0; month < 12; month += 1) {
        const date = new Date(year, month, 1);
        options.push({
          value: toMonthKey(date),
          label: formatMonthLabel(date),
        });
      }
    }
    return options;
  }, [selectedMonth]);

  const yearSelectOptions = useMemo(() => {
    const options: PeriodOption[] = [];
    const baseYear = selectedMonth.getFullYear();
    for (let year = baseYear - 7; year <= baseYear + 7; year += 1) {
      const date = new Date(year, 0, 1);
      options.push({
        value: String(year),
        label: yearNumberFormatter.format(date),
      });
    }
    return options;
  }, [selectedMonth, yearNumberFormatter]);

  const dashboardBuckets = useMemo(() => {
    if (dashboardView === "week") {
      return weekDays.map((day) => ({
        key: toDateKey(day.date),
        label: day.shortLabel,
        fullLabel: fullDateFormatter.format(day.date),
      }));
    }
    if (dashboardView === "month") {
      const monthRange = getMonthRange(selectedMonth);
      const totalDays = monthRange.endAt.getDate();
      return Array.from({ length: totalDays }, (_, index) => {
        const date = new Date(
          selectedMonth.getFullYear(),
          selectedMonth.getMonth(),
          index + 1,
        );
        return {
          key: toDateKey(date),
          label: dayNumberFormatter.format(date),
          fullLabel: monthDayFormatter.format(date),
        };
      });
    }
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(selectedMonth.getFullYear(), index, 1);
      return {
        key: `${selectedMonth.getFullYear()}-${String(index + 1).padStart(2, "0")}`,
        label: monthShortFormatter.format(date),
        fullLabel: monthYearFormatter.format(date),
      };
    });
  }, [
    dashboardView,
    dayNumberFormatter,
    fullDateFormatter,
    monthDayFormatter,
    monthShortFormatter,
    monthYearFormatter,
    selectedMonth,
    weekDays,
  ]);

  const dashboardAppointments =
    generalAppointments.filter((appointment) => {
      if (allConsultantsSelected) return true;
      const consultantId = appointment.consultantId?.trim().toLowerCase() ?? "";
      const consultantName =
        appointment.consultantName?.trim().toLowerCase() ?? "";
      return (
        selectedConsultantLookup.ids.has(consultantId) ||
        selectedConsultantLookup.ids.has(consultantName) ||
        selectedConsultantLookup.names.has(consultantId) ||
        selectedConsultantLookup.names.has(consultantName)
      );
    });
  const dashboardCompanies = useMemo(() => {
    const companyIds = new Set(
      dashboardAppointments.map((appointment) => appointment.companyId),
    );
    return generalCompanies.filter((company) => companyIds.has(company.id));
  }, [dashboardAppointments, generalCompanies]);
  const dashboardCompanyById = useMemo(
    () => new Map(dashboardCompanies.map((company) => [company.id, company])),
    [dashboardCompanies],
  );
  const dashboardCountableAppointments = useMemo(
    () =>
      dashboardAppointments.filter(
        (appointment) =>
          dashboardCompanyById.get(appointment.companyId)?.isCompany !== false,
      ),
    [dashboardAppointments, dashboardCompanyById],
  );
  const dashboardLoading = generalLoading;
  const dashboardError = generalError;
  const isGeneralScope = allConsultantsSelected;

  const consultantNameMap = useMemo(() => {
    const map = new Map<string, string>();
    dashboardCompanies.forEach((company) => {
      const csa = normalizeConsultantText(company.csa);
      if (!csa) return;
      const email = normalizeConsultantText(company.emailCsa).toLowerCase();
      if (email) map.set(email, csa);
      map.set(csa.toLowerCase(), csa);
    });
    return map;
  }, [dashboardCompanies, normalizeConsultantText]);

  const appointmentConsultantById = useMemo(() => {
    const map = new Map<string, string>();
    dashboardCountableAppointments.forEach((appointment) => {
      const rawConsultant =
        normalizeConsultantText(appointment.consultantName) ||
        normalizeConsultantText(appointment.consultantId) ||
        "";
      const normalizedConsultant = rawConsultant.toLowerCase();
      const consultantLabel =
        (normalizedConsultant
          ? consultantNameMap.get(normalizedConsultant)
          : null) ??
        (rawConsultant || t("schedule.dashboard.unknownConsultant"));
      map.set(appointment.id, consultantLabel);
    });
    return map;
  }, [
    dashboardCountableAppointments,
    consultantNameMap,
    normalizeConsultantText,
    t,
  ]);

  const dashboardMetrics = useMemo(() => {
    const statusTotals: Record<SupabaseAppointmentStatus, number> = {
      scheduled: 0,
      in_progress: 0,
      done: 0,
      absent: 0,
      atuado: 0,
    };
    let checkIns = 0;
    let checkOuts = 0;
    let realDurationMs = 0;
    let realDurationCount = 0;
    let sharedAppointments = 0;
    let sharedActedAppointments = 0;
    const sharedWithTotals = new Map<string, number>();

    const byConsultant = new Map<string, number>();
    const byBucket = new Map<string, number>();
    const byConsultantBucket = new Map<string, Map<string, number>>();
    const byCompletedConsultantBucket = new Map<string, Map<string, number>>();
    const opportunityTotals = new Map<string, number>();

    dashboardCountableAppointments.forEach((appointment) => {
      statusTotals[appointment.status] += 1;
      if (appointment.checkInAt) checkIns += 1;
      if (appointment.checkOutAt) checkOuts += 1;
      const isSharedAppointment = appointment.sharedWith.length > 0;
      if (isSharedAppointment) {
        sharedAppointments += 1;
        if (appointment.status === "atuado") {
          sharedActedAppointments += 1;
        }
      }
      appointment.sharedWith.forEach((sharedName) => {
        const normalizedName = sharedName.trim();
        if (!normalizedName) return;
        sharedWithTotals.set(
          normalizedName,
          (sharedWithTotals.get(normalizedName) ?? 0) + 1,
        );
      });

      const rawConsultant =
        normalizeConsultantText(appointment.consultantName) ||
        normalizeConsultantText(appointment.consultantId) ||
        "";
      const normalizedConsultant = rawConsultant.toLowerCase();
      const consultantLabel =
        (normalizedConsultant
          ? consultantNameMap.get(normalizedConsultant)
          : null) ??
        (rawConsultant || t("schedule.dashboard.unknownConsultant"));
      byConsultant.set(
        consultantLabel,
        (byConsultant.get(consultantLabel) ?? 0) + 1,
      );

      const checkInAt = appointment.checkInAt
        ? new Date(appointment.checkInAt)
        : null;
      const checkOutAt = appointment.checkOutAt
        ? new Date(appointment.checkOutAt)
        : null;
      if (
        checkInAt &&
        checkOutAt &&
        !Number.isNaN(checkInAt.getTime()) &&
        !Number.isNaN(checkOutAt.getTime()) &&
        checkOutAt.getTime() > checkInAt.getTime()
      ) {
        realDurationMs += checkOutAt.getTime() - checkInAt.getTime();
        realDurationCount += 1;
      }

      appointment.oportunidades?.forEach((opportunity) => {
        const raw = opportunity?.trim();
        if (!raw) return;
        const normalized = raw.toLowerCase();
        const canonical =
          OPPORTUNITY_OPTIONS.find(
            (option) => option.id.toLowerCase() === normalized,
          )?.id ?? normalized;
        opportunityTotals.set(
          canonical,
          (opportunityTotals.get(canonical) ?? 0) + 1,
        );
      });

      const startDate = new Date(appointment.startAt);
      if (Number.isNaN(startDate.getTime())) return;
      const bucketKey =
        dashboardView === "year"
          ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`
          : toDateKey(startDate);
      byBucket.set(bucketKey, (byBucket.get(bucketKey) ?? 0) + 1);

      const bucketConsultants = byConsultantBucket.get(bucketKey) ?? new Map();
      bucketConsultants.set(
        consultantLabel,
        (bucketConsultants.get(consultantLabel) ?? 0) + 1,
      );
      byConsultantBucket.set(bucketKey, bucketConsultants);

      if (appointment.status === "done" || appointment.status === "atuado") {
        const completedBucketConsultants =
          byCompletedConsultantBucket.get(bucketKey) ?? new Map();
        completedBucketConsultants.set(
          consultantLabel,
          (completedBucketConsultants.get(consultantLabel) ?? 0) + 1,
        );
        byCompletedConsultantBucket.set(bucketKey, completedBucketConsultants);
      }
    });

    const appointmentsByDay = dashboardBuckets.map((bucket) => {
      const key = bucket.key;
      return {
        key,
        label: bucket.label,
        fullLabel: bucket.fullLabel,
        total: byBucket.get(key) ?? 0,
      };
    });

    const companiesByState = (() => {
      const map = new Map<string, number>();
      const companyIds = new Set(
        dashboardCountableAppointments.map((appointment) => appointment.companyId),
      );
      companyIds.forEach((companyId) => {
        const company = dashboardCompanyById.get(companyId);
        if (!company) return;
        const state = company.state?.trim() || t("schedule.dashboard.noState");
        map.set(state, (map.get(state) ?? 0) + 1);
      });
      return Array.from(map.entries())
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    })();

    const topConsultants = Array.from(byConsultant.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const totalAppointments = dashboardCountableAppointments.length;
    const totalCompanies = dashboardCompanies.length;
    const totalCompaniesInPeriod = new Set(
      dashboardCountableAppointments.map((appointment) => appointment.companyId),
    ).size;
    const avgRealDurationMinutes =
      realDurationCount > 0
        ? Math.round(realDurationMs / 60000 / realDurationCount)
        : null;
    const periodsWithVisits = Array.from(byBucket.values()).filter(
      (value) => value > 0,
    ).length;
    const totalCompletedAppointments =
      statusTotals.done + statusTotals.atuado;
    const avgVisitsPerDayAllConsultants = periodsWithVisits
      ? Math.round((totalCompletedAppointments / periodsWithVisits) * 10) / 10
      : 0;
    const doneRate = totalAppointments
      ? Math.round(
          ((statusTotals.done + statusTotals.atuado) / totalAppointments) * 100,
        )
      : 0;
    const absentRate = totalAppointments
      ? Math.round((statusTotals.absent / totalAppointments) * 100)
      : 0;
    const checkInRate = totalAppointments
      ? Math.round((checkIns / totalAppointments) * 100)
      : 0;
    const checkOutRate = totalAppointments
      ? Math.round((checkOuts / totalAppointments) * 100)
      : 0;

    return {
      totalAppointments,
      totalCompanies,
      totalCompaniesInPeriod,
      statusTotals,
      appointmentsByDay,
      byConsultantBucket,
      byCompletedConsultantBucket,
      companiesByState,
      topConsultants,
      opportunityTotals,
      avgRealDurationMinutes,
      avgVisitsPerDayAllConsultants,
      sharedAppointments,
      sharedActedAppointments,
      sharedWithTotals,
      totalCompletedAppointments,
      doneRate,
      absentRate,
      checkInRate,
      checkOutRate,
    };
  }, [
    dashboardCompanyById,
    dashboardCountableAppointments,
    dashboardBuckets,
    dashboardCompanies,
    dashboardView,
    consultantNameMap,
    normalizeConsultantText,
    t,
  ]);

  const visitStatusData = useMemo(
    () => [
      {
        id: "scheduled",
        label: t("schedule.status.scheduled"),
        count: dashboardMetrics.statusTotals.scheduled,
        color: statusChartColors.scheduled,
      },
      {
        id: "in_progress",
        label: t("schedule.status.in_progress"),
        count: dashboardMetrics.statusTotals.in_progress,
        color: statusChartColors.in_progress,
      },
      {
        id: "done",
        label: t("schedule.status.done"),
        count:
          dashboardMetrics.statusTotals.done + dashboardMetrics.statusTotals.atuado,
        color: statusChartColors.done,
      },
      {
        id: "absent",
        label: t("schedule.status.absent"),
        count: dashboardMetrics.statusTotals.absent,
        color: statusChartColors.absent,
      },
    ],
    [dashboardMetrics.statusTotals, t],
  );

  const filteredDashboardActions = useMemo(() => {
    if (allDashboardActorsSelected) return dashboardActions;
    const selectedActors = new Set(
      selectedDashboardActorIds.map((item) => item.trim().toLowerCase()),
    );
    if (!selectedActors.size) return [];
    return dashboardActions.filter((action) =>
      selectedActors.has(action.created_by?.trim().toLowerCase() ?? ""),
    );
  }, [allDashboardActorsSelected, dashboardActions, selectedDashboardActorIds]);

  const actionMetrics = useMemo(() => {
    const statusTotals = {
      em_andamento: 0,
      vendido: 0,
      perdido: 0,
    };
    const statusByActor = new Map<
      string,
      { em_andamento: number; vendido: number; perdido: number; total: number }
    >();
    const revenueByActor = new Map<string, number>();
    const opportunityTotals = new Map<string, number>();
    const lossReasonTotals = new Map<string, number>();
    const appointmentIds = new Set<string>();
    const companyIds = new Set<string>();
    let totalRevenue = 0;

    filteredDashboardActions.forEach((action) => {
      const actor = action.created_by?.trim().toLowerCase();
      const result = action.resultado;
      if (result && result in statusTotals) {
        statusTotals[result] += 1;
      }

      if (actor) {
        const current = statusByActor.get(actor) ?? {
          em_andamento: 0,
          vendido: 0,
          perdido: 0,
          total: 0,
        };
        if (result && result in current) {
          current[result] += 1;
        }
        current.total += 1;
        statusByActor.set(actor, current);
      }

      const opportunityType = action.tipo_oportunidade?.trim();
      if (opportunityType) {
        const normalized = opportunityType.toLowerCase();
        const canonical =
          OPPORTUNITY_OPTIONS.find(
            (option) => option.id.toLowerCase() === normalized,
          )?.id ?? normalized;
        opportunityTotals.set(
          canonical,
          (opportunityTotals.get(canonical) ?? 0) + 1,
        );
      }

      const lossReason = action.motivo_perda?.trim();
      if (lossReason) {
        lossReasonTotals.set(
          lossReason,
          (lossReasonTotals.get(lossReason) ?? 0) + 1,
        );
      }

      const appointmentId = action.apontamento_id?.trim();
      if (appointmentId) {
        appointmentIds.add(appointmentId);
      }

      const companyId = action.company_id?.trim();
      if (companyId) {
        companyIds.add(companyId);
      }

      const amount = toNumber(action.valor) ?? 0;
      if (result === "vendido" && amount > 0) {
        totalRevenue += amount;
        if (actor) {
          revenueByActor.set(actor, (revenueByActor.get(actor) ?? 0) + amount);
        }
      }
    });

    const actors = Array.from(statusByActor.entries())
      .map(([id, totals]) => ({
        id,
        name: formatActorDisplayName(id),
        ...totals,
      }))
      .sort(
        (a, b) =>
          b.total - a.total ||
          b.vendido - a.vendido ||
          a.name.localeCompare(b.name, "pt-BR"),
      );

    const revenueActors = Array.from(revenueByActor.entries())
      .map(([id, value]) => ({
        id,
        name: formatActorDisplayName(id),
        value,
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "pt-BR"));

    const averageTicket =
      statusTotals.vendido > 0 ? totalRevenue / statusTotals.vendido : 0;

    return {
      totalActions: filteredDashboardActions.length,
      totalAppointments: appointmentIds.size,
      totalCompanies: companyIds.size,
      totalActors: actors.length,
      totalRevenue,
      averageTicket,
      statusTotals,
      statusByActor: actors,
      revenueByActor: revenueActors,
      opportunityTotals,
      lossReasonTotals,
    };
  }, [filteredDashboardActions, formatActorDisplayName]);

  const actionResultData = useMemo(
    () => [
      {
        id: "em_andamento",
        label: t("appointment.action.resultInProgress"),
        count: actionMetrics.statusTotals.em_andamento,
        color: "#0EA5E9",
      },
      {
        id: "vendido",
        label: t("appointment.action.resultSold"),
        count: actionMetrics.statusTotals.vendido,
        color: "#10B981",
      },
      {
        id: "perdido",
        label: t("appointment.action.resultLost"),
        count: actionMetrics.statusTotals.perdido,
        color: "#F43F5E",
      },
    ],
    [actionMetrics.statusTotals, t],
  );

  const actionStatusByConsultantData = useMemo(
    () => actionMetrics.statusByActor.slice(0, 6),
    [actionMetrics.statusByActor],
  );

  const actionRevenueByConsultantData = useMemo(
    () => actionMetrics.revenueByActor.slice(0, 6),
    [actionMetrics.revenueByActor],
  );

  const actionOpportunityData = useMemo(
    () =>
      Array.from(actionMetrics.opportunityTotals.entries())
        .map(([id, count]) => ({
          id,
          label: t(`schedule.opportunity.${id}`, undefined, id),
          count,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, locale))
        .slice(0, 6),
    [actionMetrics.opportunityTotals, locale, t],
  );

  const actionLossReasonData = useMemo(
    () =>
      Array.from(actionMetrics.lossReasonTotals.entries())
        .map(([id, count]) => ({
          id,
          label: t(`appointment.action.lossReasons.${id}`, undefined, id),
          count,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, locale))
        .slice(0, 6),
    [actionMetrics.lossReasonTotals, locale, t],
  );

  const consultantAvgVisits = useMemo(() => {
    const totals = new Map<
      string,
      { total: number; completed: number; days: number }
    >();
    dashboardMetrics.byConsultantBucket.forEach((consultants) => {
      consultants.forEach((count, name) => {
        if (!count) return;
        const entry = totals.get(name) ?? { total: 0, completed: 0, days: 0 };
        entry.total += count;
        entry.days += 1;
        totals.set(name, entry);
      });
    });

    dashboardMetrics.byCompletedConsultantBucket.forEach((consultants) => {
      consultants.forEach((count, name) => {
        if (!count) return;
        const entry = totals.get(name) ?? { total: 0, completed: 0, days: 0 };
        entry.completed += count;
        totals.set(name, entry);
      });
    });

    return Array.from(totals.entries())
      .map(([name, value]) => ({
        name,
        avgTotal: value.days ? value.total / value.days : 0,
        avgCompleted: value.days ? value.completed / value.days : 0,
        total: value.total,
        completed: value.completed,
        days: value.days,
      }))
      .filter((item) => item.days > 0)
      .sort(
        (a, b) =>
          b.avgTotal - a.avgTotal ||
          b.avgCompleted - a.avgCompleted ||
          b.total - a.total,
      )
      .slice(0, 6);
  }, [
    dashboardMetrics.byCompletedConsultantBucket,
    dashboardMetrics.byConsultantBucket,
  ]);

  const opportunityIds = useMemo(() => {
    const base = OPPORTUNITY_OPTIONS.map((item) => item.id);
    const extras = Array.from(dashboardMetrics.opportunityTotals.keys()).filter(
      (id) => !base.includes(id),
    );
    return [...base, ...extras].filter((id) =>
      dashboardMetrics.opportunityTotals.has(id),
    );
  }, [dashboardMetrics.opportunityTotals]);

  const dashboardOpportunitiesData = useMemo(
    () =>
      opportunityIds.map((id) => ({
        id,
        label: t(`schedule.opportunity.${id}`, undefined, id),
        count: dashboardMetrics.opportunityTotals.get(id) ?? 0,
      }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, locale)),
    [dashboardMetrics.opportunityTotals, locale, opportunityIds, t],
  );

  const activityLabelMap = useMemo(
    () => ({
      reconexao: t("appointment.activity.reconexao"),
      medicao_mr: t("appointment.activity.medicao_mr"),
      analise_fluido_arref: t("appointment.activity.analise_fluido_arref"),
      proposta_preventiva: t("appointment.activity.proposta_preventiva"),
      proposta_powergard: t("appointment.activity.proposta_powergard"),
      outro: t("appointment.activity.outro"),
    }),
    [t],
  );

  const dashboardActivitiesData = useMemo(() => {
    const ordered = [
      "reconexao",
      "medicao_mr",
      "analise_fluido_arref",
      "proposta_preventiva",
      "proposta_powergard",
      "outro",
    ];
    for (const key of activityCounts.keys()) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered
      .filter((key) => activityCounts.has(key))
      .map((key) => ({
        id: key,
        label:
          activityLabelMap[key as keyof typeof activityLabelMap] ??
          t(`appointment.activity.${key}`, undefined, key),
        count: activityCounts.get(key) ?? 0,
      }));
  }, [activityCounts, activityLabelMap, t]);

  const dashboardActivitiesByConsultant = useMemo(() => {
    return Array.from(activityByConsultantCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [activityByConsultantCounts]);

  const visibleAppointments = useMemo(
    () =>
      cronogramaStatus.length > 0
        ? appointments.filter((appointment) =>
            cronogramaStatus.includes(appointment.status),
          )
        : appointments,
    [appointments, cronogramaStatus],
  );

  const timelineByDay = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    visibleAppointments.forEach((appointment) => {
      const range = resolveTimelineRange(appointment);
      const dateKey = toDateKey(range.start);
      const bucket = map.get(dateKey) ?? [];
      bucket.push({ appointment, ...range });
      map.set(dateKey, bucket);
    });
    return map;
  }, [visibleAppointments]);

  const timelineHours = useMemo(() => {
    let min = 7;
    let max = 19;
    for (const day of weekDays) {
      const items = timelineByDay.get(toDateKey(day.date)) ?? [];
      items.forEach((item) => {
        const startHour = item.start.getHours() + item.start.getMinutes() / 60;
        const endHour = item.end.getHours() + item.end.getMinutes() / 60;
        min = Math.min(min, Math.floor(startHour));
        max = Math.max(max, Math.ceil(endHour));
      });
    }
    min = Math.max(0, Math.min(min, 22));
    max = Math.max(min + 6, Math.min(max, 23));
    return { min, max };
  }, [timelineByDay, weekDays]);

  const hourSlots = useMemo(() => {
    const slots: number[] = [];
    for (let hour = timelineHours.min; hour <= timelineHours.max; hour += 1) {
      slots.push(hour);
    }
    return slots;
  }, [timelineHours]);

  const zoomLevels = [44, 56, 72, 88, 104];
  const hourRowHeight = zoomLevels[zoomLevel] ?? 56;
  const minuteHeight = hourRowHeight / 60;
  const timelineHeight = hourSlots.length * hourRowHeight;

  const companyById = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);
  const listCompanyById = useMemo(() => {
    return new Map(generalListCompanies.map((company) => [company.id, company]));
  }, [generalListCompanies]);
  const appointmentCompanyOptions = useMemo(
    () =>
      Array.from(
        new Map(
          listAppointments
            .map((appointment) => listCompanyById.get(appointment.companyId)?.name?.trim())
            .filter((value): value is string => Boolean(value))
            .map((value) => [value, value]),
        ).values(),
      )
        .sort((a, b) => a.localeCompare(b, locale))
        .map((value) => ({ value, label: value })),
    [listAppointments, listCompanyById, locale],
  );
  const appointmentConsultantOptions = useMemo(
    () =>
      Array.from(
        new Map(
          listAppointments
            .map(
              (appointment) =>
                appointment.consultantName?.trim() ??
                appointment.consultantId?.trim() ??
                "",
            )
            .filter(Boolean)
            .map((value) => [value, value]),
        ).values(),
      )
        .sort((a, b) => a.localeCompare(b, locale))
        .map((value) => ({ value, label: value })),
    [listAppointments, locale],
  );
  const companyNameOptions = useMemo(
    () =>
      Array.from(
        new Map(
          generalListCompanies
            .map((company) => company.name.trim())
            .filter(Boolean)
            .map((value) => [value, value]),
        ).values(),
      )
        .sort((a, b) => a.localeCompare(b, locale))
        .map((value) => ({ value, label: value })),
    [generalListCompanies, locale],
  );
  const companyConsultantOptions = useMemo(
    () =>
      Array.from(
        new Map(
          generalListCompanies
            .map((company) => company.csa?.trim() ?? "")
            .filter(Boolean)
            .map((value) => [value, value]),
        ).values(),
      )
        .sort((a, b) => a.localeCompare(b, locale))
        .map((value) => ({ value, label: value })),
    [generalListCompanies, locale],
  );
  useEffect(() => {
    setAppointmentCompanyFilter((current) =>
      current.filter((value) =>
        appointmentCompanyOptions.some((option) => option.value === value),
      ),
    );
  }, [appointmentCompanyOptions]);
  useEffect(() => {
    setAppointmentConsultantFilter((current) =>
      current.filter((value) =>
        appointmentConsultantOptions.some((option) => option.value === value),
      ),
    );
  }, [appointmentConsultantOptions]);
  useEffect(() => {
    setCompanyNameFilter((current) =>
      current.filter((value) =>
        companyNameOptions.some((option) => option.value === value),
      ),
    );
  }, [companyNameOptions]);
  useEffect(() => {
    setCompanyConsultantFilter((current) =>
      current.filter((value) =>
        companyConsultantOptions.some((option) => option.value === value),
      ),
    );
  }, [companyConsultantOptions]);

  const totalAppointments = visibleAppointments.length;
  const normalizedCompanySearch = companySearch.trim().toLowerCase();
  const normalizedAppointmentSearch = appointmentSearch.trim().toLowerCase();
  const todayStart = useMemo(() => startOfDay(today), [today]);

  const filteredAppointments = useMemo(() => {
    if (!selectedListConsultantIds.length) return [];
    return listAppointments.filter((appointment) => {
      if (!allConsultantsSelected) {
        const consultantId = appointment.consultantId?.trim().toLowerCase() ?? "";
        const consultantName =
          appointment.consultantName?.trim().toLowerCase() ?? "";
        const matchesConsultant =
          selectedConsultantLookup.ids.has(consultantId) ||
          selectedConsultantLookup.ids.has(consultantName) ||
          selectedConsultantLookup.names.has(consultantId) ||
          selectedConsultantLookup.names.has(consultantName);
        if (!matchesConsultant) {
          return false;
        }
      }
      const isExpired = isExpiredAppointment(appointment, todayStart);
      if (appointmentStatus.length > 0) {
        const matchesExpired = appointmentStatus.includes("expired") && isExpired;
        const matchesStatus =
          appointment.status === "scheduled"
            ? appointmentStatus.includes("scheduled") && !isExpired
            : appointmentStatus.includes(appointment.status);
        if (!matchesExpired && !matchesStatus) {
          return false;
        }
      }
      if (appointmentOpportunity.length > 0) {
        const opportunities = appointment.oportunidades ?? [];
        const hasAnyOpportunity = appointmentOpportunity.some((selected) =>
          opportunities.includes(selected),
        );
        if (!hasAnyOpportunity) {
          return false;
        }
      }
      const companyName = listCompanyById.get(appointment.companyId)?.name ?? "";
      if (
        appointmentCompanyFilter.length &&
        !appointmentCompanyFilter.some((value) => value === companyName)
      ) {
        return false;
      }
      const consultantLabel =
        appointment.consultantName ?? appointment.consultantId ?? "";
      if (
        appointmentConsultantFilter.length &&
        !appointmentConsultantFilter.some((value) => value === consultantLabel)
      ) {
        return false;
      }
      if (!normalizedAppointmentSearch) return true;
      const company = listCompanyById.get(appointment.companyId);
      const tokens = [
        company?.name,
        company?.document,
        appointment.consultantName,
        appointment.consultantId,
        appointment.status,
        isExpired
          ? t("schedule.statusExpired")
          : t(`schedule.status.${appointment.status}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.includes(normalizedAppointmentSearch);
    });
  }, [
    allConsultantsSelected,
    appointmentStatus,
    appointmentOpportunity,
    appointmentCompanyFilter,
    appointmentConsultantFilter,
    listAppointments,
    listCompanyById,
    normalizedAppointmentSearch,
    selectedConsultantLookup,
    selectedListConsultantIds.length,
    t,
    todayStart,
  ]);

  const sortedAppointments = useMemo(() => {
    const sorted = [...filteredAppointments];
    const getOpenQuotes = (companyId: string) => openQuotesTotals.get(companyId) ?? 0;
    sorted.sort((a, b) => {
      if (appointmentSort === "date_desc") {
        return b.startAt.localeCompare(a.startAt);
      }
      if (appointmentSort === "date_asc") {
        return a.startAt.localeCompare(b.startAt);
      }
      const companyA = listCompanyById.get(a.companyId)?.name ?? "";
      const companyB = listCompanyById.get(b.companyId)?.name ?? "";
      const consultantA = a.consultantName ?? a.consultantId ?? "";
      const consultantB = b.consultantName ?? b.consultantId ?? "";
      const nameComparison = companyA.localeCompare(companyB, locale);
      if (appointmentSort === "cotacoes") {
        const diff = getOpenQuotes(b.companyId) - getOpenQuotes(a.companyId);
        if (diff !== 0) return diff;
        return nameComparison !== 0
          ? nameComparison
          : a.startAt.localeCompare(b.startAt);
      }
      if (appointmentSort === "alpha_desc") {
        return nameComparison !== 0
          ? -nameComparison
          : b.startAt.localeCompare(a.startAt);
      }
      if (appointmentSort === "consultant_asc") {
        const consultantComparison = consultantA.localeCompare(consultantB, locale);
        return consultantComparison !== 0
          ? consultantComparison
          : a.startAt.localeCompare(b.startAt);
      }
      if (appointmentSort === "consultant_desc") {
        const consultantComparison = consultantB.localeCompare(consultantA, locale);
        return consultantComparison !== 0
          ? consultantComparison
          : b.startAt.localeCompare(a.startAt);
      }
      return nameComparison !== 0
        ? nameComparison
        : a.startAt.localeCompare(b.startAt);
    });
    return sorted;
  }, [appointmentSort, filteredAppointments, listCompanyById, locale, openQuotesTotals]);

  useEffect(() => {
    setAppointmentPage(1);
  }, [
    appointmentCompanyFilter,
    appointmentConsultantFilter,
    appointmentSearch,
    appointmentStatus,
    appointmentOpportunity,
    appointmentSort,
  ]);

  const totalAppointmentPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / appointmentsPerPage),
  );

  useEffect(() => {
    setAppointmentPage((current) =>
      Math.min(Math.max(current, 1), totalAppointmentPages),
    );
  }, [totalAppointmentPages]);

  const paginatedAppointments = useMemo(() => {
    const start = (appointmentPage - 1) * appointmentsPerPage;
    return sortedAppointments.slice(start, start + appointmentsPerPage);
  }, [appointmentPage, appointmentsPerPage, sortedAppointments]);

  const appointmentPageSummary = useMemo(() => {
    if (filteredAppointments.length === 0) {
      return {
        start: 0,
        end: 0,
        total: 0,
      };
    }
    const start = (appointmentPage - 1) * appointmentsPerPage + 1;
    const end = Math.min(
      appointmentPage * appointmentsPerPage,
      filteredAppointments.length,
    );
    return {
      start,
      end,
      total: filteredAppointments.length,
    };
  }, [appointmentPage, appointmentsPerPage, filteredAppointments.length]);

  const companiesForListScope = useMemo(() => {
    if (allConsultantsSelected) return generalListCompanies;
    if (!selectedConsultantOptions.length) return [];
    return generalListCompanies.filter((company) =>
      selectedConsultantOptions.some((consultant) =>
        matchesConsultantCompany(company, consultant.name),
      ),
    );
  }, [allConsultantsSelected, generalListCompanies, selectedConsultantOptions]);

  const companiesByPortfolio = useMemo(() => {
    if (!companiesForListScope.length) return [];
    return companiesForListScope.filter((company) =>
      showOutsidePortfolio
        ? Boolean(company.foraCarteira)
        : !company.foraCarteira,
    );
  }, [companiesForListScope, showOutsidePortfolio]);

  const companyIdsByConsultant = useMemo(
    () =>
      Array.from(new Set(companiesByPortfolio.map((company) => company.id))),
    [companiesByPortfolio],
  );

  const protheusLookup = useMemo(() => {
    const variantToCompany = new Map<string, string>();
    const variants: string[] = [];

    companiesByPortfolio.forEach((company) => {
      const docs = buildDocumentVariants(company.document);
      docs.forEach((doc) => {
        if (!doc) return;
        if (!variantToCompany.has(doc)) {
          variantToCompany.set(doc, company.id);
        }
        variants.push(doc);
      });
    });

    return {
      variantToCompany,
      variants: Array.from(new Set(variants)),
    };
  }, [companiesByPortfolio]);

  const openQuotesLookup = useMemo(() => {
    const cnpjToCompany = new Map<string, string>();
    const cnpjs: string[] = [];

    companiesByPortfolio.forEach((company) => {
      const cnpj = normalizeCnpj(company.document);
      if (!cnpj) return;
      if (!cnpjToCompany.has(cnpj)) {
        cnpjToCompany.set(cnpj, company.id);
      }
      cnpjs.push(cnpj);
    });

    return {
      cnpjToCompany,
      cnpjs: Array.from(new Set(cnpjs)),
    };
  }, [companiesByPortfolio]);

  useEffect(() => {
    if (!selectedListConsultantIds.length) {
      setProtheusCounts(new Map());
      setProtheusError(null);
      setProtheusLoading(false);
      return;
    }

    if (protheusLookup.variants.length === 0) {
      setProtheusCounts(new Map());
      setProtheusError(null);
      setProtheusLoading(false);
      return;
    }

    const requestId = ++protheusRequestIdRef.current;
    const loadCounts = async () => {
      setProtheusLoading(true);
      setProtheusError(null);
      let aggregated = new Map<string, ProtheusCounts>();

      const chunkSize = 200;
      for (
        let index = 0;
        index < protheusLookup.variants.length;
        index += chunkSize
      ) {
        const chunk = protheusLookup.variants.slice(index, index + chunkSize);
        try {
          const { data, error } = await supabase
            .from("base_protheus")
            .select("a1_cgc, tipo_lead")
            .in("a1_cgc", chunk);

          if (requestId !== protheusRequestIdRef.current) return;

          if (error) {
            console.error(error);
            setProtheusCounts(new Map());
            setProtheusLoading(false);
            setProtheusError(t("schedule.protheusLoadError"));
            return;
          }

          const rows = (data ?? []) as ProtheusLeadRow[];
          const counts = buildProtheusCounts(
            rows,
            protheusLookup.variantToCompany,
          );
          aggregated = mergeProtheusCounts(aggregated, counts);
        } catch (error) {
          console.error(error);
          if (requestId !== protheusRequestIdRef.current) return;
          setProtheusCounts(new Map());
          setProtheusLoading(false);
          setProtheusError(t("schedule.protheusLoadError"));
          return;
        }
      }

      if (requestId !== protheusRequestIdRef.current) return;
      setProtheusCounts(aggregated);
      setProtheusLoading(false);
    };

    void loadCounts();
  }, [protheusLookup, selectedListConsultantIds.length, supabase, t]);

  useEffect(() => {
    if (!selectedListConsultantIds.length) {
      setOpenQuotesTotals(new Map());
      setOpenQuotesError(null);
      setOpenQuotesLoading(false);
      return;
    }

    if (openQuotesLookup.cnpjs.length === 0) {
      setOpenQuotesTotals(new Map());
      setOpenQuotesError(null);
      setOpenQuotesLoading(false);
      return;
    }

    const requestId = ++openQuotesRequestIdRef.current;
    const loadOpenQuotes = async () => {
      setOpenQuotesLoading(true);
      setOpenQuotesError(null);

      const totals = new Map<string, number>();
      const seenQuotes = new Set<string>();
      const chunkSize = 200;

      for (
        let index = 0;
        index < openQuotesLookup.cnpjs.length;
        index += chunkSize
      ) {
        const chunk = openQuotesLookup.cnpjs.slice(index, index + chunkSize);
        try {
          const { data, error } = await supabase
            .from("base_csa_orc")
            .select("cnpj, vs1_numorc, vs1_filial, vs1_vtotnf, status")
            .in("cnpj", chunk)
            .eq("status", "ABERTO");

          if (requestId !== openQuotesRequestIdRef.current) return;

          if (error) {
            console.error(error);
            setOpenQuotesTotals(new Map());
            setOpenQuotesLoading(false);
            setOpenQuotesError(t("schedule.quotesLoadError"));
            return;
          }

          const rows = (data ?? []) as OrcamentoResumoRow[];
          rows.forEach((row) => {
            if (!isOpenQuoteStatus(row.status)) return;
            const cnpj = normalizeCnpj(row.cnpj);
            if (!cnpj) return;
            const companyId = openQuotesLookup.cnpjToCompany.get(cnpj);
            if (!companyId) return;
            const numorc = row.vs1_numorc != null ? String(row.vs1_numorc) : "";
            const filial = row.vs1_filial != null ? String(row.vs1_filial) : "";
            const quoteKey = `${cnpj}-${numorc}-${filial}`;
            if (seenQuotes.has(quoteKey)) return;
            seenQuotes.add(quoteKey);
            const value = toNumber(row.vs1_vtotnf);
            if (value == null) return;
            totals.set(companyId, (totals.get(companyId) ?? 0) + value);
          });
        } catch (error) {
          console.error(error);
          if (requestId !== openQuotesRequestIdRef.current) return;
          setOpenQuotesTotals(new Map());
          setOpenQuotesLoading(false);
          setOpenQuotesError(t("schedule.quotesLoadError"));
          return;
        }
      }

      if (requestId !== openQuotesRequestIdRef.current) return;
      setOpenQuotesTotals(totals);
      setOpenQuotesLoading(false);
    };

    void loadOpenQuotes();
  }, [openQuotesLookup, selectedListConsultantIds.length, supabase, t]);

  useEffect(() => {
    if (!selectedListConsultantIds.length) {
      setLastVisitByCompany(new Map());
      setLastVisitError(null);
      setLastVisitLoading(false);
      return;
    }

    if (companyIdsByConsultant.length === 0) {
      setLastVisitByCompany(new Map());
      setLastVisitError(null);
      setLastVisitLoading(false);
      return;
    }

    const requestId = ++lastVisitRequestIdRef.current;
    const loadLastVisits = async () => {
      setLastVisitLoading(true);
      setLastVisitError(null);
      let latestVisits = new Map<string, Date>();
      const chunkSize = 200;

      for (
        let index = 0;
        index < companyIdsByConsultant.length;
        index += chunkSize
      ) {
        const chunk = companyIdsByConsultant.slice(index, index + chunkSize);
        try {
          let query = supabase
            .from("apontamentos")
            .select("company_id, starts_at, ends_at, status, check_out_at")
            .in("company_id", chunk)
            .or("status.eq.done,check_out_at.not.is.null");

          const { data, error } = await query;

          if (requestId !== lastVisitRequestIdRef.current) return;

          if (error) {
            console.error(error);
            setLastVisitByCompany(new Map());
            setLastVisitLoading(false);
            setLastVisitError(t("schedule.lastVisitLoadError"));
            return;
          }

          const rows = (data ?? []) as LastVisitRow[];
          rows.forEach((row) => {
            const rawDate =
              row.check_out_at ?? row.ends_at ?? row.starts_at ?? null;
            if (!rawDate) return;
            const parsed = new Date(rawDate);
            if (Number.isNaN(parsed.getTime())) return;
            const current = latestVisits.get(row.company_id);
            if (!current || parsed > current) {
              latestVisits.set(row.company_id, parsed);
            }
          });
        } catch (error) {
          console.error(error);
          if (requestId !== lastVisitRequestIdRef.current) return;
          setLastVisitByCompany(new Map());
          setLastVisitLoading(false);
          setLastVisitError(t("schedule.lastVisitLoadError"));
          return;
        }
      }

      if (requestId !== lastVisitRequestIdRef.current) return;
      setLastVisitByCompany(latestVisits);
      setLastVisitLoading(false);
    };

    void loadLastVisits();
  }, [companyIdsByConsultant, selectedListConsultantIds.length, supabase, t]);

  const loadGeneralListCompanies = useCallback(async () => {
    const requestId = ++generalListCompaniesRequestIdRef.current;
    setGeneralListCompaniesLoading(true);
    setGeneralListCompaniesError(null);
    try {
      const { data, error: companiesError } = await supabase
        .from("companies")
        .select(COMPANY_LIST_SELECT)
        .order("name", { ascending: true });

      if (requestId !== generalListCompaniesRequestIdRef.current) return;

      if (companiesError) {
        console.error(companiesError);
        setGeneralListCompanies([]);
        setGeneralListCompaniesError(t("schedule.dashboard.loadCompaniesError"));
        setGeneralListCompaniesLoading(false);
        return;
      }

      setGeneralListCompanies((data ?? []).map(mapCompany));
      setGeneralListCompaniesLoading(false);
    } catch (err) {
      console.error(err);
      if (requestId !== generalListCompaniesRequestIdRef.current) return;
      setGeneralListCompanies([]);
      setGeneralListCompaniesError(t("schedule.dashboard.loadCompaniesError"));
      setGeneralListCompaniesLoading(false);
    }
  }, [supabase, t]);

  useEffect(() => {
    const isListTab =
      activeTab === "agendamentos" || activeTab === "empresas";
    if (!isListTab) return;
    void loadGeneralListCompanies();
  }, [activeTab, loadGeneralListCompanies]);

  const loadGeneralDashboard = useCallback(async () => {
    const requestId = ++generalRequestIdRef.current;
    setGeneralLoading(true);
    setGeneralError(null);
    try {
      const { data, error: appointmentsError } = await supabase
        .from("apontamentos")
        .select(APPOINTMENT_LIST_SELECT)
        .gte("starts_at", range.startIso)
        .lte("starts_at", range.endIso)
        .order("starts_at", { ascending: true });

      if (requestId !== generalRequestIdRef.current) return;

      if (appointmentsError) {
        console.error(appointmentsError);
        setGeneralAppointments([]);
        setGeneralCompanies([]);
        setGeneralError(t("schedule.dashboard.loadError"));
        setGeneralLoading(false);
        return;
      }

      const appointmentItems = (data ?? []).map(mapAppointment);
      setGeneralAppointments(appointmentItems);

      const companyIds = Array.from(
        new Set(appointmentItems.map((item) => item.companyId).filter(Boolean)),
      );

      if (!companyIds.length) {
        setGeneralCompanies([]);
        setGeneralLoading(false);
        return;
      }

      const chunkSize = 200;
      const collected: Company[] = [];

      for (let index = 0; index < companyIds.length; index += chunkSize) {
        const chunk = companyIds.slice(index, index + chunkSize);
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select(COMPANY_LIST_SELECT)
          .in("id", chunk);

        if (requestId !== generalRequestIdRef.current) return;

        if (companyError) {
          console.error(companyError);
          setGeneralCompanies([]);
          setGeneralError(t("schedule.dashboard.loadCompaniesError"));
          setGeneralLoading(false);
          return;
        }

        collected.push(...(companyData ?? []).map(mapCompany));
      }

      if (requestId !== generalRequestIdRef.current) return;
      setGeneralCompanies(collected);
      setGeneralLoading(false);
    } catch (err) {
      console.error(err);
      if (requestId !== generalRequestIdRef.current) return;
      setGeneralAppointments([]);
      setGeneralCompanies([]);
      setGeneralError(t("schedule.dashboard.loadError"));
      setGeneralLoading(false);
    }
  }, [range.endIso, range.startIso, supabase, t]);

  useEffect(() => {
    if (activeTab !== "dashboard") return;
    void loadGeneralDashboard();
  }, [activeTab, loadGeneralDashboard]);

  useEffect(() => {
    if (activeTab !== "dashboard") return;
    if (dashboardLoading) return;

    const appointmentIds = dashboardCountableAppointments
      .map((item) => item.id)
      .filter(Boolean);

    if (!appointmentIds.length) {
      setActivityCounts(new Map());
      setActivityError(null);
      setActivityLoading(false);
      return;
    }

    const requestId = ++activityRequestIdRef.current;
    const loadActivities = async () => {
      setActivityLoading(true);
      setActivityError(null);
      const counts = new Map<string, number>();
      const consultantCounts = new Map<string, number>();
      const chunkSize = 200;

      for (let index = 0; index < appointmentIds.length; index += chunkSize) {
        const chunk = appointmentIds.slice(index, index + chunkSize);
        try {
          const { data, error } = await supabase
            .from("apontamento_media")
            .select("apontamento_id, registro_tipo")
            .in("apontamento_id", chunk);

          if (requestId !== activityRequestIdRef.current) return;

          if (error) {
            console.error(error);
            setActivityCounts(new Map());
            setActivityError(t("schedule.dashboard.activitiesLoadError"));
            setActivityLoading(false);
            return;
          }

          const rows = (data ?? []) as ActivityRow[];
          rows.forEach((row) => {
            const key = row.registro_tipo?.trim();
            if (!key) return;
            counts.set(key, (counts.get(key) ?? 0) + 1);

            const appointmentId = row.apontamento_id;
            if (!appointmentId) return;
            const consultantLabel =
              appointmentConsultantById.get(appointmentId);
            if (!consultantLabel) return;
            consultantCounts.set(
              consultantLabel,
              (consultantCounts.get(consultantLabel) ?? 0) + 1,
            );
          });
        } catch (error) {
          console.error(error);
          if (requestId !== activityRequestIdRef.current) return;
          setActivityCounts(new Map());
          setActivityError(t("schedule.dashboard.activitiesLoadError"));
          setActivityLoading(false);
          return;
        }
      }

      if (requestId !== activityRequestIdRef.current) return;
      setActivityCounts(counts);
      setActivityByConsultantCounts(consultantCounts);
      setActivityLoading(false);
    };

    void loadActivities();
  }, [
    activeTab,
    appointmentConsultantById,
    dashboardCountableAppointments,
    dashboardLoading,
    supabase,
    t,
  ]);

  useEffect(() => {
    if (activeTab !== "dashboard") return;
    const requestId = ++actionDataRequestIdRef.current;
    const loadActions = async () => {
      setActionDataLoading(true);
      setActionDataError(null);

      try {
        const { data, error } = await supabase
          .from("apontamento_acoes")
          .select(
            "apontamento_id, resultado, valor, tipo_oportunidade, motivo_perda, created_at, created_by",
          )
          .gte("created_at", range.startIso)
          .lte("created_at", range.endIso)
          .order("created_at", { ascending: true });

        if (requestId !== actionDataRequestIdRef.current) return;

        if (error) {
          console.error(error);
          setDashboardActions([]);
          setActionDataError(t("schedule.dashboard.actionsLoadError"));
          setActionDataLoading(false);
          return;
        }

        const rows = (data ?? []) as ActionDashboardRow[];
        const appointmentIds = Array.from(
          new Set(rows.map((row) => row.apontamento_id).filter(Boolean)),
        );

        if (!appointmentIds.length) {
          setDashboardActions(rows);
          setActionDataLoading(false);
          return;
        }

        const appointmentCompanyMap = new Map<string, string | null>();
        const chunkSize = 200;

        for (let index = 0; index < appointmentIds.length; index += chunkSize) {
          const chunk = appointmentIds.slice(index, index + chunkSize);
          const { data: appointmentData, error: appointmentError } = await supabase
            .from("apontamentos")
            .select("id, company_id")
            .in("id", chunk);

          if (requestId !== actionDataRequestIdRef.current) return;

          if (appointmentError) {
            console.error(appointmentError);
            setDashboardActions([]);
            setActionDataError(t("schedule.dashboard.actionsLoadError"));
            setActionDataLoading(false);
            return;
          }

          const appointmentRows = (appointmentData ?? []) as ActionAppointmentRefRow[];
          appointmentRows.forEach((row) => {
            appointmentCompanyMap.set(row.id, row.company_id);
          });
        }

        if (requestId !== actionDataRequestIdRef.current) return;

        setDashboardActions(
          rows.map((row) => ({
            ...row,
            company_id: row.apontamento_id
              ? (appointmentCompanyMap.get(row.apontamento_id) ?? null)
              : null,
          })),
        );
        setActionDataLoading(false);
      } catch (error) {
        console.error(error);
        if (requestId !== actionDataRequestIdRef.current) return;
        setDashboardActions([]);
        setActionDataError(t("schedule.dashboard.actionsLoadError"));
        setActionDataLoading(false);
      }
    };

    void loadActions();
  }, [
    activeTab,
    actionReloadKey,
    range.endIso,
    range.startIso,
    supabase,
    t,
  ]);

  const filteredCompanies = useMemo(() => {
    return companiesByPortfolio.filter((company) => {
      if (
        companyNameFilter.length &&
        !companyNameFilter.some((value) => value === company.name)
      ) {
        return false;
      }
      const consultantLabel = company.csa ?? "";
      if (
        companyConsultantFilter.length &&
        !companyConsultantFilter.some((value) => value === consultantLabel)
      ) {
        return false;
      }
      if (!normalizedCompanySearch) return true;
      const haystack = [
        company.name,
        company.document,
        company.state,
        company.csa,
        company.carteiraDef,
        company.carteiraDef2,
        company.clientClass,
        company.classeCliente,
        company.validacao,
        company.referencia,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedCompanySearch);
    });
  }, [
    companiesByPortfolio,
    companyConsultantFilter,
    companyNameFilter,
    normalizedCompanySearch,
  ]);

  const expiredCardClass = "border-slate-300 bg-slate-100 text-slate-700";

  const getDaysSinceLastVisit = useMemo(
    () => (companyId: string) => {
      const lastVisit = lastVisitByCompany.get(companyId);
      if (!lastVisit) return null;
      const lastVisitStart = startOfDay(lastVisit);
      const diffMs = todayStart.getTime() - lastVisitStart.getTime();
      if (!Number.isFinite(diffMs)) return null;
      return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
    },
    [lastVisitByCompany, todayStart],
  );

  const sortedCompanies = useMemo(() => {
    const sorted = [...filteredCompanies];
    const getCounts = (companyId: string) =>
      protheusCounts.get(companyId) ?? buildEmptyProtheusCounts();
    const getOpenQuotes = (companyId: string) =>
      openQuotesTotals.get(companyId) ?? 0;
    const getLastVisitDays = (companyId: string) =>
      getDaysSinceLastVisit(companyId);

    sorted.sort((a, b) => {
      if (
        companySort === "name_desc" ||
        companySort === "csa_asc" ||
        companySort === "csa_desc" ||
        companySort === "preventivas" ||
        companySort === "reconexoes" ||
        companySort === "cotacoes" ||
        companySort === "last_visit"
      ) {
        if (companySort === "name_desc") {
          return b.name.localeCompare(a.name, locale);
        }
        if (companySort === "csa_asc") {
          const comparison = (a.csa ?? "").localeCompare(b.csa ?? "", locale);
          return comparison !== 0 ? comparison : a.name.localeCompare(b.name, locale);
        }
        if (companySort === "csa_desc") {
          const comparison = (b.csa ?? "").localeCompare(a.csa ?? "", locale);
          return comparison !== 0 ? comparison : a.name.localeCompare(b.name, locale);
        }
      }
      if (
        companySort === "preventivas" ||
        companySort === "reconexoes" ||
        companySort === "cotacoes" ||
        companySort === "last_visit"
      ) {
        const diff =
          companySort === "preventivas" || companySort === "reconexoes"
            ? (() => {
                const aCounts = getCounts(a.id);
                const bCounts = getCounts(b.id);
                return companySort === "preventivas"
                  ? bCounts.preventivas - aCounts.preventivas
                  : bCounts.reconexoes - aCounts.reconexoes;
              })()
            : companySort === "cotacoes"
              ? getOpenQuotes(b.id) - getOpenQuotes(a.id)
              : (() => {
                  const aDays = getLastVisitDays(a.id);
                  const bDays = getLastVisitDays(b.id);
                  const safeA = aDays ?? -1;
                  const safeB = bDays ?? -1;
                  return safeB - safeA;
                })();
        if (diff !== 0) return diff;
      }
      return a.name.localeCompare(b.name, locale);
    });

    return sorted;
  }, [
    filteredCompanies,
    companySort,
    protheusCounts,
    openQuotesTotals,
    getDaysSinceLastVisit,
    locale,
  ]);

  useEffect(() => {
    setCompanyPage(1);
  }, [
    companyConsultantFilter,
    companyNameFilter,
    companySearch,
    companySort,
    showOutsidePortfolio,
  ]);

  const totalCompanyPages = Math.max(
    1,
    Math.ceil(filteredCompanies.length / companiesPerPage),
  );

  useEffect(() => {
    setCompanyPage((current) =>
      Math.min(Math.max(current, 1), totalCompanyPages),
    );
  }, [totalCompanyPages]);

  const paginatedCompanies = useMemo(() => {
    const start = (companyPage - 1) * companiesPerPage;
    return sortedCompanies.slice(start, start + companiesPerPage);
  }, [sortedCompanies, companyPage]);

  const companyPageSummary = useMemo(() => {
    if (filteredCompanies.length === 0) {
      return {
        start: 0,
        end: 0,
        total: 0,
      };
    }
    const start = (companyPage - 1) * companiesPerPage + 1;
    const end = Math.min(
      companyPage * companiesPerPage,
      filteredCompanies.length,
    );
    return {
      start,
      end,
      total: filteredCompanies.length,
    };
  }, [companyPage, filteredCompanies.length]);

  useEffect(() => {
    if (activeTab !== "agendamentos") return;
    const requestId = ++listAppointmentsRequestIdRef.current;

    const loadAppointmentsList = async () => {
      setListAppointmentsLoading(true);
      setListAppointmentsError(null);
      try {
        const { data, error: appointmentsError } = await supabase
          .from("apontamentos")
          .select(APPOINTMENT_LIST_SELECT)
          .order("starts_at", { ascending: false });

        if (requestId !== listAppointmentsRequestIdRef.current) return;

        if (appointmentsError) {
          console.error(appointmentsError);
          setListAppointments([]);
          setListAppointmentsError(t("schedule.appointmentsLoadError"));
          setListAppointmentsLoading(false);
          return;
        }

        setListAppointments((data ?? []).map(mapAppointment));
        setListAppointmentsLoading(false);
      } catch (err) {
        console.error(err);
        if (requestId !== listAppointmentsRequestIdRef.current) return;
        setListAppointments([]);
        setListAppointmentsError(t("schedule.appointmentsLoadError"));
        setListAppointmentsLoading(false);
      }
    };

    void loadAppointmentsList();
  }, [activeTab, supabase, t]);

  const isCompaniesLoading = generalListCompaniesLoading;
  const isAppointmentsLoading = listAppointmentsLoading;
  const companiesListError = generalListCompaniesError;

  const companyColumns = useMemo(
    () =>
      [
        { id: "empresa", label: t("company.info.name"), width: "1.8fr" },
        { id: "estado", label: t("company.info.state"), width: "0.7fr" },
        { id: "csa", label: t("company.info.csa"), width: "0.9fr" },
        { id: "carteira", label: t("company.info.carteira"), width: "1.2fr" },
        { id: "classe", label: t("company.info.class"), width: "1.2fr" },
        {
          id: "referencia",
          label: t("company.info.reference"),
          width: "1.1fr",
        },
        {
          id: "ultimaVisita",
          label: t("schedule.lastVisitDays"),
          width: "1.1fr",
        },
        {
          id: "oportunidades",
          label: t("company.opportunities"),
          width: "1fr",
        },
        {
          id: "cotacoes",
          label: t("schedule.orderByQuotes"),
          width: "1.2fr",
        },
      ] as const,
    [t],
  );

  const visibleCompanyColumns = companyColumns.filter((column) =>
    companyVisibleColumns.includes(column.id),
  );

  const companyGridTemplateColumns = visibleCompanyColumns
    .map((column) => column.width)
    .join(" ");

  const appointmentColumns = useMemo(
    () =>
      [
        {
          id: "empresa",
          label: t("schedule.appointmentList.company"),
          width: "1.6fr",
        },
        {
          id: "consultor",
          label: t("schedule.appointmentList.consultant"),
          width: "1.1fr",
        },
        {
          id: "data",
          label: t("schedule.appointmentList.date"),
          width: "0.8fr",
        },
        {
          id: "horario",
          label: t("schedule.appointmentList.time"),
          width: "0.9fr",
        },
        {
          id: "status",
          label: t("schedule.appointmentList.status"),
          width: "0.7fr",
        },
        {
          id: "oportunidades",
          label: t("schedule.appointmentList.opportunities"),
          width: "1.3fr",
        },
        {
          id: "cotacoes",
          label: t("schedule.appointmentList.quotes"),
          width: "1.1fr",
        },
      ] as const,
    [t],
  );

  const visibleAppointmentColumns = appointmentColumns.filter((column) =>
    appointmentVisibleColumns.includes(column.id),
  );

  const appointmentGridTemplateColumns = visibleAppointmentColumns
    .map((column) => column.width)
    .join(" ");

  const cronogramaStatusOptions = useMemo(
    () =>
      (["scheduled", "in_progress", "done", "absent", "atuado"] as const).map(
        (status) => ({
          value: status,
          label: t(`schedule.status.${status}`),
        }),
      ),
    [t],
  );

  const appointmentStatusOptions = useMemo(
    () => [
      ...cronogramaStatusOptions,
      {
        value: "expired",
        label: t("schedule.statusExpired"),
      },
    ],
    [cronogramaStatusOptions, t],
  );

  const appointmentOpportunityOptions = useMemo(
    () =>
      OPPORTUNITY_OPTIONS.map((option) => ({
        value: option.id,
        label: t(`schedule.opportunity.${option.id}`, undefined, option.label),
      })),
    [t],
  );

  const companyColumnOptions = useMemo(
    () =>
      companyColumns.map((column) => ({
        value: column.id,
        label: column.label,
      })),
    [companyColumns],
  );

  const appointmentColumnOptions = useMemo(
    () =>
      appointmentColumns.map((column) => ({
        value: column.id,
        label: column.label,
      })),
    [appointmentColumns],
  );
  const appointmentHeaderSortOptions = useMemo(
    () => ({
      empresa: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "alpha_asc", label: t("schedule.columnSortAsc") },
        { value: "alpha_desc", label: t("schedule.columnSortDesc") },
      ],
      consultor: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "consultant_asc", label: t("schedule.columnSortAsc") },
        { value: "consultant_desc", label: t("schedule.columnSortDesc") },
      ],
    }),
    [t],
  );
  const companyHeaderSortOptions = useMemo(
    () => ({
      empresa: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "name", label: t("schedule.columnSortAsc") },
        { value: "name_desc", label: t("schedule.columnSortDesc") },
      ],
      consultor: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "csa_asc", label: t("schedule.columnSortAsc") },
        { value: "csa_desc", label: t("schedule.columnSortDesc") },
      ],
    }),
    [t],
  );

  const renderAppointmentCell = useCallback(
    (
      columnId: (typeof APPOINTMENT_COLUMN_VALUES)[number],
      appointment: Appointment,
    ) => {
      const company = listCompanyById.get(appointment.companyId);
      const companyName = company?.name ?? t("appointment.companyMissing");
      const companyDocument =
        company?.document ?? t("schedule.companyDocumentMissing");
      const startDate = new Date(appointment.startAt);
      const dateLabel = Number.isNaN(startDate.getTime())
        ? t("schedule.noData")
        : formatDateLabel(startDate);
      const timeLabel = `${formatTime(appointment.startAt)} - ${formatTime(appointment.endAt)}`;
      const isExpired = isExpiredAppointment(appointment, todayStart);
      const statusLabel = isExpired
        ? t("schedule.statusExpired")
        : t(`schedule.status.${appointment.status}`);
      const statusTone = isExpired ? "stone" : STATUS_TONES[appointment.status];
      const consultantLabel =
        appointment.consultantName ||
        appointment.consultantId ||
        t("appointment.notInformed");

      switch (columnId) {
        case "empresa":
          return (
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-900">
                {companyName}
              </div>
              <div className="truncate text-xs text-slate-500">
                {companyDocument}
              </div>
            </div>
          );
        case "consultor":
          return (
            <div className="min-w-0">
              <div className="truncate text-slate-700">{consultantLabel}</div>
            </div>
          );
        case "data":
          return (
            <div className="min-w-0">
              <div className="truncate text-slate-700">{dateLabel}</div>
            </div>
          );
        case "horario":
          return (
            <div className="min-w-0">
              <div className="truncate text-slate-700">{timeLabel}</div>
            </div>
          );
        case "status":
          return (
            <div className="min-w-0">
              <Badge tone={statusTone} className="max-w-[140px] truncate">
                {statusLabel}
              </Badge>
            </div>
          );
        case "oportunidades":
          return (
            <div className="min-w-0">
              {appointment.oportunidades?.length ? (
                <div className="flex flex-wrap gap-1">
                  {appointment.oportunidades.map((opportunity) => (
                    <Badge
                      key={`${appointment.id}-${opportunity}`}
                      tone="violet"
                      className="max-w-[140px] truncate"
                    >
                      {t(
                        `schedule.opportunity.${opportunity}`,
                        undefined,
                        opportunity,
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  {t("schedule.noData")}
                </span>
              )}
            </div>
          );
        case "cotacoes":
          return (
            <div className="min-w-0">
              {openQuotesError ? (
                <span className="text-xs text-slate-400">
                  {t("schedule.noData")}
                </span>
              ) : openQuotesLoading && !openQuotesTotals.has(appointment.companyId) ? (
                <span className="text-xs text-slate-400">
                  {t("schedule.loading")}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-700">
                  {formatCurrency(openQuotesTotals.get(appointment.companyId) ?? 0)}
                </span>
              )}
            </div>
          );
      }
    },
    [
      formatCurrency,
      listCompanyById,
      openQuotesError,
      openQuotesLoading,
      openQuotesTotals,
      t,
      todayStart,
    ],
  );

  const renderCompanyCell = useCallback(
    (columnId: (typeof COMPANY_COLUMN_VALUES)[number], company: Company) => {
      switch (columnId) {
        case "empresa":
          return (
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-900">
                {company.name}
              </div>
              <div className="truncate text-xs text-slate-500">
                {company.document ?? t("schedule.companyDocumentMissing")}
              </div>
            </div>
          );
        case "estado":
          return (
            <div className="min-w-0">
              <Badge tone="sky" className="max-w-[120px] truncate">
                {company.state ?? t("schedule.noState")}
              </Badge>
            </div>
          );
        case "csa":
          return (
            <div className="min-w-0">
              <Badge tone="emerald" className="max-w-[140px] truncate">
                {company.csa ?? t("schedule.noCsa")}
              </Badge>
            </div>
          );
        case "carteira":
          return (
            <div className="min-w-0">
              <div className="truncate text-slate-700">
                {company.carteiraDef ?? t("schedule.noCarteira")}
              </div>
              <div className="truncate text-xs text-slate-500">
                {company.carteiraDef2 ?? t("schedule.noCarteira2")}
              </div>
            </div>
          );
        case "classe":
          return (
            <div className="min-w-0">
              <div className="truncate text-slate-700">
                {company.clientClass ?? t("schedule.noClass")}
              </div>
              <div className="truncate text-xs text-slate-500">
                {company.classeCliente ?? t("schedule.noClientClass")}
              </div>
            </div>
          );
        case "referencia":
          return (
            <div className="min-w-0">
              <div className="truncate text-slate-700">
                {company.referencia ?? t("schedule.noReference")}
              </div>
              <div className="truncate text-xs text-slate-500">
                {company.validacao ?? t("schedule.noValidation")}
              </div>
            </div>
          );
        case "ultimaVisita":
          return (
            <div className="min-w-0">
              {lastVisitError ? (
                <span className="text-xs text-slate-400">
                  {t("schedule.noData")}
                </span>
              ) : lastVisitLoading && !lastVisitByCompany.has(company.id) ? (
                <span className="text-xs text-slate-400">
                  {t("schedule.loading")}
                </span>
              ) : (
                (() => {
                  const days = getDaysSinceLastVisit(company.id);
                  if (days == null) {
                    return (
                      <span className="text-xs text-slate-400">
                        {t("schedule.noVisits")}
                      </span>
                    );
                  }
                  const label =
                    days === 1
                      ? t("schedule.daySingular")
                      : t("schedule.dayPlural");
                  const lastVisit = lastVisitByCompany.get(company.id);
                  return (
                    <div className="truncate text-xs font-semibold text-slate-700">
                      <span
                        title={
                          lastVisit ? formatDateLabel(lastVisit) : undefined
                        }
                      >
                        {days} {label}
                      </span>
                    </div>
                  );
                })()
              )}
            </div>
          );
        case "oportunidades":
          return (
            <div className="min-w-0">
              {(() => {
                const counts =
                  protheusCounts.get(company.id) ?? buildEmptyProtheusCounts();
                return (
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    <Badge tone="amber">P {counts.preventivas}</Badge>
                    <Badge tone="slate">R {counts.reconexoes}</Badge>
                  </div>
                );
              })()}
            </div>
          );
        case "cotacoes":
          return (
            <div className="min-w-0">
              {openQuotesError ? (
                <span className="text-xs text-slate-400">
                  {t("schedule.noData")}
                </span>
              ) : openQuotesLoading && !openQuotesTotals.has(company.id) ? (
                <span className="text-xs text-slate-400">
                  {t("schedule.loading")}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-700">
                  {formatCurrency(openQuotesTotals.get(company.id) ?? 0)}
                </span>
              )}
            </div>
          );
      }
    },
    [
      formatCurrency,
      getDaysSinceLastVisit,
      lastVisitByCompany,
      lastVisitError,
      lastVisitLoading,
      openQuotesError,
      openQuotesLoading,
      openQuotesTotals,
      protheusCounts,
      t,
    ],
  );

  const dashboardPeriodLabel = useMemo(() => {
    if (dashboardView === "year") {
      return t("schedule.dashboard.periodYear", {
        year: dashboardRange.startAt.getFullYear(),
      });
    }
    if (dashboardView === "month") {
      return t("schedule.dashboard.periodMonth", {
        month: formatMonthLabel(selectedMonth),
      });
    }
    return t("schedule.dashboard.period", {
      start: formatDateLabel(dashboardRange.startAt),
      end: formatDateLabel(dashboardRange.endAt),
    });
  }, [dashboardRange.endAt, dashboardRange.startAt, dashboardView, selectedMonth, t]);

  const handleSchedulePeriodChange = useCallback(
    (value: string) => {
      const nextMonth = parseMonth(value, selectedMonth);
      setSelectedMonth(nextMonth);
    },
    [selectedMonth],
  );

  const handleDashboardPeriodChange = useCallback(
    (value: string) => {
      if (dashboardView === "year") {
        const parsedYear = Number(value);
        if (Number.isInteger(parsedYear)) {
          setSelectedMonth(new Date(parsedYear, 0, 1));
        }
        return;
      }
      const nextMonth = parseMonth(value, selectedMonth);
      setSelectedMonth(nextMonth);
    },
    [dashboardView, selectedMonth],
  );

  const shiftDashboardPeriod = useCallback(
    (direction: -1 | 1) => {
      if (dashboardView === "year") {
        setSelectedMonth(
          (prev) => new Date(prev.getFullYear() + direction, prev.getMonth(), 1),
        );
        return;
      }
      setSelectedMonth((prev) => addMonths(prev, direction));
    },
    [dashboardView],
  );

  const renderDashboard = () => {
    const needsDashboardSelection =
      (isVisitDashboard
        ? !selectedListConsultantIds.length
        : !selectedDashboardActorIds.length) &&
      (isVisitDashboard || actionActorOptions.length > 0);

    if (needsDashboardSelection) {
      return (
        <div className={`${panelClass} p-4 text-sm text-slate-600`}>
          {t(
            isVisitDashboard
              ? "schedule.dashboard.selectConsultant"
              : "schedule.dashboard.selectActor",
          )}
        </div>
      );
    }

    if ((isVisitDashboard && dashboardLoading) || (!isVisitDashboard && actionDataLoading)) {
      return (
        <div className={`${panelClass} p-4`}>
          <div className="flex flex-col gap-3">
            <div
              className={`${toolbarCardClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
            >
              <div className="h-3 w-40 rounded-full bg-slate-200 animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-9 w-32 rounded-lg bg-slate-200 animate-pulse" />
                <div className="h-9 w-40 rounded-lg bg-slate-200 animate-pulse" />
              </div>
            </div>
            <div className="h-3 w-56 rounded-full bg-slate-200 animate-pulse" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={`dashboard-card-skeleton-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="h-3 w-24 rounded-full bg-slate-200 animate-pulse" />
                <div className="mt-3 h-6 w-20 rounded-full bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={`dashboard-chart-skeleton-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="h-3 w-40 rounded-full bg-slate-200 animate-pulse" />
                <div className="mt-4 h-56 w-full rounded-xl bg-slate-200/70 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if ((isVisitDashboard && dashboardError) || (!isVisitDashboard && actionDataError)) {
      return (
        <div className={`${panelClass} p-4`}>
          <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-sm">
            <span>{isVisitDashboard ? dashboardError : actionDataError}</span>
            <button
              type="button"
              onClick={() => {
                if (isVisitDashboard) {
                  void loadGeneralDashboard();
                } else {
                  setActionReloadKey((current) => current + 1);
                }
              }}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
            >
              {t("schedule.dashboard.retry")}
            </button>
          </div>
        </div>
      );
    }

    const hasNoData = isVisitDashboard
      ? dashboardMetrics.totalAppointments === 0 &&
        dashboardMetrics.totalCompanies === 0
      : actionMetrics.totalActions === 0;

    const averageDurationLabel = formatAverageDuration(
      dashboardMetrics.avgRealDurationMinutes,
      t,
    );

    const cards = [
      {
        label: t("schedule.dashboard.cards.appointments"),
        value: dashboardMetrics.totalAppointments,
      },
      {
        label: t("schedule.dashboard.cards.companies"),
        value: dashboardMetrics.totalCompanies,
      },
      {
        label: t("schedule.dashboard.cards.avgRealDuration"),
        value: averageDurationLabel,
      },
      {
        label: t("schedule.dashboard.cards.avgVisitsPerDay"),
        value: dashboardMetrics.avgVisitsPerDayAllConsultants,
      },
      {
        label: t("schedule.dashboard.cards.doneRate"),
        value: `${dashboardMetrics.doneRate}%`,
      },
      {
        label: t("schedule.dashboard.cards.absentRate"),
        value: `${dashboardMetrics.absentRate}%`,
      },
    ];
    const actionCards = [
      {
        label: t("schedule.dashboard.actionCards.actions"),
        value: actionMetrics.totalActions,
      },
      {
        label: t("schedule.dashboard.actionCards.actors"),
        value: actionMetrics.totalActors,
      },
      {
        label: t("schedule.dashboard.actionCards.appointments"),
        value: actionMetrics.totalAppointments,
      },
      {
        label: t("schedule.dashboard.actionCards.companies"),
        value: actionMetrics.totalCompanies,
      },
      {
        label: t("schedule.dashboard.actionCards.revenue"),
        value: formatCurrency(actionMetrics.totalRevenue),
      },
      {
        label: t("schedule.dashboard.actionCards.averageTicket"),
        value:
          actionMetrics.statusTotals.vendido > 0
            ? formatCurrency(actionMetrics.averageTicket)
            : t("schedule.noData"),
      },
    ];

    return (
      <div className={`${panelClass} p-4`}>
        <div className="flex flex-col gap-3">
          <ToolbarRow
            className={toolbarCardClass}
            summary={<span>{dashboardPeriodLabel}</span>}
          >
            {isVisitDashboard
              ? consultantMultiSelectControl
              : dashboardActorMultiSelectControl}
            <ToolbarField
              label={t("schedule.dashboard.viewLabel")}
              srOnlyLabel
              className="sm:min-w-[140px]"
              contentClassName="w-full"
            >
              <select
                value={dashboardView}
                onChange={(event) =>
                  setDashboardView(event.target.value as DashboardView)
                }
                aria-label={t("schedule.dashboard.viewLabel")}
                className={toolbarInputClass}
              >
                <option value="week">{t("schedule.dashboard.viewWeek")}</option>
                <option value="month">
                  {t("schedule.dashboard.viewMonth")}
                </option>
                <option value="year">{t("schedule.dashboard.viewYear")}</option>
              </select>
            </ToolbarField>
            <Tabs
              tabs={[
                { id: "visita", label: t("schedule.dashboard.stageVisit") },
                { id: "atuacao", label: t("schedule.dashboard.stageAction") },
              ]}
              activeTabId={dashboardStage}
              onTabChange={(id) => {
                if (id === "visita" || id === "atuacao") {
                  setDashboardStage(id);
                }
              }}
            />
          </ToolbarRow>

          <PeriodNavigator
            containerClassName={toolbarCardClass}
            label={t("schedule.dashboard.viewLabel")}
            prevLabel={t(
              dashboardView === "year"
                ? "schedule.dashboard.prevYear"
                : "schedule.prevMonth",
            )}
            nextLabel={t(
              dashboardView === "year"
                ? "schedule.dashboard.nextYear"
                : "schedule.nextMonth",
            )}
            value={
              dashboardView === "year"
                ? String(selectedMonth.getFullYear())
                : toMonthKey(selectedMonth)
            }
            options={
              dashboardView === "year" ? yearSelectOptions : monthSelectOptions
            }
            onChange={handleDashboardPeriodChange}
            onPrev={() => shiftDashboardPeriod(-1)}
            onNext={() => shiftDashboardPeriod(1)}
            trailing={
              <>
                {dashboardView === "week"
                  ? weeks.map((week, index) => {
                      const isActive = index === selectedWeekIndex;
                      return (
                        <button
                          key={`${toDateKey(week.startAt)}-${index}`}
                          type="button"
                          onClick={() => {
                            setSelectedWeekIndex(index);
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            isActive ? toggleActiveClass : toggleInactiveClass
                          }`}
                        >
                          {week.label}
                        </button>
                      );
                    })
                  : null}
              </>
            }
          />

          <div className="text-xs text-slate-500">
            {(isVisitDashboard
              ? allConsultantsSelected
              : allDashboardActorsSelected)
              ? t(
                  isVisitDashboard
                    ? "schedule.dashboard.scopeHintGeneral"
                    : "schedule.dashboard.actionScopeHintGeneral",
                )
              : t(
                  isVisitDashboard
                    ? "schedule.dashboard.scopeHintIndividual"
                    : "schedule.dashboard.actionScopeHintIndividual",
                )}
          </div>
        </div>

        {hasNoData ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {t("schedule.dashboard.noDataPeriod")}
          </div>
        ) : null}

        {isVisitDashboard ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {actionCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {isVisitDashboard ? (
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("schedule.dashboard.charts.appointmentsByPeriod")}
            </div>
            {dashboardMetrics.appointmentsByDay.some(
              (item) => item.total > 0,
            ) ? (
              <div className="mt-3 min-h-[280px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardMetrics.appointmentsByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [
                        value,
                        t("schedule.dashboard.tooltip.appointments"),
                      ]}
                      labelFormatter={(_label, payload) =>
                        String(payload?.[0]?.payload?.fullLabel ?? "")
                      }
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        color: "#0F172A",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                      }}
                      labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                      itemStyle={{ color: "#0F172A" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#0EA5E9"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                {t("schedule.dashboard.noChartData")}
              </div>
            )}
            </div>
          ) : null}

          {isVisitDashboard && allConsultantsSelected ? (
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("schedule.dashboard.charts.consultantAvgVisitsPerPeriod")}
              </div>
              {consultantAvgVisits.length ? (
                <div className="mt-3 min-h-[280px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={consultantAvgVisits}
                      barGap={0}
                      barCategoryGap="18%"
                      margin={{ top: 24, right: 12, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        allowDecimals
                        domain={[
                          0,
                          (dataMax: number) =>
                            Math.max(1, Math.ceil(dataMax * 1.15)),
                        ]}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          const label =
                            name === "avgCompleted"
                              ? t("schedule.dashboard.series.completed")
                              : t("schedule.dashboard.series.total");
                          return [
                            value == null ? "0.0" : Number(value).toFixed(1),
                            label,
                          ];
                        }}
                        labelFormatter={(label) =>
                          t("schedule.dashboard.tooltip.consultantLabel", {
                            name: label,
                          })
                        }
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          color: "#0F172A",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                        }}
                        labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                        itemStyle={{ color: "#0F172A" }}
                      />
                      <Bar
                        dataKey="avgTotal"
                        name="avgTotal"
                        fill="#0EA5E9"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="avgTotal"
                          position="top"
                          formatter={(value) => formatChartLabel(value, 1)}
                        />
                      </Bar>
                      <Bar
                        dataKey="avgCompleted"
                        name="avgCompleted"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="avgCompleted"
                          position="top"
                          formatter={(value) => formatChartLabel(value, 1)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                  {t("schedule.dashboard.noChartData")}
                </div>
              )}
            </div>
          ) : null}

          {isVisitDashboard && allConsultantsSelected ? (
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("schedule.dashboard.charts.topConsultants")}
              </div>
              {dashboardMetrics.topConsultants.length ? (
                <div className="mt-3 min-h-[280px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardMetrics.topConsultants}
                      margin={{ top: 24, right: 12, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[
                          0,
                          (dataMax: number) =>
                            Math.max(1, Math.ceil(dataMax * 1.15)),
                        ]}
                      />
                      <Tooltip
                        formatter={(value) => [
                          value,
                          t("schedule.dashboard.tooltip.appointments"),
                        ]}
                        labelFormatter={(label) =>
                          t("schedule.dashboard.tooltip.consultantLabel", {
                            name: label,
                          })
                        }
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          color: "#0F172A",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                        }}
                        labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                        itemStyle={{ color: "#0F172A" }}
                      />
                      <Bar dataKey="count" fill="#0EA5E9">
                        <LabelList
                          dataKey="count"
                          position="top"
                          formatter={(value) => formatChartLabel(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                  {t("schedule.dashboard.noChartData")}
                </div>
              )}
            </div>
          ) : null}

          {isVisitDashboard ? (
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("schedule.dashboard.charts.statusDistribution")}
            </div>
            {visitStatusData.some((item) => item.count > 0) ? (
              <div className="mt-3 flex min-h-[280px] flex-1 flex-col justify-center gap-4 md:flex-row md:items-center">
                <div className="h-full min-h-[260px] w-full md:w-2/3">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(value, _name, item) => [
                            value,
                            item?.payload?.label ??
                              t("schedule.dashboard.tooltip.appointments"),
                          ]}
                          labelFormatter={(label) =>
                            t("schedule.dashboard.tooltip.statusLabel", {
                              name: String(label ?? ""),
                            })
                          }
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            color: "#0F172A",
                            borderRadius: "8px",
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                          }}
                          labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                          itemStyle={{ color: "#0F172A" }}
                        />
                        <Pie
                          data={visitStatusData}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={96}
                          paddingAngle={3}
                          label={renderPieOuterLabel}
                          labelLine={renderPieLabelLine}
                        >
                          {visitStatusData.map((item) => (
                            <Cell key={item.id} fill={item.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("schedule.dashboard.legendTitle")}
                    </div>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      {visitStatusData.map((item) => (
                        <div
                          key={`legend-${item.id}`}
                          className="flex items-start gap-2 border-b border-slate-200 py-2 last:border-b-0"
                        >
                          <span
                            className="mt-1 inline-flex h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">
                              {item.label}
                            </div>
                            <div className="text-slate-600">
                              {item.count}{" "}
                              {t("schedule.dashboard.tooltip.totalAppointments")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
              </div>
            ) : (
              <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                {t("schedule.dashboard.noChartData")}
              </div>
            )}
            </div>
          ) : null}

          {isVisitDashboard ? (
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("schedule.dashboard.charts.activitiesByType")}
              </div>
              {activityError ? (
                <div className="mt-3 text-sm text-rose-600">{activityError}</div>
              ) : activityLoading ? (
                <div className="mt-3 text-sm text-slate-500">
                  {t("schedule.dashboard.activitiesLoading")}
                </div>
              ) : dashboardActivitiesData.length ? (
                <div className="mt-3 min-h-[280px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardActivitiesData}
                      margin={{ top: 24, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        interval={0}
                        tick={{ fontSize: 10 }}
                        tickMargin={8}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[
                          0,
                          (dataMax: number) =>
                            Math.max(1, Math.ceil(dataMax * 1.15)),
                        ]}
                      />
                      <Tooltip
                        formatter={(value) => [
                          value,
                          t("schedule.dashboard.tooltip.totalActivities"),
                        ]}
                        labelFormatter={(label) =>
                          t("schedule.dashboard.tooltip.activityTypeLabel", {
                            name: String(label ?? ""),
                          })
                        }
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          color: "#0F172A",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                        }}
                        labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                        itemStyle={{ color: "#0F172A" }}
                      />
                      <Bar dataKey="count" fill="#6366F1">
                        <LabelList
                          dataKey="count"
                          position="top"
                          formatter={(value) => formatChartLabel(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                  {t("schedule.dashboard.noChartData")}
                </div>
              )}
            </div>
          ) : null}

          {isVisitDashboard ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("schedule.dashboard.charts.opportunitiesByType")}
              </div>
              {dashboardOpportunitiesData.length ? (
                <div
                  className="mt-3"
                  style={{
                    height: `${Math.max(
                      280,
                      dashboardOpportunitiesData.length * 28 + 80,
                    )}px`,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={dashboardOpportunitiesData}
                      margin={{ top: 12, right: 24, left: 12, bottom: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={140}
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          value,
                          t("schedule.dashboard.tooltip.opportunities"),
                        ]}
                        labelFormatter={(label) =>
                          t("schedule.dashboard.tooltip.opportunityTypeLabel", {
                            name: String(label ?? ""),
                          })
                        }
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          color: "#0F172A",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                        }}
                        labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                        itemStyle={{ color: "#0F172A" }}
                      />
                      <Bar dataKey="count">
                        {dashboardOpportunitiesData.map((item, index) => (
                          <Cell
                            key={item.id}
                            fill={
                              [
                                "#F59E0B",
                                "#F97316",
                                "#14B8A6",
                                "#38BDF8",
                                "#6366F1",
                                "#A855F7",
                                "#EC4899",
                                "#22C55E",
                                "#0EA5E9",
                                "#64748B",
                                "#EAB308",
                                "#F43F5E",
                              ][index % 12]
                            }
                          />
                        ))}
                        <LabelList
                          dataKey="count"
                          position="right"
                          formatter={(value) => formatChartLabel(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                  {t("schedule.dashboard.noChartData")}
                </div>
              )}
            </div>
          ) : null}

          {isVisitDashboard && allConsultantsSelected ? (
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("schedule.dashboard.charts.activitiesByConsultant")}
              </div>
              {activityError ? (
                <div className="mt-3 text-sm text-rose-600">{activityError}</div>
              ) : activityLoading ? (
                <div className="mt-3 text-sm text-slate-500">
                  {t("schedule.dashboard.activitiesLoading")}
                </div>
              ) : dashboardActivitiesByConsultant.length ? (
                <div className="mt-3 min-h-[280px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardActivitiesByConsultant}
                      margin={{ top: 24, right: 12, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[
                          0,
                          (dataMax: number) =>
                            Math.max(1, Math.ceil(dataMax * 1.15)),
                        ]}
                      />
                      <Tooltip
                        formatter={(value) => [
                          value,
                          t("schedule.dashboard.tooltip.totalActivities"),
                        ]}
                        labelFormatter={(label) =>
                          t("schedule.dashboard.tooltip.consultantLabel", {
                            name: label,
                          })
                        }
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          color: "#0F172A",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                        }}
                        labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                        itemStyle={{ color: "#0F172A" }}
                      />
                      <Bar dataKey="count" fill="#6366F1">
                        <LabelList
                          dataKey="count"
                          position="top"
                          formatter={(value) => formatChartLabel(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                  {t("schedule.dashboard.noChartData")}
                </div>
              )}
            </div>
          ) : null}

          {!isVisitDashboard ? (
            <div className="min-w-0 flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("schedule.dashboard.actionCharts.resultDistribution")}
              </div>
              {actionResultData.some((item) => item.count > 0) ? (
                <div className="mt-3 flex min-h-[280px] flex-1 flex-col justify-center gap-4 md:flex-row md:items-center">
                  <div className="h-[320px] w-full min-w-0 md:w-2/3">
                    <ResponsiveContainer width="100%" height={320} minWidth={0}>
                      <PieChart>
                        <Tooltip
                          formatter={(value, _name, item) => [
                            value,
                            item?.payload?.label ??
                              t("schedule.dashboard.tooltip.totalActions"),
                          ]}
                          labelFormatter={(label) =>
                            t("schedule.dashboard.tooltip.statusLabel", {
                              name: String(label ?? ""),
                            })
                          }
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            color: "#0F172A",
                            borderRadius: "8px",
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                          }}
                          labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                          itemStyle={{ color: "#0F172A" }}
                        />
                        <Pie
                          data={actionResultData}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={96}
                          paddingAngle={3}
                          label={renderPieOuterLabel}
                          labelLine={renderPieLabelLine}
                        >
                          {actionResultData.map((item) => (
                            <Cell key={item.id} fill={item.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("schedule.dashboard.legendTitle")}
                    </div>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      {actionResultData.map((item) => (
                        <div
                          key={`legend-${item.id}`}
                          className="flex items-start gap-2 border-b border-slate-200 py-2 last:border-b-0"
                        >
                          <span
                            className="mt-1 inline-flex h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">
                              {item.label}
                            </div>
                            <div className="text-slate-600">
                              {item.count} {t("schedule.dashboard.tooltip.totalActions")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                  {t("schedule.dashboard.noChartData")}
                </div>
              )}
            </div>
          ) : null}

          {!isVisitDashboard ? (
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("schedule.dashboard.actionCharts.statusByActor")}
              </div>
              {actionStatusByConsultantData.length ? (
                <div className="mt-3 h-[320px] min-w-0">
                  <ResponsiveContainer width="100%" height={320} minWidth={0}>
                    <BarChart
                      data={actionStatusByConsultantData}
                      barGap={0}
                      barCategoryGap="18%"
                      margin={{ top: 24, right: 12, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        allowDecimals
                        domain={[
                          0,
                          (dataMax: number) =>
                            Math.max(1, Math.ceil(dataMax * 1.15)),
                        ]}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          const labels: Record<string, string> = {
                            em_andamento: t("appointment.action.resultInProgress"),
                            vendido: t("appointment.action.resultSold"),
                            perdido: t("appointment.action.resultLost"),
                          };
                          return [value, labels[String(name)] ?? String(name)];
                        }}
                        labelFormatter={(label) =>
                          t("schedule.dashboard.tooltip.actionActorLabel", {
                            name: String(label ?? ""),
                          })
                        }
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          color: "#0F172A",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                        }}
                        labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                        itemStyle={{ color: "#0F172A" }}
                      />
                      <Bar
                        dataKey="em_andamento"
                        name="em_andamento"
                        fill="#0EA5E9"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="em_andamento"
                          position="top"
                          formatter={(value) => formatChartLabel(value)}
                        />
                      </Bar>
                      <Bar
                        dataKey="vendido"
                        name="vendido"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="vendido"
                          position="top"
                          formatter={(value) => formatChartLabel(value)}
                        />
                      </Bar>
                      <Bar
                        dataKey="perdido"
                        name="perdido"
                        fill="#F43F5E"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="perdido"
                          position="top"
                          formatter={(value) => formatChartLabel(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                  {t("schedule.dashboard.noChartData")}
                </div>
              )}
            </div>
          ) : null}

          {!isVisitDashboard ? (
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("schedule.dashboard.actionCharts.revenueByActor")}
              </div>
              {actionRevenueByConsultantData.length ? (
                <div className="mt-3 h-[320px] min-w-0">
                  <ResponsiveContainer width="100%" height={320} minWidth={0}>
                    <BarChart
                      data={actionRevenueByConsultantData}
                      margin={{ top: 24, right: 12, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[
                          0,
                          (dataMax: number) =>
                            Math.max(1, Math.ceil(dataMax * 1.15)),
                        ]}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const numericValue = Array.isArray(value)
                            ? value[0]
                            : value;
                          return [
                            formatCurrency(toNumber(numericValue) ?? 0),
                            t("schedule.dashboard.tooltip.revenue"),
                          ];
                        }}
                        labelFormatter={(label) =>
                          t("schedule.dashboard.tooltip.actionActorLabel", {
                            name: String(label ?? ""),
                          })
                        }
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          color: "#0F172A",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                        }}
                        labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                        itemStyle={{ color: "#0F172A" }}
                      />
                      <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]}>
                        <LabelList
                          dataKey="value"
                          position="top"
                          formatter={(value) => {
                            const numericValue = Array.isArray(value)
                              ? value[0]
                              : value;
                            return formatCurrency(toNumber(numericValue) ?? 0);
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                  {t("schedule.dashboard.noChartData")}
                </div>
              )}
            </div>
          ) : null}

          {!isVisitDashboard ? (
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("schedule.dashboard.actionCharts.opportunitiesByType")}
              </div>
              {actionOpportunityData.length ? (
                <div className="mt-3 h-[320px] min-w-0">
                  <ResponsiveContainer width="100%" height={320} minWidth={0}>
                    <BarChart
                      data={actionOpportunityData}
                      margin={{ top: 24, right: 12, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[
                          0,
                          (dataMax: number) =>
                            Math.max(1, Math.ceil(dataMax * 1.15)),
                        ]}
                      />
                      <Tooltip
                        formatter={(value) => [value, t("schedule.dashboard.tooltip.opportunities")]}
                        labelFormatter={(label) =>
                          t("schedule.dashboard.tooltip.opportunityTypeLabel", {
                            name: String(label ?? ""),
                          })
                        }
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          color: "#0F172A",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                        }}
                        labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                        itemStyle={{ color: "#0F172A" }}
                      />
                      <Bar dataKey="count" fill="#0EA5E9" radius={[4, 4, 0, 0]}>
                        <LabelList
                          dataKey="count"
                          position="top"
                          formatter={(value) => formatChartLabel(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                  {t("schedule.dashboard.noChartData")}
                </div>
              )}
            </div>
          ) : null}

          {!isVisitDashboard ? (
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("schedule.dashboard.actionCharts.lossReasons")}
              </div>
              {actionLossReasonData.length ? (
                <div className="mt-3 h-[320px] min-w-0">
                  <ResponsiveContainer width="100%" height={320} minWidth={0}>
                    <BarChart
                      data={actionLossReasonData}
                      margin={{ top: 24, right: 12, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[
                          0,
                          (dataMax: number) =>
                            Math.max(1, Math.ceil(dataMax * 1.15)),
                        ]}
                      />
                      <Tooltip
                        formatter={(value) => [value, t("schedule.dashboard.tooltip.lossReasons")]}
                        labelFormatter={(label) =>
                          t("schedule.dashboard.tooltip.lossReasonLabel", {
                            name: String(label ?? ""),
                          })
                        }
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          color: "#0F172A",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                        }}
                        labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                        itemStyle={{ color: "#0F172A" }}
                      />
                      <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]}>
                        <LabelList
                          dataKey="count"
                          position="top"
                          formatter={(value) => formatChartLabel(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                  {t("schedule.dashboard.noChartData")}
                </div>
              )}
            </div>
          ) : null}

          {isVisitDashboard ? (
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("schedule.dashboard.charts.companiesByState")}
            </div>
            {dashboardMetrics.companiesByState.length ? (
              <div className="mt-3 min-h-[280px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dashboardMetrics.companiesByState}
                    margin={{ top: 24, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="state" />
                    <YAxis
                      allowDecimals={false}
                      domain={[
                        0,
                        (dataMax: number) =>
                          Math.max(1, Math.ceil(dataMax * 1.15)),
                      ]}
                    />
                    <Tooltip
                      formatter={(value) => [
                        value,
                        t("schedule.dashboard.tooltip.totalCompanies"),
                      ]}
                      labelFormatter={(label) =>
                        t("schedule.dashboard.tooltip.stateLabel", {
                          name: String(label ?? ""),
                        })
                      }
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        color: "#0F172A",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                      }}
                      labelStyle={{ color: "#0F172A", fontWeight: 600 }}
                      itemStyle={{ color: "#0F172A" }}
                    />
                    <Bar dataKey="count" fill="#10B981">
                      <LabelList
                        dataKey="count"
                        position="top"
                        formatter={(value) => formatChartLabel(value)}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-3 flex min-h-[280px] flex-1 items-center justify-center text-center text-sm text-slate-500">
                {t("schedule.dashboard.noChartData")}
              </div>
            )}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <PageShell title={t("schedule.title")} subtitle={t("schedule.subtitle")}>
      <div className="flex flex-col gap-4">
        {activeTab === "cronograma" ? (
          <div className={`${panelClass} p-3 sm:p-4`}>
            <div className="flex flex-col gap-3">
              <ToolbarRow
                className={toolbarCardClass}
                summary={
                  <span>
                    {t("schedule.appointmentsCount", {
                      count: totalAppointments,
                    })}
                  </span>
                }
              >
                  {viewMode === "board" ? (
                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-600 shadow-sm">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomLevel((prev) => Math.max(0, prev - 1))
                        }
                        disabled={zoomLevel === 0}
                        className="rounded-md px-2 py-1 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={t("schedule.zoomOut")}
                      >
                        -
                      </button>
                      <span className="px-1 text-[10px] uppercase tracking-wide text-slate-400">
                        {t("schedule.zoomLabel")}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setZoomLevel((prev) =>
                            Math.min(zoomLevels.length - 1, prev + 1),
                          )
                        }
                        disabled={zoomLevel >= zoomLevels.length - 1}
                        className="rounded-md px-2 py-1 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={t("schedule.zoomIn")}
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                  {scheduleConsultantControl}
                  <ToolbarField
                    label={t("schedule.statusFilterLabel")}
                    className="sm:min-w-[240px]"
                    contentClassName="w-full"
                  >
                    <div className="w-full min-w-[180px]">
                      <LeadTypesMultiSelect
                        value={cronogramaStatus}
                        options={cronogramaStatusOptions}
                        onChange={(next) =>
                          setCronogramaStatus(
                            next.filter(
                              (status): status is SupabaseAppointmentStatus =>
                                status === "scheduled" ||
                                status === "in_progress" ||
                                status === "done" ||
                                status === "absent" ||
                                status === "atuado",
                            ),
                          )
                        }
                        placeholder={t("schedule.statusAll")}
                        searchPlaceholder={t(
                          "schedule.statusFilterSearchPlaceholder",
                        )}
                        noResultsText={t("schedule.statusFilterNoResults")}
                        selectedCountTemplate={t(
                          "schedule.multiSelectSelectedCount",
                        )}
                      />
                    </div>
                  </ToolbarField>
                  {/* <button
                    type="button"
                    onClick={() => refresh()}
                    className={`w-full sm:w-auto ${softButtonClass}`}
                  >
                    Atualizar
                  </button> */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canCreateAppointment) return;
                      setShowCreateModal((prev) => !prev);
                    }}
                    disabled={!canCreateAppointment}
                    title={
                      canCreateAppointment
                        ? undefined
                        : t("schedule.createAppointmentDisabled")
                    }
                    className={`w-full sm:w-auto ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
                    aria-expanded={showCreateModal}
                  >
                    {showCreateModal
                      ? t("schedule.closeCreate")
                      : t("schedule.createAppointment")}
                  </button>
                  <Tabs
                    tabs={[
                      { id: "grid", label: t("schedule.viewGrid") },
                      { id: "board", label: t("schedule.viewBoard") },
                      { id: "map", label: t("schedule.viewMap") },
                    ]}
                    activeTabId={viewMode}
                    onTabChange={(id) => {
                      if (id === "map") {
                        setViewMode("map");
                        return;
                      }
                      if (id === "grid") {
                        setViewMode("grid");
                        return;
                      }
                      setViewMode("board");
                    }}
                  />
              </ToolbarRow>

              <PeriodNavigator
                containerClassName={toolbarCardClass}
                label={t("schedule.selectWeek")}
                prevLabel={t("schedule.prevMonth")}
                nextLabel={t("schedule.nextMonth")}
                value={toMonthKey(selectedMonth)}
                options={monthSelectOptions}
                onChange={handleSchedulePeriodChange}
                onPrev={() => {
                  setSelectedMonth((prev) => addMonths(prev, -1));
                }}
                onNext={() => {
                  setSelectedMonth((prev) => addMonths(prev, 1));
                }}
                trailing={weeks.map((week, index) => {
                  const isActive = index === selectedWeekIndex;
                  return (
                    <button
                      key={`${toDateKey(week.startAt)}-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedWeekIndex(index);
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        isActive ? toggleActiveClass : toggleInactiveClass
                      }`}
                    >
                      {week.label}
                    </button>
                  );
                })}
              />

              <CreateAppointmentModal
                open={showCreateModal}
                companies={companies}
                appointments={appointments}
                consultants={consultants}
                defaultConsultantId={selectedConsultantId}
                defaultDate={defaultCreateDate}
                t={t}
                onClose={() => setShowCreateModal(false)}
                onCreated={async () => {
                  await refresh();
                }}
              />

              {error ? (
                <div className="rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
                  {error}
                </div>
              ) : null}
            </div>

            {viewMode === "board" ? (
              <div className="mt-3">
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="min-w-[980px] rounded-2xl border border-slate-200 bg-white shadow-lg shadow-black/5">
                      <div
                        className="grid border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600"
                        style={{
                          gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
                        }}
                      >
                        <div className="border-r border-slate-200 px-2 py-2">
                          <div className="h-2 w-10 rounded-full bg-slate-200 animate-pulse" />
                        </div>
                        {weekDays.map((day) => (
                          <div
                            key={`skeleton-head-${day.dateLabel}`}
                            className="border-r border-slate-200 px-2 py-2 last:border-r-0"
                          >
                            <div className="h-3 w-14 rounded-full bg-slate-200 animate-pulse" />
                            <div className="mt-2 h-2 w-20 rounded-full bg-slate-200/80 animate-pulse" />
                          </div>
                        ))}
                      </div>

                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
                        }}
                      >
                        <div className="relative border-r border-slate-200 bg-slate-50">
                          <div style={{ height: timelineHeight }}>
                            {hourSlots.map((hour, index) => (
                              <div
                                key={`skeleton-time-${hour}`}
                                className="absolute left-0 right-0 border-t border-slate-200/80"
                                style={{ top: index * hourRowHeight }}
                              />
                            ))}
                          </div>
                        </div>

                        {weekDays.map((day, index) => (
                          <div
                            key={`skeleton-body-${day.dateLabel}`}
                            className="relative border-r border-slate-200 last:border-r-0"
                            style={{ height: timelineHeight }}
                          >
                            {hourSlots.map((hour, lineIndex) => (
                              <div
                                key={`skeleton-line-${day.dateLabel}-${hour}`}
                                className="absolute left-0 right-0 border-t border-slate-200/70"
                                style={{ top: lineIndex * hourRowHeight }}
                              />
                            ))}
                            <div
                              className="absolute left-3 right-3 rounded-lg bg-slate-200/80 animate-pulse"
                              style={{
                                top: 24 + (index % 3) * 80,
                                height: 28,
                              }}
                            />
                            <div
                              className="absolute left-6 right-6 rounded-lg bg-slate-200/70 animate-pulse"
                              style={{
                                top: 120 + (index % 4) * 60,
                                height: 18,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-[980px] rounded-2xl border border-slate-200 bg-white shadow-lg shadow-black/5">
                      <div
                        className="grid border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600"
                        style={{
                          gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
                        }}
                      >
                        <div className="border-r border-slate-200 px-2 py-2 text-[10px] uppercase tracking-wide text-slate-400">
                          {t("schedule.timeLabel")}
                        </div>
                        {weekDays.map((day) => (
                          <div
                            key={day.dateLabel}
                            className={`border-r border-slate-200 px-2 py-2 last:border-r-0 ${
                              day.isToday ? "bg-amber-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Badge tone="amber">{day.shortLabel}</Badge>
                              {day.isToday ? (
                                <Badge tone="emerald">
                                  {t("schedule.today")}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              {day.dateLabel}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
                        }}
                      >
                        <div className="relative border-r border-slate-200 bg-slate-50">
                          <div style={{ height: timelineHeight }}>
                            {hourSlots.map((hour, index) => (
                              <div
                                key={`time-${hour}`}
                                className="absolute left-0 right-0 border-t border-slate-300 text-[10px] text-slate-500"
                                style={{ top: index * hourRowHeight }}
                              >
                                <span className="-translate-y-1/2 transform px-2">
                                  {String(hour).padStart(2, "0")}:00
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {weekDays.map((day) => {
                          const dateKey = toDateKey(day.date);
                          const items = timelineByDay.get(dateKey) ?? [];
                          const layout = layoutTimelineItems(items);
                          return (
                            <div
                              key={`timeline-${dateKey}`}
                              className={`relative border-r border-slate-200 last:border-r-0 ${
                                day.isToday ? "bg-amber-50/60" : ""
                              }`}
                              style={{ height: timelineHeight }}
                            >
                              {hourSlots.map((hour, index) => (
                                <div
                                  key={`line-${dateKey}-${hour}`}
                                  className="absolute left-0 right-0 border-t border-slate-200/80"
                                  style={{ top: index * hourRowHeight }}
                                />
                              ))}

                              {layout.map((item) => {
                                const company = companyById.get(
                                  item.appointment.companyId,
                                );
                                const title =
                                  company?.name ||
                                  t("company.appointmentFallback");
                                const isExpired = isExpiredAppointment(
                                  item.appointment,
                                  todayStart,
                                );
                                const topMinutes =
                                  (item.start.getHours() - timelineHours.min) *
                                    60 +
                                  item.start.getMinutes();
                                const durationMinutes = Math.max(
                                  15,
                                  Math.round(
                                    (item.end.getTime() -
                                      item.start.getTime()) /
                                      60000,
                                  ),
                                );
                                const top = topMinutes * minuteHeight;
                                const height = durationMinutes * minuteHeight;
                                const isTiny = durationMinutes <= 20;
                                const isCompact = durationMinutes <= 45;
                                return (
                                  <Link
                                    key={item.appointment.id}
                                    href={`/cronograma/${item.appointment.id}`}
                                    className={`absolute overflow-hidden rounded-lg border px-2 py-1 text-[10px] leading-tight shadow-sm transition hover:shadow ${
                                      isExpired
                                        ? expiredCardClass
                                        : statusCardStyles[
                                            item.appointment.status
                                          ]
                                    }`}
                                    style={{
                                      top,
                                      height,
                                      left: `calc(${
                                        (item.lane / item.lanes) * 100
                                      }% + 2px)`,
                                      width: `calc(${100 / item.lanes}% - 4px)`,
                                    }}
                                    title={`${title} • ${formatTime(
                                      item.start,
                                    )} - ${formatTime(item.end)}`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="truncate font-semibold">
                                        {title}
                                      </span>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="mt-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                  {weekDays.map((day) => {
                    const dateKey = toDateKey(day.date);
                    const items = timelineByDay.get(dateKey) ?? [];
                    return (
                      <div
                        key={`grid-${dateKey}`}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-black/5"
                      >
                        <div
                          className={`border-b border-slate-200 px-3 py-2 ${
                            day.isToday ? "bg-amber-50" : "bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge tone="amber">{day.shortLabel}</Badge>
                            {day.isToday ? (
                              <Badge tone="emerald">
                                {t("schedule.today")}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {day.dateLabel}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 p-3">
                          {loading ? (
                            Array.from({ length: 2 }, (_, index) => (
                              <div
                                key={`grid-skeleton-${dateKey}-${index}`}
                                className="h-[120px] rounded-xl border border-slate-200 bg-slate-100 animate-pulse"
                              />
                            ))
                          ) : items.length ? (
                            items.map((item) => {
                              const appointment = item.appointment;
                              const company = companyById.get(
                                appointment.companyId,
                              );
                              const timeDisplay = getAppointmentTimeDisplay(
                                appointment,
                                t,
                              );
                              const title =
                                company?.name ||
                                t("company.appointmentFallback");
                              const statusLabel = t(
                                isExpiredAppointment(appointment, todayStart)
                                  ? "schedule.statusExpired"
                                  : `schedule.status.${appointment.status}`,
                              );
                              const opportunities =
                                appointment.oportunidades ?? [];
                              const visibleOpportunities = opportunities.slice(
                                0,
                                opportunityBadgeLimit,
                              );
                              const remainingOpportunities =
                                opportunities.length -
                                visibleOpportunities.length;
                              const recordsCount = opportunities.length;

                              return (
                                <Link
                                  key={appointment.id}
                                  href={`/cronograma/${appointment.id}`}
                                  className={`flex flex-col gap-2 rounded-xl border p-3 shadow-sm transition hover:shadow ${
                                    isSuggestedAppointment(appointment)
                                      ? suggestionHighlightClass
                                      : "border-slate-200 bg-white"
                                  }`}
                                  title={`${title} • ${timeDisplay.title}`}
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-900">
                                      {title}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <Badge
                                      tone={
                                        isExpiredAppointment(
                                          appointment,
                                          todayStart,
                                        )
                                          ? "slate"
                                          : STATUS_TONES[appointment.status]
                                      }
                                    >
                                      {statusLabel}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {timeDisplay.content}
                                  </div>
                                  <div className="text-xs font-semibold text-slate-600">
                                    {t("company.recordsCount", {
                                      count: recordsCount,
                                    })}
                                  </div>

                                  {/* Badges de oportunidade comentadas temporariamente. */}
                                  {/* <div className="mt-2 flex min-h-[18px] flex-wrap gap-1">
                                    {isAppointmentDone(appointment) &&
                                    opportunities.length
                                      ? [
                                          ...visibleOpportunities.map(
                                            (opportunity) => (
                                              <Badge
                                                key={`${appointment.id}-${opportunity}`}
                                                tone="sky"
                                                className="text-[10px]"
                                              >
                                                {t(
                                                  `schedule.opportunity.${opportunity}`,
                                                  undefined,
                                                  opportunity,
                                                )}
                                              </Badge>
                                            ),
                                          ),
                                          remainingOpportunities > 0 ? (
                                            <Badge
                                              key={`${appointment.id}-more`}
                                              tone="slate"
                                              className="text-[10px]"
                                            >
                                              +{remainingOpportunities}
                                            </Badge>
                                          ) : null,
                                        ]
                                      : null}
                                  </div> */}
                                </Link>
                              );
                            })
                          ) : (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                              {t("schedule.noAppointmentsDay")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setShowCompanies((prev) => !prev)}
                    className={`rounded-lg border px-3 py-2 transition ${
                      showCompanies ? toggleActiveClass : toggleInactiveClass
                    }`}
                  >
                    {t("schedule.map.companies")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckIns((prev) => !prev)}
                    className={`rounded-lg border px-3 py-2 transition ${
                      showCheckIns
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : toggleInactiveClass
                    }`}
                  >
                    {t("schedule.map.checkIns")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckOuts((prev) => !prev)}
                    className={`rounded-lg border px-3 py-2 transition ${
                      showCheckOuts
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : toggleInactiveClass
                    }`}
                  >
                    {t("schedule.map.checkOuts")}
                  </button>
                </div>

                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5">
                    <div className="h-3 w-28 rounded-full bg-slate-200 animate-pulse" />
                    <div className="mt-4 h-64 w-full rounded-2xl bg-slate-200/70 animate-pulse" />
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {Array.from({ length: 3 }, (_, index) => (
                        <div
                          key={`map-skeleton-${index}`}
                          className="h-8 rounded-lg bg-slate-200/80 animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <ScheduleMapView
                    appointments={visibleAppointments}
                    companies={companies}
                    showCompanies={showCompanies}
                    showCheckIns={showCheckIns}
                    showCheckOuts={showCheckOuts}
                    visible={viewMode === "map"}
                    loading={loading}
                    error={error}
                    t={t}
                  />
                )}
              </div>
            )}
          </div>
        ) : activeTab === "agendamentos" ? (
          <div className={`${panelClass} p-3 sm:p-4`}>
            <div className="flex flex-col gap-3">
              <ToolbarRow
                className={toolbarCardClass}
                summary={
                  isAppointmentsLoading ? (
                    <div className="h-3 w-28 rounded-full bg-slate-200 animate-pulse" />
                  ) : (
                    <span>
                      {t("schedule.appointmentsCount", {
                        count: filteredAppointments.length,
                      })}
                    </span>
                  )
                }
              >
                {consultantMultiSelectControl}
                <ToolbarField
                  label={t("schedule.statusFilterLabel")}
                  className="sm:min-w-[240px]"
                  contentClassName="w-full"
                >
                  <div className="w-full min-w-[180px]">
                      <LeadTypesMultiSelect
                        value={appointmentStatus}
                        options={appointmentStatusOptions}
                        onChange={(next) =>
                          setAppointmentStatus(
                            next.filter(
                              (status): status is AppointmentListStatusFilter =>
                                status === "expired" ||
                                status === "scheduled" ||
                                status === "in_progress" ||
                                status === "done" ||
                              status === "absent" ||
                              status === "atuado",
                          ),
                        )
                      }
                      placeholder={t("schedule.statusAll")}
                      searchPlaceholder={t(
                        "schedule.statusFilterSearchPlaceholder",
                      )}
                      noResultsText={t("schedule.statusFilterNoResults")}
                      selectedCountTemplate={t(
                        "schedule.multiSelectSelectedCount",
                      )}
                    />
                  </div>
                </ToolbarField>
                <ToolbarField
                  label={t("schedule.opportunityFilterLabel")}
                  className="sm:min-w-[270px]"
                  contentClassName="w-full"
                >
                  <div className="w-full min-w-[210px]">
                    <LeadTypesMultiSelect
                      value={appointmentOpportunity}
                      options={appointmentOpportunityOptions}
                      onChange={(next) => setAppointmentOpportunity(next)}
                      placeholder={t("schedule.opportunityAll")}
                      searchPlaceholder={t(
                        "schedule.opportunityFilterSearchPlaceholder",
                      )}
                      noResultsText={t(
                        "schedule.opportunityFilterNoResults",
                      )}
                      selectedCountTemplate={t(
                        "schedule.multiSelectSelectedCount",
                      )}
                    />
                  </div>
                </ToolbarField>
              </ToolbarRow>

              <ToolbarRow
                className={toolbarCardClass}
                summary={<span className="sr-only">.</span>}
              >
                <ToolbarField
                  label={t("schedule.search")}
                  srOnlyLabel
                  className="sm:min-w-[260px]"
                  contentClassName="w-full"
                >
                  <input
                    type="search"
                    value={appointmentSearch}
                    onChange={(event) =>
                      setAppointmentSearch(event.target.value)
                    }
                    placeholder={t("schedule.appointmentsSearchPlaceholder")}
                    disabled={!selectedListConsultantIds.length}
                    aria-label={t("schedule.search")}
                    className={toolbarInputClass}
                  />
                </ToolbarField>
                <ToolbarField
                  label={t("schedule.visibleColumnsLabel")}
                  className="sm:min-w-[250px]"
                  contentClassName="w-full"
                >
                  <div className="w-full min-w-[190px]">
                    <LeadTypesMultiSelect
                      value={appointmentVisibleColumns}
                      options={appointmentColumnOptions}
                      onChange={(next) =>
                        setAppointmentVisibleColumns((current) => {
                          const valid = sanitizeSelection(
                            next,
                            APPOINTMENT_COLUMN_VALUES,
                            APPOINTMENT_COLUMN_VALUES,
                          );
                          return valid.length ? valid : current;
                        })
                      }
                      placeholder={t("schedule.visibleColumnsPlaceholder")}
                      searchPlaceholder={t(
                        "schedule.visibleColumnsSearchPlaceholder",
                      )}
                      noResultsText={t("schedule.visibleColumnsNoResults")}
                      selectedCountTemplate={t(
                        "schedule.multiSelectSelectedCount",
                      )}
                    />
                  </div>
                </ToolbarField>
                <ToolbarField
                  label={t("schedule.orderBy")}
                  className="sm:min-w-[220px]"
                  contentClassName="w-full"
                >
                  <select
                    value={appointmentSort}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (
                        value === "date_desc" ||
                        value === "date_asc" ||
                        value === "alpha_asc" ||
                        value === "alpha_desc" ||
                        value === "consultant_asc" ||
                        value === "consultant_desc" ||
                        value === "cotacoes"
                      ) {
                        setAppointmentSort(value);
                        return;
                      }
                      setAppointmentSort("date_desc");
                    }}
                    aria-label={t("schedule.appointmentSortLabel")}
                    className={toolbarInputClass}
                  >
                    <option value="date_asc">
                      {t("schedule.appointmentSortDateAsc")}
                    </option>
                    <option value="date_desc">
                      {t("schedule.appointmentSortDateDesc")}
                    </option>
                    <option value="alpha_asc">
                      {t("schedule.appointmentSortAlphaAsc")}
                    </option>
                    <option value="alpha_desc">
                      {t("schedule.appointmentSortAlphaDesc")}
                    </option>
                    <option value="consultant_asc">
                      {t("schedule.columnSortAsc")} · {t("schedule.appointmentList.consultant")}
                    </option>
                    <option value="consultant_desc">
                      {t("schedule.columnSortDesc")} · {t("schedule.appointmentList.consultant")}
                    </option>
                    <option value="cotacoes">
                      {t("schedule.orderByQuotes")}
                    </option>
                  </select>
                </ToolbarField>
              </ToolbarRow>

              <PaginationControls
                className="px-1"
                summary={
                  isAppointmentsLoading ? (
                    <div className="h-3 w-36 rounded-full bg-slate-200 animate-pulse" />
                  ) : (
                    t("schedule.paginationSummary", appointmentPageSummary)
                  )
                }
                pageInfo={
                  isAppointmentsLoading ? (
                    <div className="h-3 w-20 rounded-full bg-slate-200 animate-pulse" />
                  ) : (
                    t("schedule.paginationPage", {
                      page: appointmentPage,
                      total: totalAppointmentPages,
                    })
                  )
                }
                prevLabel={t("schedule.paginationPrev")}
                nextLabel={t("schedule.paginationNext")}
                onPrev={() =>
                  setAppointmentPage((current) => Math.max(1, current - 1))
                }
                onNext={() =>
                  setAppointmentPage((current) =>
                    Math.min(totalAppointmentPages, current + 1),
                  )
                }
                prevDisabled={appointmentPage <= 1 || isAppointmentsLoading}
                nextDisabled={
                  appointmentPage >= totalAppointmentPages ||
                  isAppointmentsLoading
                }
              />

              {listAppointmentsError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {listAppointmentsError}
                </div>
              ) : null}
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-black/5">
              <div
                className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3"
                style={{ gridTemplateColumns: appointmentGridTemplateColumns }}
              >
                {visibleAppointmentColumns.map((column) => (
                  <div key={column.id} className="min-w-0">
                    {column.id === "empresa" ? (
                      <TableColumnFilterHeader
                        label={column.label}
                        filterValue={appointmentCompanyFilter}
                        filterOptions={appointmentCompanyOptions}
                        onFilterChange={setAppointmentCompanyFilter}
                        filterPlaceholder={column.label}
                        filterAllLabel={t("schedule.dashboard.allCompanies")}
                        filterSearchPlaceholder={t("schedule.companyFilterSearchPlaceholder")}
                        filterNoResultsText={t("schedule.companyFilterNoResults")}
                        selectedCountTemplate={t("schedule.multiSelectSelectedCount")}
                        selectAllLabel={t("schedule.multiSelectSelectAll")}
                        clearAllLabel={t("schedule.multiSelectClearAll")}
                        sortValue={appointmentSort === "alpha_asc" || appointmentSort === "alpha_desc" ? appointmentSort : "__none__"}
                        sortOptions={appointmentHeaderSortOptions.empresa}
                        onSortChange={(next) => setAppointmentSort(next === "__none__" ? "date_desc" : next as typeof appointmentSort)}
                        sortAriaLabel={column.label}
                      />
                    ) : column.id === "consultor" ? (
                      <TableColumnFilterHeader
                        label={column.label}
                        filterValue={appointmentConsultantFilter}
                        filterOptions={appointmentConsultantOptions}
                        onFilterChange={setAppointmentConsultantFilter}
                        filterPlaceholder={column.label}
                        filterAllLabel={t("schedule.dashboard.allConsultants")}
                        filterSearchPlaceholder={t("schedule.consultantFilterSearchPlaceholder")}
                        filterNoResultsText={t("schedule.emptyConsultant")}
                        selectedCountTemplate={t("schedule.multiSelectSelectedCount")}
                        selectAllLabel={t("schedule.multiSelectSelectAll")}
                        clearAllLabel={t("schedule.multiSelectClearAll")}
                        sortValue={appointmentSort === "consultant_asc" || appointmentSort === "consultant_desc" ? appointmentSort : "__none__"}
                        sortOptions={appointmentHeaderSortOptions.consultor}
                        onSortChange={(next) => setAppointmentSort(next === "__none__" ? "date_desc" : next as typeof appointmentSort)}
                        sortAriaLabel={column.label}
                      />
                    ) : (
                      <span className="block truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {column.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="divide-y divide-slate-200">
                {!selectedListConsultantIds.length ? (
                  <div className="px-5 py-4 text-sm text-slate-500">
                    {t("schedule.selectConsultantToViewAppointments")}
                  </div>
                ) : isAppointmentsLoading ? (
                  appointmentSkeletonRows.map((index) => (
                    <div
                      key={`appointment-skeleton-${index}`}
                      className="grid min-w-0 items-center gap-4 px-5 py-3 text-sm min-h-[56px]"
                      style={{
                        gridTemplateColumns: appointmentGridTemplateColumns,
                      }}
                    >
                      {visibleAppointmentColumns.map((column) => (
                        <div key={`${index}-${column.id}`} className="min-w-0">
                          <div className="h-4 w-4/5 rounded-full bg-slate-200 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  paginatedAppointments.map((appointment) => {
                    return (
                      <Link
                        key={appointment.id}
                        href={`/cronograma/${appointment.id}`}
                        className="grid min-w-0 items-center gap-4 px-5 py-3 text-sm text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A900]/50"
                        style={{
                          gridTemplateColumns: appointmentGridTemplateColumns,
                        }}
                      >
                        {visibleAppointmentColumns.map((column) => (
                          <div
                            key={`${appointment.id}-${column.id}`}
                            className="min-w-0 overflow-hidden"
                          >
                            {renderAppointmentCell(column.id, appointment)}
                          </div>
                        ))}
                      </Link>
                    );
                  })
                )}

                {!isAppointmentsLoading &&
                  selectedListConsultantIds.length > 0 &&
                  filteredAppointments.length === 0 && (
                    <div className="px-5 py-4 text-sm text-slate-500">
                      {t("schedule.noAppointmentsFound")}
                    </div>
                  )}
              </div>
              {!isAppointmentsLoading && filteredAppointments.length > 0 ? (
                <PaginationControls
                  className="border-t border-slate-200 bg-slate-50 px-5 py-3"
                  summary={t(
                    "schedule.paginationSummary",
                    appointmentPageSummary,
                  )}
                  pageInfo={t("schedule.paginationPage", {
                    page: appointmentPage,
                    total: totalAppointmentPages,
                  })}
                  prevLabel={t("schedule.paginationPrev")}
                  nextLabel={t("schedule.paginationNext")}
                  onPrev={() =>
                    setAppointmentPage((current) => Math.max(1, current - 1))
                  }
                  onNext={() =>
                    setAppointmentPage((current) =>
                      Math.min(totalAppointmentPages, current + 1),
                    )
                  }
                  prevDisabled={appointmentPage <= 1}
                  nextDisabled={appointmentPage >= totalAppointmentPages}
                />
              ) : null}
            </div>
          </div>
        ) : activeTab === "dashboard" ? (
          renderDashboard()
        ) : (
          <div className={`${panelClass} p-3 sm:p-4`}>
            <div className="flex flex-col gap-3">
              <ToolbarRow
                className={toolbarCardClass}
                summary={
                  isCompaniesLoading ? (
                    <div className="h-3 w-28 rounded-full bg-slate-200 animate-pulse" />
                  ) : (
                    <span>
                      {t("schedule.companiesCount", {
                        count: filteredCompanies.length,
                      })}
                    </span>
                  )
                }
              >
                {consultantMultiSelectControl}
                <ToolbarField
                  className="sm:min-w-[210px]"
                  contentClassName="w-full"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showOutsidePortfolio}
                      onChange={(event) =>
                        setShowOutsidePortfolio(event.target.checked)
                      }
                      disabled={!selectedListConsultantIds.length}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span>{t("schedule.outsidePortfolioToggle")}</span>
                  </div>
                </ToolbarField>
                {/* <button
                  type="button"
                  onClick={() => refresh()}
                  className={`w-full sm:w-auto ${softButtonClass}`}
                >
                  Atualizar
                </button> */}
              </ToolbarRow>
              <ToolbarRow
                className={toolbarCardClass}
                summary={<span className="sr-only">.</span>}
              >
                <ToolbarField
                  label={t("schedule.search")}
                  srOnlyLabel
                  className="sm:min-w-[260px]"
                  contentClassName="w-full"
                >
                  <input
                    type="search"
                    value={companySearch}
                    onChange={(event) => setCompanySearch(event.target.value)}
                    placeholder={
                      selectedListConsultantIds.length
                        ? t("schedule.searchPlaceholderWithConsultant")
                        : t("schedule.searchPlaceholderNoConsultant")
                    }
                    disabled={!selectedListConsultantIds.length}
                    aria-label={t("schedule.search")}
                    className={toolbarInputClass}
                  />
                </ToolbarField>
                <ToolbarField
                  label={t("schedule.visibleColumnsLabel")}
                  className="sm:min-w-[250px]"
                  contentClassName="w-full"
                >
                  <div className="w-full min-w-[190px]">
                    <LeadTypesMultiSelect
                      value={companyVisibleColumns}
                      options={companyColumnOptions}
                      onChange={(next) =>
                        setCompanyVisibleColumns((current) => {
                          const valid = sanitizeSelection(
                            next,
                            COMPANY_COLUMN_VALUES,
                            COMPANY_COLUMN_VALUES,
                          );
                          return valid.length ? valid : current;
                        })
                      }
                      placeholder={t("schedule.visibleColumnsPlaceholder")}
                      searchPlaceholder={t(
                        "schedule.visibleColumnsSearchPlaceholder",
                      )}
                      noResultsText={t("schedule.visibleColumnsNoResults")}
                      selectedCountTemplate={t(
                        "schedule.multiSelectSelectedCount",
                      )}
                    />
                  </div>
                </ToolbarField>
                <ToolbarField
                  label={t("schedule.orderBy")}
                  className="sm:min-w-[220px]"
                  contentClassName="w-full"
                >
                  <select
                    value={companySort}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (
                        value === "name_desc" ||
                        value === "csa_asc" ||
                        value === "csa_desc" ||
                        value === "preventivas" ||
                        value === "reconexoes" ||
                        value === "cotacoes" ||
                        value === "last_visit"
                      ) {
                        setCompanySort(value);
                        return;
                      }
                      setCompanySort("name");
                    }}
                    aria-label={t("schedule.orderBy")}
                    className={toolbarInputClass}
                  >
                    <option value="name">{t("schedule.orderByName")}</option>
                    <option value="name_desc">
                      {t("schedule.columnSortDesc")} · {t("company.info.name")}
                    </option>
                    <option value="csa_asc">
                      {t("schedule.columnSortAsc")} · {t("company.info.csa")}
                    </option>
                    <option value="csa_desc">
                      {t("schedule.columnSortDesc")} · {t("company.info.csa")}
                    </option>
                    <option value="preventivas">
                      {t("schedule.orderByPreventivas")}
                    </option>
                    <option value="reconexoes">
                      {t("schedule.orderByReconexoes")}
                    </option>
                    <option value="cotacoes">
                      {t("schedule.orderByQuotes")}
                    </option>
                    <option value="last_visit">
                      {t("schedule.orderByLastVisit")}
                    </option>
                  </select>
                </ToolbarField>
              </ToolbarRow>
              <PaginationControls
                className="px-1"
                summary={
                  isCompaniesLoading ? (
                    <div className="h-3 w-36 rounded-full bg-slate-200 animate-pulse" />
                  ) : (
                    t("schedule.paginationSummary", companyPageSummary)
                  )
                }
                pageInfo={
                  isCompaniesLoading ? (
                    <div className="h-3 w-20 rounded-full bg-slate-200 animate-pulse" />
                  ) : (
                    t("schedule.paginationPage", {
                      page: companyPage,
                      total: totalCompanyPages,
                    })
                  )
                }
                prevLabel={t("schedule.paginationPrev")}
                nextLabel={t("schedule.paginationNext")}
                onPrev={() =>
                  setCompanyPage((current) => Math.max(1, current - 1))
                }
                onNext={() =>
                  setCompanyPage((current) =>
                    Math.min(totalCompanyPages, current + 1),
                  )
                }
                prevDisabled={companyPage <= 1 || isCompaniesLoading}
                nextDisabled={
                  companyPage >= totalCompanyPages || isCompaniesLoading
                }
              />

              {companiesListError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {companiesListError}
                </div>
              ) : null}
              {protheusError ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  {protheusError}
                </div>
              ) : null}
              {openQuotesError ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  {openQuotesError}
                </div>
              ) : null}
              {lastVisitError ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  {lastVisitError}
                </div>
              ) : null}
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-black/5">
              <div
                className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3"
                style={{ gridTemplateColumns: companyGridTemplateColumns }}
              >
                {visibleCompanyColumns.map((column) => (
                  <div key={column.id} className="min-w-0">
                    {column.id === "empresa" ? (
                      <TableColumnFilterHeader
                        label={column.label}
                        filterValue={companyNameFilter}
                        filterOptions={companyNameOptions}
                        onFilterChange={setCompanyNameFilter}
                        filterPlaceholder={column.label}
                        filterAllLabel={t("schedule.dashboard.allCompanies")}
                        filterSearchPlaceholder={t("schedule.companyFilterSearchPlaceholder")}
                        filterNoResultsText={t("schedule.companyFilterNoResults")}
                        selectedCountTemplate={t("schedule.multiSelectSelectedCount")}
                        selectAllLabel={t("schedule.multiSelectSelectAll")}
                        clearAllLabel={t("schedule.multiSelectClearAll")}
                        sortValue={companySort === "name" || companySort === "name_desc" ? companySort : "__none__"}
                        sortOptions={companyHeaderSortOptions.empresa}
                        onSortChange={(next) => setCompanySort(next === "__none__" ? "name" : next as typeof companySort)}
                        sortAriaLabel={column.label}
                      />
                    ) : column.id === "csa" ? (
                      <TableColumnFilterHeader
                        label={column.label}
                        filterValue={companyConsultantFilter}
                        filterOptions={companyConsultantOptions}
                        onFilterChange={setCompanyConsultantFilter}
                        filterPlaceholder={column.label}
                        filterAllLabel={t("schedule.dashboard.allConsultants")}
                        filterSearchPlaceholder={t("schedule.consultantFilterSearchPlaceholder")}
                        filterNoResultsText={t("schedule.emptyConsultant")}
                        selectedCountTemplate={t("schedule.multiSelectSelectedCount")}
                        selectAllLabel={t("schedule.multiSelectSelectAll")}
                        clearAllLabel={t("schedule.multiSelectClearAll")}
                        sortValue={companySort === "csa_asc" || companySort === "csa_desc" ? companySort : "__none__"}
                        sortOptions={companyHeaderSortOptions.consultor}
                        onSortChange={(next) => setCompanySort(next === "__none__" ? "name" : next as typeof companySort)}
                        sortAriaLabel={column.label}
                      />
                    ) : (
                      <span className="block truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {column.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="divide-y divide-slate-200">
                {!selectedListConsultantIds.length ? (
                  <div className="px-5 py-4 text-sm text-slate-500">
                    {t("schedule.selectConsultantToViewCompanies")}
                  </div>
                ) : isCompaniesLoading ? (
                  companySkeletonRows.map((index) => (
                    <div
                      key={`company-skeleton-${index}`}
                      className="grid min-w-0 items-center gap-4 px-5 py-3 text-sm min-h-[56px]"
                      style={{
                        gridTemplateColumns: companyGridTemplateColumns,
                      }}
                    >
                      {visibleCompanyColumns.map((column) => (
                        <div key={`${index}-${column.id}`} className="min-w-0">
                          <div className="h-4 w-4/5 rounded-full bg-slate-200 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  paginatedCompanies.map((company) => (
                    <Link
                      key={company.id}
                      href={`/cronograma/empresa/${company.id}`}
                      className="grid min-w-0 items-center gap-4 px-5 py-3 text-sm text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A900]/50"
                      style={{
                        gridTemplateColumns: companyGridTemplateColumns,
                      }}
                    >
                      {visibleCompanyColumns.map((column) => (
                        <div
                          key={`${company.id}-${column.id}`}
                          className="min-w-0 overflow-hidden"
                        >
                          {renderCompanyCell(column.id, company)}
                        </div>
                      ))}
                    </Link>
                  ))
                )}

                {!isCompaniesLoading &&
                  selectedListConsultantIds.length > 0 &&
                  filteredCompanies.length === 0 && (
                    <div className="px-5 py-4 text-sm text-slate-500">
                      {t("schedule.noCompaniesFound")}
                    </div>
                  )}
              </div>
              {!isCompaniesLoading && filteredCompanies.length > 0 ? (
                <PaginationControls
                  className="border-t border-slate-200 bg-slate-50 px-5 py-3"
                  summary={t("schedule.paginationSummary", companyPageSummary)}
                  pageInfo={t("schedule.paginationPage", {
                    page: companyPage,
                    total: totalCompanyPages,
                  })}
                  prevLabel={t("schedule.paginationPrev")}
                  nextLabel={t("schedule.paginationNext")}
                  onPrev={() =>
                    setCompanyPage((current) => Math.max(1, current - 1))
                  }
                  onNext={() =>
                    setCompanyPage((current) =>
                      Math.min(totalCompanyPages, current + 1),
                    )
                  }
                  prevDisabled={companyPage <= 1}
                  nextDisabled={companyPage >= totalCompanyPages}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function CronogramaClient(props: CronogramaClientProps) {
  const t = useMemo(
    () => createTranslator(getMessages(props.locale)),
    [props.locale],
  );

  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10 text-sm text-slate-500">
            {t("schedule.loading")}
          </div>
        </PageShell>
      }
    >
      <CronogramaClientContent {...props} />
    </Suspense>
  );
}
