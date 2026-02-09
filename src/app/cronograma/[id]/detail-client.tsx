"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { useSchedule } from "@/contexts/ScheduleContext";
import {
  formatDateLabel,
  formatDuration,
  formatTime,
  getOpportunityLabel,
  STATUS_LABELS,
  STATUS_TONES,
} from "@/lib/schedule";
import { ScheduleMapView } from "../components/ScheduleMapView";

export default function AppointmentDetailClient() {
  const params = useParams();
  const appointmentId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { appointments, companies, loading } = useSchedule();

  const appointment = useMemo(
    () => appointments.find((item) => item.id === appointmentId),
    [appointments, appointmentId],
  );
  const company = useMemo(
    () => companies.find((item) => item.id === appointment?.companyId),
    [companies, appointment?.companyId],
  );

  if (loading && !appointment) {
    return (
      <PageShell title="Apontamento" subtitle="Carregando detalhes...">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          Carregando apontamento...
        </div>
      </PageShell>
    );
  }

  if (!appointment) {
    return (
      <PageShell title="Apontamento" subtitle="Nao encontrado">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          Apontamento nao encontrado.
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

  const statusLabel = STATUS_LABELS[appointment.status];
  const statusTone = STATUS_TONES[appointment.status];
  const dateLabel = formatDateLabel(new Date(appointment.startAt));
  const timeLabel = `${formatTime(appointment.startAt)} - ${formatTime(
    appointment.endAt,
  )}`;
  const durationLabel = formatDuration(appointment.startAt, appointment.endAt);

  return (
    <PageShell title="Detalhe do apontamento" subtitle={company?.name ?? ""}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link
          href="/cronograma"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Voltar ao cronograma
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {company?.name ?? "Empresa nao informada"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {dateLabel} · {timeLabel} · {durationLabel}
                </div>
              </div>
              <Badge tone={statusTone}>{statusLabel}</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <div>
                <span className="font-semibold text-slate-600">Endereco: </span>
                {appointment.addressSnapshot?.trim() ||
                  company?.state ||
                  "Nao informado"}
              </div>
              <div>
                <span className="font-semibold text-slate-600">Consultor: </span>
                {appointment.consultantName?.trim() || "Nao informado"}
              </div>
            </div>
            {appointment.notes?.trim() ? (
              <div className="mt-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-600">Notas: </span>
                {appointment.notes}
              </div>
            ) : null}
          </div>

          {appointment.oportunidades?.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Oportunidades percebidas
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {appointment.oportunidades.map((item) => (
                  <Badge key={item} tone="sky">
                    {getOpportunityLabel(item)}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {appointment.absenceReason ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <div className="font-semibold">Ausencia registrada</div>
              <div className="mt-1">
                <span className="font-semibold">Motivo: </span>
                {appointment.absenceReason}
              </div>
              {appointment.absenceNote ? (
                <div className="mt-1">
                  <span className="font-semibold">Obs: </span>
                  {appointment.absenceNote}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Linha do tempo</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div>
                <div className="font-semibold text-slate-700">Agendado</div>
                <div>
                  {dateLabel} · {formatTime(appointment.startAt)}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700">Check-in</div>
                <div>
                  {appointment.checkInAt
                    ? `${formatDateLabel(new Date(appointment.checkInAt))} · ${formatTime(appointment.checkInAt)}`
                    : "Pendente"}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700">Check-out</div>
                <div>
                  {appointment.checkOutAt
                    ? `${formatDateLabel(new Date(appointment.checkOutAt))} · ${formatTime(appointment.checkOutAt)}`
                    : appointment.absenceReason
                      ? "Ausente"
                      : "Pendente"}
                </div>
              </div>
            </div>
          </div>

          <div>
            <ScheduleMapView
              appointments={[appointment]}
              companies={company ? [company] : []}
              showCompanies
              showCheckIns
              showCheckOuts
              visible
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
