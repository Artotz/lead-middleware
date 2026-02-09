"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

const parseDateParam = (value: string | null) => {
  if (!value) return null;
  const parts = value.split("-").map((part) => Number(part));
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

type DayAppointmentCardProps = {
  id: string;
  title: string;
  client: string;
  location: string;
  time: string;
  duration: string;
  status: keyof typeof STATUS_LABELS;
  locked: boolean;
};

function DayAppointmentCard({
  id,
  title,
  client,
  location,
  time,
  duration,
  status,
  locked,
}: DayAppointmentCardProps) {
  return (
    <Link
      href={`/cronograma/${id}`}
      className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-0.5 text-xs text-slate-500">{client}</div>
        </div>
        <div className="text-right text-[11px] text-slate-400">
          <div className="font-semibold text-slate-600">{time}</div>
          <div>{duration}</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
        {locked ? <Badge tone="rose">Bloqueado</Badge> : null}
      </div>
      <div className="mt-2 text-[11px] text-slate-600">{location}</div>
    </Link>
  );
}

export default function CronogramaDayClient() {
  const { appointments, companies, loading, error, setRange } = useSchedule();
  const searchParams = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const initialDate = useMemo(
    () => parseDateParam(searchParams.get("date")) ?? today,
    [searchParams, today],
  );

  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState(initialDate);

  const weeks = useMemo(() => getWeeksForMonth(selectedMonth), [selectedMonth]);

  useEffect(() => {
    if (!weeks.length) return;
    const dayKey = toDateKey(selectedDay);
    const index = weeks.findIndex(
      (week) => dayKey >= toDateKey(week.startAt) && dayKey <= toDateKey(week.endAt),
    );
    setSelectedWeekIndex(index >= 0 ? index : 0);
  }, [weeks, selectedDay]);

  const selectedWeek = weeks[selectedWeekIndex] ?? weeks[0];

  useEffect(() => {
    if (!selectedWeek) return;
    setRange({ startAt: selectedWeek.startAt, endAt: selectedWeek.endAt });
    if (
      selectedDay < selectedWeek.startAt ||
      selectedDay > selectedWeek.endAt
    ) {
      setSelectedDay(selectedWeek.startAt);
    }
  }, [selectedWeek, selectedDay, setRange]);

  const weekDays = useMemo(() => {
    if (!selectedWeek) return [];
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(selectedWeek.startAt, index);
      return {
        date,
        label: formatWeekday(date, "short"),
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

  const selectedDayKey = toDateKey(selectedDay);
  const dayAppointments = appointmentsByDay.get(selectedDayKey) ?? [];
  const firstActiveIndex = dayAppointments.findIndex(
    (item) => !isAppointmentDone(item) && !isAppointmentAbsent(item),
  );

  return (
    <PageShell
      title="Cronograma do dia"
      subtitle="Lista do dia selecionado, ordenada por horario."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {formatWeekday(selectedDay, "long")} · {formatDateLabel(selectedDay)}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/cronograma"
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Ver semana
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => addMonths(prev, -1))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
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

          <div className="flex flex-wrap gap-1">
            {weekDays.map((day) => {
              const isActive = isSameDay(day.date, selectedDay);
              return (
                <button
                  key={toDateKey(day.date)}
                  type="button"
                  onClick={() => setSelectedDay(day.date)}
                  className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                    isActive
                      ? "border-sky-300 bg-sky-100 text-sky-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  } ${day.isToday ? "ring-1 ring-emerald-200" : ""}`}
                >
                  <span>{day.label}</span>
                  <span className="ml-1 text-[10px] text-slate-400">
                    {day.dateLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Carregando agendamentos...
            </div>
          ) : dayAppointments.length ? (
            dayAppointments.map((item, index) => {
              const company = companyById.get(item.companyId);
              const title = item.notes?.trim() || company?.name || "Apontamento";
              const client = company?.name || "Empresa nao informada";
              const location =
                item.addressSnapshot?.trim() ||
                company?.state ||
                "Endereco nao informado";
              const locked =
                firstActiveIndex >= 0 &&
                index > firstActiveIndex &&
                isAppointmentPending(item);
              return (
                <DayAppointmentCard
                  key={item.id}
                  id={item.id}
                  title={title}
                  client={client}
                  location={location}
                  time={formatTime(item.startAt)}
                  duration={formatDuration(item.startAt, item.endAt)}
                  status={item.status}
                  locked={locked}
                />
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
              Nenhum agendamento para esse dia.
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

