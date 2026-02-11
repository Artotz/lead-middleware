"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { useSchedule } from "@/contexts/ScheduleContext";
import {
  APPOINTMENT_SELECT,
  formatDateLabel,
  formatDuration,
  formatTime,
  isAppointmentAbsent,
  isAppointmentDone,
  isAppointmentInProgress,
  mapAppointment,
  STATUS_LABELS,
  STATUS_TONES,
  type Appointment,
} from "@/lib/schedule";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { ScheduleMapView } from "../../components/ScheduleMapView";

type AppointmentRow = {
  id: string;
  company_id: string;
  consultant_id: string | null;
  consultant_name: string | null;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "in_progress" | "done" | "absent" | null;
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
  created_at: string | null;
  updated_at: string | null;
};

const formatAppointmentHeadline = (appointment: Appointment) => {
  const date = new Date(appointment.startAt);
  const dateLabel = formatDateLabel(date);
  const timeLabel = `${formatTime(appointment.startAt)} - ${formatTime(
    appointment.endAt,
  )}`;
  const duration = formatDuration(appointment.startAt, appointment.endAt);
  return `${dateLabel} · ${timeLabel} · ${duration}`;
};

const formatAppointmentShort = (appointment: Appointment) => {
  const date = new Date(appointment.startAt);
  return `${formatDateLabel(date)} · ${formatTime(appointment.startAt)}`;
};

