"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { useSchedule } from "@/contexts/ScheduleContext";
import {
  addDays,
  addMonths,
  formatDateLabel,
  formatDuration,
  formatMonthLabel,
  formatTime,
  formatWeekday,
  getWeeksForMonth,
  isAppointmentAbsent,
  isAppointmentDone,
  isAppointmentPending,
  isSameDay,
  STATUS_LABELS,
  STATUS_TONES,
  toDateKey,
} from "@/lib/schedule";
import { ScheduleMapView } from "./components/ScheduleMapView";

type ScheduleCardProps = {
  id: string;
  title: string;
  client: string;
  location: string;
  consultant: string;
  time: string;
  duration: string;
  status: keyof typeof STATUS_LABELS;
  order: number;
  locked: boolean;
};

function ScheduleCard({
  id,
  title,
  client,
  location,
  consultant,
  time,
  duration,
  status,
  order,
  locked,
}: ScheduleCardProps) {
  return (
    <Link
      href={`/cronograma/${id}`}
      className="block rounded-xl border border-slate-200 bg-white p-2 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
      aria-label={`Abrir detalhes do apontamento ${title}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-start gap-1.5">
          <Badge tone="slate">#{order}</Badge>
          {locked ? <Badge tone="rose">Bloqueado</Badge> : null}
        </div>
        <div className="text-right text-[10px] text-slate-400">
          <div className="font-semibold text-slate-600">{time}</div>
          <div>{duration}</div>
        </div>
      </div>

      <div className="mt-2 min-w-0">
        <div className="text-xs font-semibold text-slate-900 line-clamp-2">
          {title}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
          {client}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
      </div>

      <div className="mt-2 space-y-0.5 text-[11px] text-slate-600">
        <div>{location}</div>
        <div>Consultor: {consultant}</div>
      </div>
    </Link>
  );
}

export default function CronogramaClient() {
  const {
    appointments,
    companies,
    loading,
    error,
    setRange,
    refresh,
  } = useSchedule();
  const today = useMemo(() => new Date(), []);

  const [viewMode, setViewMode] = useState<"board" | "map">("board");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [showCompanies, setShowCompanies] = useState(true);
  const [showCheckIns, setShowCheckIns] = useState(true);
  const [showCheckOuts, setShowCheckOuts] = useState(true);

  const weeks = useMemo(() => getWeeksForMonth(selectedMonth), [selectedMonth]);

  useEffect(() => {
    if (!weeks.length) return;
    const todayKey = toDateKey(today);
    const index = weeks.findIndex(
      (week) => todayKey >= toDateKey(week.startAt) && todayKey <= toDateKey(week.endAt),
    );
    setSelectedWeekIndex(index >= 0 ? index : 0);
  }, [selectedMonth, weeks, today]);

  const selectedWeek = weeks[selectedWeekIndex] ?? weeks[0];

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

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, typeof appointments>();
    appointments.forEach((appointment) => {
      const dateKey = toDateKey(new Date(appointment.startAt));
      const bucket = map.get(dateKey) ?? [];
      bucket.push(appointment);
      map.set(dateKey, bucket);
    });
    return map;
  }, [appointments]);

  const companyById = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const totalAppointments = appointments.length;

  return (
    <PageShell
      title="Cronograma semanal"
      subtitle="Agendamentos reais carregados do Supabase por semana."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Semana selecionada</span>
              <span>{totalAppointments} agendamentos</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refresh()}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Atualizar
              </button>
              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-semibold">
                {[
                  { id: "board", label: "Quadro" },
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => addMonths(prev, -1))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                <span className="sr-only">Mes anterior</span>
                ?
              </button>
              <span className="text-xs font-semibold text-slate-700">
                {formatMonthLabel(selectedMonth)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => addMonths(prev, 1))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                <span className="sr-only">Proximo mes</span>
                ?
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
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
          <div className="mt-3 overflow-x-auto pb-1">
            <div className="flex min-w-full gap-1">
              {weekDays.map((day) => {
                const dateKey = toDateKey(day.date);
                const items = appointmentsByDay.get(dateKey) ?? [];
                const firstActiveIndex = items.findIndex(
                  (item) => !isAppointmentDone(item) && !isAppointmentAbsent(item),
                );
                return (
                  <div
                    key={dateKey}
                    className={`min-w-[170px] max-w-[240px] flex-1 rounded-xl border p-1 ${
                      day.isToday
                        ? "border-sky-200 bg-sky-100/80"
                        : "border-transparent"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between rounded-lg border px-2 py-1.5 shadow-sm ${
                        day.isToday
                          ? "border-sky-200 bg-sky-50 ring-2 ring-sky-200"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge tone="sky">{day.label}</Badge>
                          {day.isToday ? <Badge tone="emerald">Hoje</Badge> : null}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {day.dateLabel}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {items.length}
                      </span>
                    </div>

                    <div className="mt-2 space-y-2">
                      {items.length ? (
                        items.map((item, index) => {
                          const company = companyById.get(item.companyId);
                          const title =
                            item.notes?.trim() ||
                            company?.name ||
                            "Apontamento";
                          const client = company?.name || "Empresa nao informada";
                          const location =
                            item.addressSnapshot?.trim() ||
                            company?.state ||
                            "Endereco nao informado";
                          const consultant =
                            item.consultantName?.trim() || "Consultor nao informado";
                          const locked =
                            firstActiveIndex >= 0 &&
                            index > firstActiveIndex &&
                            isAppointmentPending(item);
                          return (
                            <ScheduleCard
                              key={item.id}
                              id={item.id}
                              title={title}
                              client={client}
                              location={location}
                              consultant={consultant}
                              time={formatTime(item.startAt)}
                              duration={formatDuration(item.startAt, item.endAt)}
                              status={item.status}
                              order={index + 1}
                              locked={locked}
                            />
                          );
                        })
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-2 py-4 text-center text-[11px] text-slate-400">
                          Sem agendamentos.
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          Dica: use o resumo de oportunidades no checkout para registrar novas
          vendas.
        </div>
        <Link
          href="/cronograma/dia"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Ver dia
        </Link>
      </div>
    </PageShell>
  );
}

