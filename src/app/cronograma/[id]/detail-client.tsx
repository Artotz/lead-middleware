"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { useToast } from "@/components/ToastProvider";
import { useSchedule } from "@/contexts/ScheduleContext";
import {
  formatDateLabel,
  formatDuration,
  formatTime,
  getOpportunityLabel,
  isAppointmentAbsent,
  isAppointmentDone,
  isAppointmentInProgress,
  isAppointmentPending,
  OPPORTUNITY_OPTIONS,
  STATUS_LABELS,
  STATUS_TONES,
  toDateKey,
} from "@/lib/schedule";
import { OpportunitiesModal } from "../components/OpportunitiesModal";
import { ScheduleMapView } from "../components/ScheduleMapView";

const getPosition = () => {
  if (!navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise<{
    lat: number;
    lng: number;
    accuracy: number | null;
  } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
};

export default function AppointmentDetailClient() {
  const params = useParams();
  const appointmentId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const {
    appointments,
    companies,
    loading,
    checkIn,
    checkOut,
    justifyAbsence,
  } = useSchedule();
  const toast = useToast();

  const appointment = useMemo(
    () => appointments.find((item) => item.id === appointmentId),
    [appointments, appointmentId],
  );
  const company = useMemo(
    () => companies.find((item) => item.id === appointment?.companyId),
    [companies, appointment?.companyId],
  );

  const [actionLoading, setActionLoading] = useState(false);
  const [absenceReason, setAbsenceReason] = useState("");
  const [absenceNote, setAbsenceNote] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const dayAppointments = useMemo(() => {
    if (!appointment) return [];
    const dayKey = toDateKey(new Date(appointment.startAt));
    return appointments.filter(
      (item) => toDateKey(new Date(item.startAt)) === dayKey,
    );
  }, [appointments, appointment]);

  const appointmentIndex = useMemo(() => {
    if (!appointment) return -1;
    return dayAppointments.findIndex((item) => item.id === appointment.id);
  }, [appointment, dayAppointments]);

  const firstActiveIndex = useMemo(() => {
    return dayAppointments.findIndex(
      (item) => !isAppointmentDone(item) && !isAppointmentAbsent(item),
    );
  }, [dayAppointments]);

  const locked =
    appointment &&
    appointmentIndex >= 0 &&
    firstActiveIndex >= 0 &&
    appointmentIndex > firstActiveIndex &&
    isAppointmentPending(appointment);

  const canCheckIn =
    appointment && !locked && isAppointmentPending(appointment);
  const canCheckOut =
    appointment && !locked && isAppointmentInProgress(appointment);
  const canJustifyAbsence =
    appointment && !locked && isAppointmentPending(appointment);

  const handleCheckIn = async () => {
    if (!appointment) return;
    setActionLoading(true);
    try {
      const location = await getPosition();
      await checkIn(appointment.id, {
        at: new Date(),
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        accuracy: location?.accuracy ?? null,
      });
      toast.push({
        variant: "success",
        message: "Check-in registrado com sucesso.",
      });
    } catch (error) {
      console.error(error);
      toast.push({
        variant: "error",
        message: "Nao foi possivel registrar o check-in.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async (selected: string[]) => {
    if (!appointment) return;
    setCheckoutLoading(true);
    try {
      const location = await getPosition();
      await checkOut(appointment.id, {
        at: new Date(),
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        accuracy: location?.accuracy ?? null,
        oportunidades: selected,
      });
      toast.push({
        variant: "success",
        message: "Check-out registrado com sucesso.",
      });
      setCheckoutOpen(false);
    } catch (error) {
      console.error(error);
      toast.push({
        variant: "error",
        message: "Nao foi possivel registrar o check-out.",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAbsence = async () => {
    if (!appointment) return;
    if (!absenceReason.trim()) return;
    setActionLoading(true);
    try {
      await justifyAbsence(appointment.id, absenceReason.trim(), absenceNote);
      toast.push({
        variant: "success",
        message: "Ausencia registrada.",
      });
      setAbsenceReason("");
      setAbsenceNote("");
    } catch (error) {
      console.error(error);
      toast.push({
        variant: "error",
        message: "Nao foi possivel justificar a ausencia.",
      });
    } finally {
      setActionLoading(false);
    }
  };

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
        <Link
          href="/cronograma/dia"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Ver dia
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

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Acoes</h2>
              {locked ? (
                <Badge tone="rose">Bloqueado</Badge>
              ) : appointment.status === "done" ? (
                <Badge tone="emerald">Concluido</Badge>
              ) : appointment.status === "absent" ? (
                <Badge tone="rose">Ausente</Badge>
              ) : appointment.status === "in_progress" ? (
                <Badge tone="sky">Em execucao</Badge>
              ) : (
                <Badge tone="amber">Agendado</Badge>
              )}
            </div>
            {locked ? (
              <div className="mt-2 text-xs text-rose-600">
                Acoes bloqueadas ate concluir o apontamento anterior do dia.
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={!canCheckIn || actionLoading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading && canCheckIn
                  ? "Registrando..."
                  : "Check-in"}
              </button>
              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                disabled={!canCheckOut || actionLoading}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Check-out
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Justificar ausencia
              </div>
              <div className="mt-2 grid gap-2">
                <input
                  value={absenceReason}
                  onChange={(event) => setAbsenceReason(event.target.value)}
                  placeholder="Motivo"
                  disabled={!canJustifyAbsence || actionLoading}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:opacity-60"
                />
                <textarea
                  value={absenceNote}
                  onChange={(event) => setAbsenceNote(event.target.value)}
                  placeholder="Observacao (opcional)"
                  rows={3}
                  disabled={!canJustifyAbsence || actionLoading}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleAbsence}
                  disabled={!canJustifyAbsence || actionLoading || !absenceReason.trim()}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Registrar ausencia
                </button>
              </div>
            </div>
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

      <OpportunitiesModal
        open={checkoutOpen}
        options={OPPORTUNITY_OPTIONS}
        initialSelected={appointment.oportunidades ?? []}
        loading={checkoutLoading}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={handleCheckOut}
      />
    </PageShell>
  );
}