export default function CompanyDetailClient() {
  const params = useParams();
  const companyId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { companies, loading: scheduleLoading } = useSchedule();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const company = useMemo(
    () => companies.find((item) => item.id === companyId),
    [companies, companyId],
  );

  const loadAppointments = useCallback(
    async (id: string) => {
      const requestId = ++requestIdRef.current;
      setAppointmentsLoading(true);
      setAppointmentsError(null);

      try {
        const { data, error } = await supabase
          .from("apontamentos")
          .select(APPOINTMENT_SELECT)
          .eq("company_id", id)
          .order("starts_at", { ascending: false });

        if (requestId !== requestIdRef.current) return;

        if (error) {
          console.error(error);
          setAppointments([]);
          setAppointmentsLoading(false);
          setAppointmentsError("Nao foi possivel carregar os apontamentos.");
          return;
        }

        const rows = (data ?? []) as AppointmentRow[];
        setAppointments(rows.map(mapAppointment));
        setAppointmentsLoading(false);
      } catch (error) {
        console.error(error);
        if (requestId !== requestIdRef.current) return;
        setAppointments([]);
        setAppointmentsLoading(false);
        setAppointmentsError("Nao foi possivel carregar os apontamentos.");
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!companyId) return;
    setAppointments([]);
    void loadAppointments(companyId);
  }, [companyId, loadAppointments]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const done = appointments.filter(isAppointmentDone).length;
    const absent = appointments.filter(isAppointmentAbsent).length;
    const inProgress = appointments.filter(
      (item) => !isAppointmentDone(item) && !isAppointmentAbsent(item) && isAppointmentInProgress(item),
    ).length;
    const pending = total - done - absent - inProgress;
    return { total, done, inProgress, absent, pending };
  }, [appointments]);

  const sortedAsc = useMemo(
    () => [...appointments].sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [appointments],
  );
  const now = useMemo(() => new Date(), []);
  const nextAppointment = useMemo(
    () => sortedAsc.find((item) => new Date(item.startAt) >= now) ?? null,
    [sortedAsc, now],
  );
  const lastAppointment = useMemo(() => {
    for (let index = sortedAsc.length - 1; index >= 0; index -= 1) {
      const item = sortedAsc[index];
      if (new Date(item.startAt) < now) return item;
    }
    return null;
  }, [sortedAsc, now]);

  if (scheduleLoading && !company) {
    return (
      <PageShell title="Empresa" subtitle="Carregando dados...">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          Carregando empresa...
        </div>
      </PageShell>
    );
  }

  if (!company || !companyId) {
    return (
      <PageShell title="Empresa" subtitle="Nao encontrada">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          Empresa nao encontrada.
        </div>
        <Link
          href="/cronograma"
          className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Voltar ao cronograma
        </Link>
      </PageShell>
    );
  }

  const infoItems = [
    { label: "Documento", value: company.document ?? "Documento nao informado" },
    { label: "Estado", value: company.state ?? "Sem estado" },
    { label: "CSA", value: company.csa ?? "Sem CSA" },
    { label: "Carteira", value: company.carteiraDef ?? "Sem carteira" },
    { label: "Carteira 2", value: company.carteiraDef2 ?? "Sem carteira 2" },
    { label: "Classe", value: company.clientClass ?? "Sem classe" },
    {
      label: "Classe cliente",
      value: company.classeCliente ?? "Sem classe cliente",
    },
    { label: "Validacao", value: company.validacao ?? "Sem validacao" },
    { label: "Referencia", value: company.referencia ?? "Sem referencia" },
    {
      label: "Coordenadas",
      value:
        company.lat != null && company.lng != null
          ? `${company.lat.toFixed(5)}, ${company.lng.toFixed(5)}`
          : "Nao informado",
    },
  ];

  return (
    <PageShell title="Empresa" subtitle={company.name}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 sm:text-xs">
        <Link
          href="/cronograma"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Voltar ao cronograma
        </Link>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {company.name}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {company.document ?? "Documento nao informado"}
                </div>
              </div>
              <Badge tone="sky">{stats.total} apontamentos</Badge>
            </div>
            <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              {infoItems.map((item) => (
                <div key={item.label} className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </div>
                  <div className="truncate text-sm text-slate-700">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Apontamentos
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span>{appointments.length} registros</span>
                <button
                  type="button"
                  onClick={() => loadAppointments(companyId)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Atualizar
                </button>
              </div>
            </div>

            {appointmentsError ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {appointmentsError}
              </div>
            ) : null}

            {appointmentsLoading ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                Carregando apontamentos...
              </div>
            ) : null}

            {!appointmentsLoading && !appointmentsError && appointments.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                Nenhum apontamento registrado para esta empresa.
              </div>
            ) : null}

            <div className="mt-3 space-y-3">
              {appointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/cronograma/${appointment.id}`}
                  className="block rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 line-clamp-2">
                        {appointment.notes?.trim() || "Apontamento"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatAppointmentHeadline(appointment)}
                      </div>
                    </div>
                    <Badge tone={STATUS_TONES[appointment.status]}>
                      {STATUS_LABELS[appointment.status]}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                    <div>
                      Consultor: {appointment.consultantName?.trim() || "Nao informado"}
                    </div>
                    <div>
                      Endereco: {appointment.addressSnapshot?.trim() || company.state || "Nao informado"}
                    </div>
                  </div>
                  {appointment.absenceReason ? (
                    <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                      Ausencia: {appointment.absenceReason}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Resumo dos apontamentos
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="slate">{stats.total} total</Badge>
              <Badge tone="emerald">{stats.done} concluidos</Badge>
              <Badge tone="sky">{stats.inProgress} em execucao</Badge>
              <Badge tone="amber">{stats.pending} pendentes</Badge>
              <Badge tone="rose">{stats.absent} ausentes</Badge>
            </div>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div>
                <div className="font-semibold text-slate-700">
                  Ultimo apontamento
                </div>
                <div>
                  {lastAppointment
                    ? formatAppointmentShort(lastAppointment)
                    : "Sem registros"}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700">
                  Proximo apontamento
                </div>
                <div>
                  {nextAppointment
                    ? formatAppointmentShort(nextAppointment)
                    : "Sem agenda futura"}
                </div>
              </div>
            </div>
          </div>

          <div>
            <ScheduleMapView
              appointments={appointments}
              companies={[company]}
              showCompanies
              showCheckIns
              showCheckOuts
              visible
              loading={appointmentsLoading}
              error={appointmentsError}
              emptyMessage="Sem coordenadas deste cliente."
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
