"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { useSchedule } from "@/contexts/ScheduleContext";
import { createTranslator, getMessages, type Locale } from "@/lib/i18n";
import {
  APPOINTMENT_SELECT,
  formatDateLabel,
  formatDuration,
  formatTime,
  mapAppointment,
  STATUS_TONES,
  type Appointment,
} from "@/lib/schedule";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { ScheduleMapView } from "../components/ScheduleMapView";

type AppointmentMediaKind = "checkin" | "checkout" | "absence" | "other";

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
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AppointmentMediaRow = {
  id: string;
  bucket: string;
  path: string;
  kind: string | null;
  mime_type: string | null;
  bytes: number | null;
  created_at: string | null;
};

type AppointmentMediaItem = {
  id: string;
  bucket: string;
  path: string;
  kind: AppointmentMediaKind;
  mimeType: string | null;
  bytes: number | null;
  createdAt: string | null;
  signedUrl: string | null;
};

const MEDIA_KIND_TONES: Record<
  AppointmentMediaKind,
  "emerald" | "rose" | "amber" | "slate"
> = {
  checkin: "emerald",
  checkout: "rose",
  absence: "amber",
  other: "slate",
};

const normalizeMediaKind = (
  value: string | null | undefined,
): AppointmentMediaKind => {
  if (value === "checkin") return "checkin";
  if (value === "checkout") return "checkout";
  if (value === "absence") return "absence";
  return "other";
};

