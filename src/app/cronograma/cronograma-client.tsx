"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { Tabs } from "@/components/Tabs";
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
  addDays,
  addMonths,
  formatDateLabel,
  formatMonthLabel,
  formatTime,
  formatWeekday,
  getWeeksForMonth,
  isSameDay,
  isAppointmentDone,
  STATUS_TONES,
  matchesConsultantCompany,
  startOfDay,
  type SupabaseAppointmentStatus,
  type Appointment,
  toDateKey,
} from "@/lib/schedule";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { createTranslator, getMessages, type Locale } from "@/lib/i18n";
import { ScheduleMapView } from "./components/ScheduleMapView";
import { CreateAppointmentModal } from "./components/CreateAppointmentPanel";

type CronogramaClientProps = {
  initialTab?: "cronograma" | "empresas";
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

const statusCardStyles: Record<SupabaseAppointmentStatus, string> = {
  scheduled: "border-amber-300 bg-amber-50 text-amber-900",
  in_progress: "border-sky-300 bg-sky-50 text-sky-900",
  done: "border-emerald-300 bg-emerald-50 text-emerald-900",
  absent: "border-rose-300 bg-rose-50 text-rose-900",
};

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

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

export default function CronogramaClient({
  initialTab = "cronograma",
  locale,
}: CronogramaClientProps) {
  const {
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
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const today = useMemo(() => new Date(), []);

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

  const [viewMode, setViewMode] = useState<"board" | "grid" | "map">("board");
  const [activeTab, setActiveTab] = useState<"cronograma" | "empresas">(
    initialTab,
  );
  const [companySort, setCompanySort] = useState<
    "name" | "preventivas" | "reconexoes" | "cotacoes" | "last_visit"
  >("name");
  const [companyPage, setCompanyPage] = useState(1);
  const [loadedConsultantId, setLoadedConsultantId] = useState<string | null>(
    null,
  );
  const companiesPerPage = 20;
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [showCompanies, setShowCompanies] = useState(true);
  const [showCheckIns, setShowCheckIns] = useState(true);
  const [showCheckOuts, setShowCheckOuts] = useState(true);
  const [companySearch, setCompanySearch] = useState("");
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

  const companySkeletonRows = useMemo(
    () => Array.from({ length: companiesPerPage }, (_, index) => index),
    [companiesPerPage],
  );

  const weeks = useMemo(() => getWeeksForMonth(selectedMonth), [selectedMonth]);

  useEffect(() => {
    if (!weeks.length) return;
    const todayKey = toDateKey(today);
    const index = weeks.findIndex(
      (week) =>
        todayKey >= toDateKey(week.startAt) &&
        todayKey <= toDateKey(week.endAt),
    );
    setSelectedWeekIndex(index >= 0 ? index : 0);
  }, [selectedMonth, weeks, today]);

  const selectedWeek = weeks[selectedWeekIndex] ?? weeks[0];
  const defaultCreateDate = useMemo(() => {
    if (!selectedWeek) return today;
    const todayKey = toDateKey(today);
    const startKey = toDateKey(selectedWeek.startAt);
    const endKey = toDateKey(selectedWeek.endAt);
    if (todayKey >= startKey && todayKey <= endKey) return today;
    return selectedWeek.startAt;
  }, [selectedWeek, today]);

  useEffect(() => {
    if (!selectedWeek) return;
    setRange({ startAt: selectedWeek.startAt, endAt: selectedWeek.endAt });
  }, [selectedWeek, setRange]);

  useEffect(() => {
    setCompanySort("name");
    setCompanySearch("");
    setCompanyPage(1);
  }, [selectedConsultantId]);

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

  const timelineByDay = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    appointments.forEach((appointment) => {
      const range = resolveTimelineRange(appointment);
      const dateKey = toDateKey(range.start);
      const bucket = map.get(dateKey) ?? [];
      bucket.push({ appointment, ...range });
      map.set(dateKey, bucket);
    });
    return map;
  }, [appointments]);

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

  const selectedConsultant = useMemo(
    () => consultants.find((item) => item.id === selectedConsultantId) ?? null,
    [consultants, selectedConsultantId],
  );

  const totalAppointments = appointments.length;
  const normalizedCompanySearch = companySearch.trim().toLowerCase();

  const companiesByConsultant = useMemo(() => {
    if (!selectedConsultant?.name) return [];
    return companies.filter((company) =>
      matchesConsultantCompany(company, selectedConsultant.name),
    );
  }, [companies, selectedConsultant]);

  const companyIdsByConsultant = useMemo(
    () => Array.from(new Set(companiesByConsultant.map((company) => company.id))),
    [companiesByConsultant],
  );

  const protheusLookup = useMemo(() => {
    const variantToCompany = new Map<string, string>();
    const variants: string[] = [];

    companiesByConsultant.forEach((company) => {
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
  }, [companiesByConsultant]);

  const openQuotesLookup = useMemo(() => {
    const cnpjToCompany = new Map<string, string>();
    const cnpjs: string[] = [];

    companiesByConsultant.forEach((company) => {
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
  }, [companiesByConsultant]);

  useEffect(() => {
    if (!selectedConsultantId) {
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
  }, [protheusLookup, selectedConsultantId, supabase, t]);

  useEffect(() => {
    if (!selectedConsultantId) {
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
            .in("cnpj", chunk);

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
  }, [openQuotesLookup, selectedConsultantId, supabase, t]);

  useEffect(() => {
    if (!selectedConsultantId) {
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
      const consultantKey = selectedConsultantId.trim();

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

          if (consultantKey) {
            if (consultantKey.includes("@")) {
              query = query.eq("consultant_name", consultantKey);
            } else {
              query = query.eq("consultant_id", consultantKey);
            }
          }

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
  }, [companyIdsByConsultant, selectedConsultantId, supabase, t]);

  const filteredCompanies = useMemo(() => {
    if (!normalizedCompanySearch) return companiesByConsultant;
    return companiesByConsultant.filter((company) => {
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
  }, [companiesByConsultant, normalizedCompanySearch]);

  const todayStart = useMemo(() => startOfDay(today), [today]);
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
  }, [companySearch, companySort]);

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
    const end = Math.min(companyPage * companiesPerPage, filteredCompanies.length);
    return {
      start,
      end,
      total: filteredCompanies.length,
    };
  }, [companyPage, filteredCompanies.length]);

  useEffect(() => {
    if (!selectedConsultantId) {
      setLoadedConsultantId(null);
      return;
    }
    if (!loading) {
      setLoadedConsultantId(selectedConsultantId);
    }
  }, [loading, selectedConsultantId]);

  const isCompaniesLoading = Boolean(selectedConsultantId) && (loading || loadedConsultantId !== selectedConsultantId);

  const companyColumns = [
    { id: "empresa", label: t("company.info.name"), width: "1.8fr" },
    { id: "estado", label: t("company.info.state"), width: "0.7fr" },
    { id: "csa", label: t("company.info.csa"), width: "0.9fr" },
    { id: "carteira", label: t("company.info.carteira"), width: "1.2fr" },
    { id: "classe", label: t("company.info.class"), width: "1.2fr" },
    { id: "referencia", label: t("company.info.reference"), width: "1.1fr" },
    { id: "ultimaVisita", label: t("schedule.lastVisitDays"), width: "1.1fr" },
    { id: "oportunidades", label: t("company.opportunities"), width: "1fr" },
    { id: "cotacoes", label: t("schedule.orderByQuotes"), width: "1.2fr" },
  ] as const;

  const companyGridTemplateColumns = companyColumns
    .map((column) => column.width)
    .join(" ");

  return (
    <PageShell title={t("schedule.title")} subtitle={t("schedule.subtitle")}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            tabs={[
              { id: "cronograma", label: t("schedule.tabSchedule") },
              { id: "empresas", label: t("schedule.tabCompanies") },
            ]}
            activeTabId={activeTab}
            onTabChange={(id) =>
              setActiveTab(id === "empresas" ? "empresas" : "cronograma")
            }
          />
        </div>

        {activeTab === "cronograma" ? (
          <div className={`${panelClass} p-3 sm:p-4`}>
            <div className="flex flex-col gap-3">
              <div
                className={`${toolbarCardClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <span>
                    {t("schedule.appointmentsCount", {
                      count: totalAppointments,
                    })}
                  </span>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
                  <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm sm:w-auto">
                    <span className="sr-only">{t("schedule.consultant")}</span>
                    <select
                      value={selectedConsultantId ?? ""}
                      onChange={(event) => {
                        const next = event.target.value || null;
                        setSelectedConsultantId(next);
                      }}
                      disabled={!consultants.length}
                      aria-label={t("schedule.consultant")}
                      className="min-w-[160px] bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
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
                  </label>
                  {/* <button
                    type="button"
                    onClick={() => refresh()}
                    className={`w-full sm:w-auto ${softButtonClass}`}
                  >
                    Atualizar
                  </button> */}
                  <button
                    type="button"
                    onClick={() => setShowCreateModal((prev) => !prev)}
                    className={`w-full sm:w-auto ${primaryButtonClass}`}
                    aria-expanded={showCreateModal}
                  >
                    {showCreateModal
                      ? t("schedule.closeCreate")
                      : t("schedule.createAppointment")}
                  </button>
                  <Tabs
                    tabs={[
                      { id: "board", label: t("schedule.viewBoard") },
                      { id: "grid", label: t("schedule.viewGrid") },
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
                </div>
              </div>

              <div
                className={`${toolbarCardClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonth((prev) => addMonths(prev, -1))
                    }
                    className={softButtonClass}
                  >
                    <span className="sr-only">{t("schedule.prevMonth")}</span>
                    &lt;
                  </button>
                  <span className="text-sm font-semibold text-slate-800">
                    {formatMonthLabel(selectedMonth)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonth((prev) => addMonths(prev, 1))
                    }
                    className={softButtonClass}
                  >
                    <span className="sr-only">{t("schedule.nextMonth")}</span>
                    &gt;
                  </button>
                </div>

                <div className="flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible">
                  {weeks.map((week, index) => {
                    const isActive = index === selectedWeekIndex;
                    return (
                      <button
                        key={`${toDateKey(week.startAt)}-${index}`}
                        type="button"
                        onClick={() => setSelectedWeekIndex(index)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          isActive ? toggleActiveClass : toggleInactiveClass
                        }`}
                      >
                        {week.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <CreateAppointmentModal
                open={showCreateModal}
                companies={companies}
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
                              <Badge tone="emerald">{t("schedule.today")}</Badge>
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
                                company?.name || t("company.appointmentFallback");
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
                                  (item.end.getTime() - item.start.getTime()) /
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
                                      : statusCardStyles[item.appointment.status]
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
                              const title =
                                company?.name ||
                                t("company.appointmentFallback");
                              const statusLabel = t(
                                isExpiredAppointment(
                                  appointment,
                                  todayStart,
                                )
                                  ? "schedule.statusExpired"
                                  : `schedule.status.${appointment.status}`,
                              );
                              const opportunities =
                                appointment.oportunidades ?? [];
                              const visibleOpportunities =
                                opportunities.slice(0, opportunityBadgeLimit);
                              const remainingOpportunities =
                                opportunities.length -
                                visibleOpportunities.length;
                              const recordsCount = opportunities.length;

                              return (
                                <Link
                                  key={appointment.id}
                                  href={`/cronograma/${appointment.id}`}
                                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow"
                                  title={`${title} • ${formatTime(
                                    appointment.startAt,
                                  )} - ${formatTime(appointment.endAt)}`}
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
                                    {formatTime(appointment.startAt)} -{" "}
                                    {formatTime(appointment.endAt)}
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
                    appointments={appointments}
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
        ) : (
          <div className={`${panelClass} p-3 sm:p-4`}>
            <div className="flex flex-col gap-3">
              <div
                className={`${toolbarCardClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {isCompaniesLoading ? (
                    <div className="h-3 w-28 rounded-full bg-slate-200 animate-pulse" />
                  ) : (
                    <span>
                      {t("schedule.companiesCount", {
                        count: filteredCompanies.length,
                      })}
                    </span>
                  )}
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm sm:w-auto">
                    <span className="sr-only">{t("schedule.consultant")}</span>
                    <select
                      value={selectedConsultantId ?? ""}
                      onChange={(event) => {
                        const next = event.target.value || null;
                        setSelectedConsultantId(next);
                      }}
                      disabled={!consultants.length}
                      aria-label={t("schedule.consultant")}
                      className="min-w-[160px] bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
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
                  </label>
                  <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm sm:w-auto">
                    <span className="sr-only">{t("schedule.search")}</span>
                    <input
                      type="search"
                      value={companySearch}
                      onChange={(event) => setCompanySearch(event.target.value)}
                      placeholder={
                        selectedConsultantId
                          ? t("schedule.searchPlaceholderWithConsultant")
                          : t("schedule.searchPlaceholderNoConsultant")
                      }
                      disabled={!selectedConsultantId}
                      aria-label={t("schedule.search")}
                      className="min-w-[200px] bg-transparent text-sm font-semibold text-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                  <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm sm:w-auto">
                    <span className="sr-only">{t("schedule.orderBy")}</span>
                    <select
                      value={companySort}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (
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
                      className="min-w-[160px] bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="name">{t("schedule.orderByName")}</option>
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
                  </label>
                  {/* <button
                    type="button"
                    onClick={() => refresh()}
                    className={`w-full sm:w-auto ${softButtonClass}`}
                  >
                    Atualizar
                  </button> */}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-semibold text-slate-600">
                {isCompaniesLoading ? (
                  <div className="h-3 w-36 rounded-full bg-slate-200 animate-pulse" />
                ) : (
                  <span>
                    {t("schedule.paginationSummary", companyPageSummary)}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {isCompaniesLoading ? (
                    <div className="h-3 w-20 rounded-full bg-slate-200 animate-pulse" />
                  ) : (
                    <span>
                      {t("schedule.paginationPage", {
                        page: companyPage,
                        total: totalCompanyPages,
                      })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setCompanyPage((current) => Math.max(1, current - 1))
                    }
                    disabled={companyPage <= 1 || isCompaniesLoading}
                    aria-label={t("schedule.paginationPrev")}
                    className={`rounded-lg border px-3 py-1.5 transition ${
                      companyPage <= 1 || isCompaniesLoading
                        ? "border-slate-200 text-slate-400"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {t("schedule.paginationPrev")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCompanyPage((current) =>
                        Math.min(totalCompanyPages, current + 1),
                      )
                    }
                    disabled={
                      companyPage >= totalCompanyPages || isCompaniesLoading
                    }
                    aria-label={t("schedule.paginationNext")}
                    className={`rounded-lg border px-3 py-1.5 transition ${
                      companyPage >= totalCompanyPages || isCompaniesLoading
                        ? "border-slate-200 text-slate-400"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {t("schedule.paginationNext")}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {error}
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
                className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600"
                style={{ gridTemplateColumns: companyGridTemplateColumns }}
              >
                {companyColumns.map((column) => (
                  <span key={column.id}>{column.label}</span>
                ))}
              </div>

              <div className="divide-y divide-slate-200">
                {!selectedConsultant ? (
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
                      {companyColumns.map((column) => (
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
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">
                          {company.name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {company.document ??
                            t("schedule.companyDocumentMissing")}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <Badge tone="sky" className="max-w-[120px] truncate">
                          {company.state ?? t("schedule.noState")}
                        </Badge>
                      </div>
                      <div className="min-w-0">
                        <Badge
                          tone="emerald"
                          className="max-w-[140px] truncate"
                        >
                          {company.csa ?? t("schedule.noCsa")}
                        </Badge>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-slate-700">
                          {company.carteiraDef ?? t("schedule.noCarteira")}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {company.carteiraDef2 ?? t("schedule.noCarteira2")}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-slate-700">
                          {company.clientClass ?? t("schedule.noClass")}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {company.classeCliente ?? t("schedule.noClientClass")}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-slate-700">
                          {company.referencia ?? t("schedule.noReference")}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {company.validacao ?? t("schedule.noValidation")}
                        </div>
                      </div>
                      <div className="min-w-0">
                        {lastVisitError ? (
                          <span className="text-xs text-slate-400">
                            {t("schedule.noData")}
                          </span>
                        ) : lastVisitLoading &&
                          !lastVisitByCompany.has(company.id) ? (
                          <span className="text-xs text-slate-400">
                            {t("schedule.loading")}
                          </span>
                        ) : (() => {
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
                                    lastVisit
                                      ? formatDateLabel(lastVisit)
                                      : undefined
                                  }
                                >
                                  {days} {label}
                                </span>
                              </div>
                            );
                          })()}
                      </div>
                      <div className="min-w-0">
                        {(() => {
                          const counts =
                            protheusCounts.get(company.id) ??
                            buildEmptyProtheusCounts();
                          return (
                            <div className="flex flex-wrap items-center gap-1 text-xs">
                              <Badge tone="amber">P {counts.preventivas}</Badge>
                              <Badge tone="slate">R {counts.reconexoes}</Badge>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="min-w-0">
                        {openQuotesError ? (
                          <span className="text-xs text-slate-400">
                            {t("schedule.noData")}
                          </span>
                        ) : openQuotesLoading &&
                          !openQuotesTotals.has(company.id) ? (
                          <span className="text-xs text-slate-400">
                            {t("schedule.loading")}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-700">
                            {formatCurrency(
                              openQuotesTotals.get(company.id) ?? 0,
                            )}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                )}

                {selectedConsultant &&
                  !isCompaniesLoading &&
                  filteredCompanies.length === 0 && (
                    <div className="px-5 py-4 text-sm text-slate-500">
                      {t("schedule.noCompaniesFound")}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
