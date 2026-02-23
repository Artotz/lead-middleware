"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { Tabs } from "@/components/Tabs";
import { useSchedule } from "@/contexts/ScheduleContext";
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
  matchesConsultantCompany,
  STATUS_LABELS,
  type Appointment,
  toDateKey,
} from "@/lib/schedule";
import { ScheduleMapView } from "./components/ScheduleMapView";
import { CreateAppointmentModal } from "./components/CreateAppointmentPanel";

type CronogramaClientProps = {
  initialTab?: "cronograma" | "empresas";
};

type TimelineItem = {
  appointment: Appointment;
  start: Date;
  end: Date;
  isActual: boolean;
};

type TimelineLayoutItem = TimelineItem & {
  lane: number;
  lanes: number;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatQuantity = (value: number | null) =>
  value == null ? "Sem dados" : numberFormatter.format(value);

const formatCurrency = (value: number | null) =>
  value == null ? "Sem dados" : currencyFormatter.format(value);

const statusCardStyles: Record<keyof typeof STATUS_LABELS, string> = {
  scheduled: "border-amber-200 bg-amber-50 text-amber-900",
  in_progress: "border-sky-200 bg-sky-50 text-sky-900",
  done: "border-emerald-200 bg-emerald-50 text-emerald-900",
  absent: "border-rose-200 bg-rose-50 text-rose-900",
};

const resolveTimelineRange = (
  appointment: Appointment,
): { start: Date; end: Date; isActual: boolean } => {
  const scheduledStart = new Date(appointment.startAt);
  const scheduledEnd = new Date(appointment.endAt);
  const isDone = isAppointmentDone(appointment);
  const checkIn = appointment.checkInAt ? new Date(appointment.checkInAt) : null;
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
    return { start: fallbackStart, end: fallbackEnd, isActual: isDone };
  }

  if (end.getTime() <= start.getTime()) {
    return {
      start,
      end: new Date(start.getTime() + 30 * 60000),
      isActual: isDone,
    };
  }

  return { start, end, isActual: isDone };
};

const layoutTimelineItems = (items: TimelineItem[]): TimelineLayoutItem[] => {
  if (!items.length) return [];
  const sorted = [...items].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const laneEnds: number[] = [];
  const placed = sorted.map((item) => {
    const startTime = item.start.getTime();
    let laneIndex = laneEnds.findIndex((end) => startTime >= end);
    if (laneIndex === -1) {
      laneIndex = laneEnds.length;
      laneEnds.push(item.end.getTime());
    } else {
      laneEnds[laneIndex] = item.end.getTime();
    }
    return { ...item, lane: laneIndex, lanes: 0 };
  });
  const lanes = Math.max(1, laneEnds.length);
  return placed.map((item) => ({ ...item, lanes }));
};