const formatMediaTimestamp = (value: string | null, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${formatDateLabel(date)} · ${formatTime(date)}`;
};

const getMediaFileName = (path: string, fallback: string) => {
  const lastSegment = path.split("/").filter(Boolean).pop();
  if (!lastSegment) return fallback;
  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
};

type AppointmentDetailClientProps = {
  locale: Locale;
};

export default function AppointmentDetailClient({
  locale,
}: AppointmentDetailClientProps) {
  const params = useParams();
  const appointmentId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { companies } = useSchedule();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const t = useMemo(() => createTranslator(getMessages(locale)), [locale]);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [appointmentError, setAppointmentError] = useState<string | null>(null);
  const appointmentRequestIdRef = useRef(0);
  const [media, setMedia] = useState<AppointmentMediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const mediaRequestIdRef = useRef(0);
  const [showCompanies, setShowCompanies] = useState(true);
  const [showCheckIns, setShowCheckIns] = useState(true);
  const [showCheckOuts, setShowCheckOuts] = useState(true);

  const company = useMemo(
    () => companies.find((item) => item.id === appointment?.companyId),
    [companies, appointment?.companyId],
  );

  const loadAppointment = useCallback(
    async (id: string) => {
      const requestId = ++appointmentRequestIdRef.current;
      setAppointmentLoading(true);
      setAppointmentError(null);

      try {
        const { data, error } = await supabase
          .from("apontamentos")
          .select(APPOINTMENT_SELECT)
          .eq("id", id)
          .maybeSingle();

        if (requestId !== appointmentRequestIdRef.current) return;

        if (error) {
          console.error(error);
          setAppointment(null);
          setAppointmentLoading(false);
          setAppointmentError(t("appointment.loadError"));
          return;
        }

        if (!data) {
          setAppointment(null);
          setAppointmentLoading(false);
          return;
        }

        setAppointment(mapAppointment(data as AppointmentRow));
        setAppointmentLoading(false);
      } catch (error) {
        console.error(error);
        if (requestId !== appointmentRequestIdRef.current) return;
        setAppointment(null);
        setAppointmentLoading(false);
        setAppointmentError(t("appointment.loadError"));
      }
    },
    [supabase, t],
  );

  useEffect(() => {
    if (!appointmentId) return;
    setAppointment(null);
    void loadAppointment(appointmentId);
  }, [appointmentId, loadAppointment]);

  const loadMedia = useCallback(
    async (id: string) => {
      const requestId = ++mediaRequestIdRef.current;
      setMediaLoading(true);
      setMediaError(null);

      try {
        const { data, error } = await supabase
          .from("apontamento_media")
          .select("id, bucket, path, kind, mime_type, bytes, created_at")
          .eq("apontamento_id", id)
          .order("created_at", { ascending: true });

        if (requestId !== mediaRequestIdRef.current) return;

        if (error) {
          console.error(error);
          setMedia([]);
          setMediaLoading(false);
          setMediaError(t("appointment.mediaLoadError"));
          return;
        }

        const rows = (data ?? []) as AppointmentMediaRow[];
        const items = await Promise.all(
          rows.map(async (row) => {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from(row.bucket)
                .createSignedUrl(row.path, 60);

            if (signedError) {
              console.warn("Falha ao gerar URL assinada:", signedError.message);
            }

            return {
              id: row.id,
              bucket: row.bucket,
              path: row.path,
              kind: normalizeMediaKind(row.kind),
              mimeType: row.mime_type ?? null,
              bytes: row.bytes ?? null,
              createdAt: row.created_at ?? null,
              signedUrl: signedData?.signedUrl ?? null,
            } satisfies AppointmentMediaItem;
          }),
        );

        if (requestId !== mediaRequestIdRef.current) return;

        setMedia(items);
        setMediaLoading(false);
      } catch (error) {
        console.error(error);
        if (requestId !== mediaRequestIdRef.current) return;
        setMedia([]);
        setMediaLoading(false);
        setMediaError(t("appointment.mediaLoadError"));
      }
    },
    [supabase, t],
  );

  useEffect(() => {
    if (!appointmentId) return;
    setMedia([]);
    void loadMedia(appointmentId);
  }, [appointmentId, loadMedia]);

  const mediaGroups = useMemo(() => {
    const groups = new Map<AppointmentMediaKind, AppointmentMediaItem[]>();
    media.forEach((item) => {
      const list = groups.get(item.kind) ?? [];
      list.push(item);
      groups.set(item.kind, list);
    });
    return groups;
  }, [media]);

  const orderedMediaKinds = useMemo(() => {
    const ordered: AppointmentMediaKind[] = ["checkin", "checkout", "absence"];
    for (const kind of mediaGroups.keys()) {
      if (!ordered.includes(kind)) {
        ordered.push(kind);
      }
    }
    if (mediaGroups.has("other") && !ordered.includes("other")) {
      ordered.push("other");
    }
    return ordered.filter((kind) => mediaGroups.has(kind));
  }, [mediaGroups]);

  const mediaKindLabels = useMemo(
    () => ({
      checkin: t("appointment.mediaKind.checkin"),
      checkout: t("appointment.mediaKind.checkout"),
      absence: t("appointment.mediaKind.absence"),
      other: t("appointment.mediaKind.other"),
    }),
    [t],
  );

  const handleRefreshMedia = useCallback(() => {
    if (!appointmentId) return;
    void loadMedia(appointmentId);
  }, [appointmentId, loadMedia]);

  if (appointmentLoading && !appointment) {
    return (
      <PageShell
        title={t("appointment.title")}
        subtitle={t("appointment.loadingDetails")}
      >
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          {t("appointment.loading")}
        </div>
      </PageShell>
    );
  }

  if (!appointment) {
    return (
      <PageShell
        title={t("appointment.title")}
        subtitle={
          appointmentError
            ? t("appointment.errorLoading")
            : t("appointment.notFoundShort")
        }
      >
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          {appointmentError ?? t("appointment.notFound")}
        </div>
        <Link
          href="/cronograma"
          className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          {t("appointment.backToSchedule")}
        </Link>
      </PageShell>
    );
  }

  const statusLabel = t(`schedule.status.${appointment.status}`);
  const statusTone = STATUS_TONES[appointment.status];
  const dateLabel = formatDateLabel(new Date(appointment.startAt));
  const timeLabel = `${formatTime(appointment.startAt)} - ${formatTime(
    appointment.endAt,
  )}`;
  const durationLabel = formatDuration(appointment.startAt, appointment.endAt);

  return (
    <PageShell
      title={t("appointment.detailsTitle")}
      subtitle={company?.name ?? ""}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 sm:text-xs">
        <Link
          href="/cronograma"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          {t("appointment.backToSchedule")}
        </Link>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {company?.name ?? t("appointment.companyMissing")}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {dateLabel} · {timeLabel} · {durationLabel}
                </div>
              </div>
              <Badge tone={statusTone}>{statusLabel}</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <div>
                <span className="font-semibold text-slate-600">
                  {t("appointment.address")}:{" "}
                </span>
                {appointment.addressSnapshot?.trim() ||
                  company?.state ||
                  t("appointment.notInformed")}
              </div>
              <div>
                <span className="font-semibold text-slate-600">
                  {t("appointment.consultant")}:{" "}
                </span>
                {appointment.consultantName?.trim() ||
                  t("appointment.notInformed")}
              </div>
            </div>
          </div>

          {appointment.notes?.trim() ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {t("appointment.notes")}
              </h2>
              <div className="mt-2 text-sm text-slate-600">
                {appointment.notes}
              </div>
            </div>
          ) : null}

          {appointment.oportunidades?.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {t("appointment.opportunities")}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {appointment.oportunidades.map((item) => (
                  <Badge key={item} tone="sky">
                    {t(`schedule.opportunity.${item}`, undefined, item)}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {appointment.absenceReason ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:p-4">
              <div className="font-semibold">
                {t("appointment.absenceRegistered")}
              </div>
              <div className="mt-1">
                <span className="font-semibold">
                  {t("appointment.reason")}:{" "}
                </span>
                {appointment.absenceReason}
              </div>
              {appointment.absenceNote ? (
                <div className="mt-1">
                  <span className="font-semibold">
                    {t("appointment.notesShort")}:{" "}
                  </span>
                  {appointment.absenceNote}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                {t("appointment.mediaTitle")}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span>{t("appointment.mediaExpire")}</span>
                <button
                  type="button"
                  onClick={handleRefreshMedia}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {t("appointment.mediaRefresh")}
                </button>
              </div>
            </div>

            {mediaError ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {mediaError}
              </div>
            ) : null}

            {mediaLoading ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                {t("appointment.mediaLoading")}
              </div>
            ) : null}

            {!mediaLoading && !mediaError && media.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                {t("appointment.mediaEmpty")}
              </div>
            ) : null}

            <div className="mt-3 space-y-4">
              {orderedMediaKinds.map((kind) => {
                const items = mediaGroups.get(kind) ?? [];
                if (!items.length) return null;
                return (
                  <div key={kind} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <Badge tone={MEDIA_KIND_TONES[kind]}>
                        {mediaKindLabels[kind]}
                      </Badge>
                      <span>
                        {t("appointment.mediaCount", { count: items.length })}
                      </span>
                    </div>
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((item) => {
                        const fileName = getMediaFileName(
                          item.path,
                          t("appointment.attachment"),
                        );
                        return (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                        >
                          {item.signedUrl ? (
                            item.mimeType?.startsWith("image/") ? (
                              <a
                                href={item.signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                <img
                                  src={item.signedUrl}
                                  alt={`${mediaKindLabels[item.kind]} - ${fileName}`}
                                  className="h-48 w-full object-cover transition hover:scale-[1.01]"
                                  loading="lazy"
                                />
                              </a>
                            ) : (
                              <a
                                href={item.signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-slate-600 transition hover:bg-slate-100"
                              >
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  {t("appointment.attachment")}
                                </div>
                                <div className="text-sm font-semibold text-slate-800 line-clamp-2">
                                  {fileName}
                                </div>
                                <div className="text-[11px] font-semibold text-slate-500">
                                  {t("appointment.openAttachment")}
                                </div>
                                {item.mimeType ? (
                                  <div className="text-[10px] text-slate-500">
                                    {item.mimeType}
                                  </div>
                                ) : null}
                              </a>
                            )
                          ) : (
                            <div className="flex h-48 items-center justify-center px-4 text-xs text-slate-400">
                              {t("appointment.attachmentUnavailable")}
                            </div>
                          )}
                          <div className="px-2 py-1 text-[10px] text-slate-500">
                            <div className="truncate text-[11px] font-semibold text-slate-600">
                              {fileName}
                            </div>
                            <div className="flex items-center justify-between">
                              <span>
                                {formatMediaTimestamp(
                                  item.createdAt,
                                  t("appointment.timestampUnknown"),
                                )}
                              </span>
                              {item.mimeType ? (
                                <span>{item.mimeType}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {t("schedule.timeline.title")}
            </h2>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div>
                <div className="font-semibold text-slate-700">
                  {t("schedule.timeline.scheduled")}
                </div>
                <div>
                  {dateLabel} · {formatTime(appointment.startAt)}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700">
                  {t("schedule.timeline.checkIn")}
                </div>
                <div>
                  {appointment.checkInAt
                    ? `${formatDateLabel(new Date(appointment.checkInAt))} · ${formatTime(appointment.checkInAt)}`
                    : t("schedule.timeline.pending")}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700">
                  {t("schedule.timeline.checkOut")}
                </div>
                <div>
                  {appointment.checkOutAt
                    ? `${formatDateLabel(new Date(appointment.checkOutAt))} · ${formatTime(appointment.checkOutAt)}`
                    : appointment.absenceReason
                      ? t("schedule.timeline.absent")
                      : t("schedule.timeline.pending")}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setShowCompanies((prev) => !prev)}
                className={`rounded-lg border px-2 py-1 transition ${
                  showCompanies
                    ? "border-sky-300 bg-sky-100 text-sky-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("schedule.map.companies")}
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
                {t("schedule.map.checkIns")}
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
                {t("schedule.map.checkOuts")}
              </button>
            </div>
            <ScheduleMapView
              appointments={[appointment]}
              companies={company ? [company] : []}
              showCompanies={showCompanies}
              showCheckIns={showCheckIns}
              showCheckOuts={showCheckOuts}
              visible
              t={t}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