export default function CronogramaClient({
  initialTab = "cronograma",
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
  const today = useMemo(() => new Date(), []);

  const [viewMode, setViewMode] = useState<"board" | "map">("board");
  const [activeTab, setActiveTab] = useState<"cronograma" | "empresas">(
    initialTab,
  );
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [showCompanies, setShowCompanies] = useState(true);
  const [showCheckIns, setShowCheckIns] = useState(true);
  const [showCheckOuts, setShowCheckOuts] = useState(true);
  const [companySearch, setCompanySearch] = useState("");
  const [companySort, setCompanySort] = useState<"vlr-3m" | "qtd-3m">("vlr-3m");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const companySkeletonRows = useMemo(
    () => Array.from({ length: 6 }, (_, index) => index),
    [],
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
        company.qtdUltimos3Meses != null
          ? String(company.qtdUltimos3Meses)
          : null,
        company.vlrUltimos3Meses != null
          ? String(company.vlrUltimos3Meses)
          : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedCompanySearch);
    });
  }, [companiesByConsultant, normalizedCompanySearch]);

  const sortedCompanies = useMemo(() => {
    const sorted = [...filteredCompanies];
    sorted.sort((a, b) => {
      const aValue =
        companySort === "vlr-3m"
          ? (a.vlrUltimos3Meses ?? Number.NEGATIVE_INFINITY)
          : (a.qtdUltimos3Meses ?? Number.NEGATIVE_INFINITY);
      const bValue =
        companySort === "vlr-3m"
          ? (b.vlrUltimos3Meses ?? Number.NEGATIVE_INFINITY)
          : (b.qtdUltimos3Meses ?? Number.NEGATIVE_INFINITY);

      if (aValue === bValue) {
        return a.name.localeCompare(b.name, "pt-BR");
      }

      return bValue - aValue;
    });

    return sorted;
  }, [filteredCompanies, companySort]);

  const companyColumns = [
    { id: "empresa", label: "Empresa", width: "1.8fr" },
    { id: "estado", label: "Estado", width: "0.7fr" },
    { id: "csa", label: "CSA", width: "0.9fr" },
    { id: "carteira", label: "Carteira", width: "1.2fr" },
    { id: "classe", label: "Classe", width: "1.2fr" },
    { id: "referencia", label: "Referencia", width: "1.1fr" },
    { id: "qtd-3m", label: "Qtd 3m", width: "0.7fr" },
    { id: "vlr-3m", label: "Valor 3m", width: "0.9fr" },
  ] as const;

  const companyGridTemplateColumns = companyColumns
    .map((column) => column.width)
    .join(" ");

  return (
    <PageShell
      title="Cronograma semanal"
      subtitle="Agendamentos reais carregados do Supabase por semana."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            tabs={[
              { id: "cronograma", label: "Cronograma" },
              { id: "empresas", label: "Empresas" },
            ]}
            activeTabId={activeTab}
            onTabChange={(id) =>
              setActiveTab(id === "empresas" ? "empresas" : "cronograma")
            }
          />
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {activeTab === "cronograma"
              ? `${totalAppointments} agendamentos`
              : `${filteredCompanies.length} empresas`}
          </div>
        </div>

        {activeTab === "cronograma" ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>Semana selecionada</span>
                  <span>{totalAppointments} agendamentos</span>
                  <span>
                    Consultor:{" "}
                    {selectedConsultant?.name ?? "Consultor nao selecionado"}
                  </span>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  {viewMode === "board" ? (
                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomLevel((prev) => Math.max(0, prev - 1))
                        }
                        disabled={zoomLevel === 0}
                        className="rounded-md px-2 py-1 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Diminuir zoom da semana"
                      >
                        -
                      </button>
                      <span className="px-1 text-[10px] uppercase tracking-wide text-slate-400">
                        Zoom
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
                        aria-label="Aumentar zoom da semana"
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                  <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 sm:w-auto">
                    <span className="uppercase text-[10px] text-slate-400">
                      Consultor
                    </span>
                    <select
                      value={selectedConsultantId ?? ""}
                      onChange={(event) => {
                        const next = event.target.value || null;
                        setSelectedConsultantId(next);
                      }}
                      disabled={!consultants.length}
                      className="min-w-[160px] bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none"
                    >
                      {consultants.length ? (
                        consultants.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))
                      ) : (
                        <option value="">Nenhum consultor</option>
                      )}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => refresh()}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:w-auto"
                  >
                    Atualizar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal((prev) => !prev)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:w-auto"
                    aria-expanded={showCreateModal}
                  >
                    {showCreateModal ? "Fechar criacao" : "Novo apontamento"}
                  </button>
                  <div className="inline-flex w-full items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-semibold sm:w-auto sm:justify-start">
                    {[
                      { id: "board", label: "Agenda" },
                      { id: "map", label: "Mapa" },
                    ].map((tab) => {
                      const isActive = viewMode === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setViewMode(tab.id as "board" | "map")}
                          className={`rounded-md px-2 py-1 transition ${
                            isActive
                              ? "bg-sky-100 text-sky-800"
                              : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonth((prev) => addMonths(prev, -1))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    <span className="sr-only">Mes anterior</span>
                    &lt;
                  </button>
                  <span className="text-xs font-semibold text-slate-700">
                    {formatMonthLabel(selectedMonth)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonth((prev) => addMonths(prev, 1))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    <span className="sr-only">Proximo mes</span>
                    &gt;
                  </button>
                </div>

                <div className="flex w-full flex-nowrap gap-1 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible">
                  {weeks.map((week, index) => {
                    const isActive = index === selectedWeekIndex;
                    return (
                      <button
                        key={`${toDateKey(week.startAt)}-${index}`}
                        type="button"
                        onClick={() => setSelectedWeekIndex(index)}
                        className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                          isActive
                            ? "border-sky-300 bg-sky-100 text-sky-800"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
                onClose={() => setShowCreateModal(false)}
                onCreated={async () => {
                  await refresh();
                }}
              />

              {error ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              ) : null}
              {loading ? (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                  Carregando cronograma...
                </div>
              ) : null}
            </div>

            {viewMode === "board" ? (
              <div className="mt-3">
                <div className="overflow-x-auto">
                  <div className="min-w-[980px] rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div
                      className="grid border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600"
                      style={{
                        gridTemplateColumns:
                          "64px repeat(7, minmax(0, 1fr))",
                      }}
                    >
                      <div className="border-r border-slate-200 px-2 py-2 text-[10px] uppercase tracking-wide text-slate-400">
                        Hora
                      </div>
                      {weekDays.map((day) => (
                        <div
                          key={day.dateLabel}
                          className={`border-r border-slate-200 px-2 py-2 last:border-r-0 ${
                            day.isToday ? "bg-sky-50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge tone="sky">{day.shortLabel}</Badge>
                            {day.isToday ? (
                              <Badge tone="emerald">Hoje</Badge>
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
                        gridTemplateColumns:
                          "64px repeat(7, minmax(0, 1fr))",
                      }}
                    >
                      <div className="relative border-r border-slate-200 bg-slate-50">
                        <div style={{ height: timelineHeight }}>
                          {hourSlots.map((hour, index) => (
                            <div
                              key={`time-${hour}`}
                              className="absolute left-0 right-0 border-t border-slate-200 text-[10px] text-slate-400"
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
                              day.isToday ? "bg-sky-50/50" : ""
                            }`}
                            style={{ height: timelineHeight }}
                          >
                            {hourSlots.map((hour, index) => (
                              <div
                                key={`line-${dateKey}-${hour}`}
                                className="absolute left-0 right-0 border-t border-slate-100"
                                style={{ top: index * hourRowHeight }}
                              />
                            ))}

                            {layout.map((item) => {
                              const company = companyById.get(
                                item.appointment.companyId,
                              );
                              const title = company?.name || "Apontamento";
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
                                    statusCardStyles[item.appointment.status]
                                  }`}
                                  style={{
                                    top,
                                    height,
                                    left: `calc(${
                                      (item.lane / item.lanes) * 100
                                    }% + 2px)`,
                                    width: `calc(${
                                      100 / item.lanes
                                    }% - 4px)`,
                                  }}
                                  title={`${title} • ${formatTime(
                                    item.start,
                                  )} - ${formatTime(item.end)}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="truncate font-semibold">
                                      {title}
                                    </span>
                                    {!isTiny && item.isActual ? (
                                      <span className="rounded bg-emerald-100 px-1 text-[9px] font-semibold text-emerald-700">
                                        Real
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-0.5 text-[9px] font-semibold text-slate-600">
                                    {formatTime(item.start)} -{" "}
                                    {formatTime(item.end)}
                                  </div>
                                  {!isCompact ? (
                                    <div className="mt-0.5 text-[9px] text-slate-500">
                                      {STATUS_LABELS[item.appointment.status]}
                                    </div>
                                  ) : null}
                                </Link>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setShowCompanies((prev) => !prev)}
                    className={`rounded-lg border px-2 py-1 transition ${
                      showCompanies
                        ? "border-sky-300 bg-sky-100 text-sky-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Empresas
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckIns((prev) => !prev)}
                    className={`rounded-lg border px-2 py-1 transition ${
                      showCheckIns
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Check-ins
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckOuts((prev) => !prev)}
                    className={`rounded-lg border px-2 py-1 transition ${
                      showCheckOuts
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Check-outs
                  </button>
                </div>

                <ScheduleMapView
                  appointments={appointments}
                  companies={companies}
                  showCompanies={showCompanies}
                  showCheckIns={showCheckIns}
                  showCheckOuts={showCheckOuts}
                  visible={viewMode === "map"}
                  loading={loading}
                  error={error}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>{filteredCompanies.length} empresas listadas</span>
                  <span>Fonte: Supabase</span>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 sm:w-auto">
                    <span className="uppercase text-[10px] text-slate-400">
                      Consultor
                    </span>
                    <select
                      value={selectedConsultantId ?? ""}
                      onChange={(event) => {
                        const next = event.target.value || null;
                        setSelectedConsultantId(next);
                      }}
                      disabled={!consultants.length}
                      className="min-w-[160px] bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none"
                    >
                      {consultants.length ? (
                        consultants.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))
                      ) : (
                        <option value="">Nenhum consultor</option>
                      )}
                    </select>
                  </label>
                  <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 sm:w-auto">
                    <span className="uppercase text-[10px] text-slate-400">
                      Busca
                    </span>
                    <input
                      type="search"
                      value={companySearch}
                      onChange={(event) => setCompanySearch(event.target.value)}
                      placeholder={
                        selectedConsultantId
                          ? "Buscar por empresa, documento ou carteira"
                          : "Selecione um consultor"
                      }
                      disabled={!selectedConsultantId}
                      className="min-w-[200px] bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                  <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 sm:w-auto">
                    <span className="uppercase text-[10px] text-slate-400">
                      Ordenar
                    </span>
                    <select
                      value={companySort}
                      onChange={(event) =>
                        setCompanySort(
                          event.target.value === "qtd-3m" ? "qtd-3m" : "vlr-3m",
                        )
                      }
                      className="min-w-[140px] bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="vlr-3m">Valor 3m</option>
                      <option value="qtd-3m">Qtd 3m</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => refresh()}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:w-auto"
                  >
                    Atualizar
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                    Selecione um consultor para ver as empresas.
                  </div>
                ) : loading ? (
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
                  sortedCompanies.map((company) => (
                    <Link
                      key={company.id}
                      href={`/cronograma/empresa/${company.id}`}
                      className="grid min-w-0 items-center gap-4 px-5 py-3 text-sm text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      style={{
                        gridTemplateColumns: companyGridTemplateColumns,
                      }}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">
                          {company.name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {company.document ?? "Documento nao informado"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <Badge tone="sky" className="max-w-[120px] truncate">
                          {company.state ?? "Sem estado"}
                        </Badge>
                      </div>
                      <div className="min-w-0">
                        <Badge
                          tone="emerald"
                          className="max-w-[140px] truncate"
                        >
                          {company.csa ?? "Sem CSA"}
                        </Badge>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-slate-700">
                          {company.carteiraDef ?? "Sem carteira"}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {company.carteiraDef2 ?? "Sem carteira 2"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-slate-700">
                          {company.clientClass ?? "Sem classe"}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {company.classeCliente ?? "Sem classe cliente"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-slate-700">
                          {company.referencia ?? "Sem referencia"}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {company.validacao ?? "Sem validacao"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-slate-700">
                          {formatQuantity(company.qtdUltimos3Meses)}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          Ultimos 3 meses
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-slate-700">
                          {formatCurrency(company.vlrUltimos3Meses)}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          Ultimos 3 meses
                        </div>
                      </div>
                    </Link>
                  ))
                )}

                {selectedConsultant &&
                  !loading &&
                  filteredCompanies.length === 0 && (
                    <div className="px-5 py-4 text-sm text-slate-500">
                      Nenhuma empresa encontrada com esses filtros.
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
