"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/contexts/AuthContext";
import { useSchedule } from "@/contexts/ScheduleContext";
import { createTranslator, getMessages, type Locale } from "@/lib/i18n";
import {
  APPOINTMENT_SELECT,
  COMPANY_SELECT,
  formatDateLabel,
  formatDuration,
  formatTime,
  mapCompany,
  mapAppointment,
  STATUS_TONES,
  type Appointment,
  type Company,
} from "@/lib/schedule";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { ScheduleMapView } from "../components/ScheduleMapView";

type AppointmentMediaKind =
  | "checkin"
  | "checkout"
  | "absence"
  | "registro"
  | "other";

type AppointmentRow = {
  id: string;
  company_id: string;
  consultant_id: string | null;
  consultant_name: string | null;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "in_progress" | "done" | "absent" | "atuado" | null;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_accuracy_m?: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_accuracy_m?: number | null;
  address_snapshot: string | null;
  absence_reason: string | null;
  absence_note: string | null;
  notes: string | null;
  oportunidades: string[] | null;
  created_by: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AppointmentMediaRow = {
  id: string;
  bucket: string;
  path: string;
  kind: string | null;
  registro_tipo?: string | null;
  mime_type: string | null;
  bytes: number | null;
  created_at: string | null;
};

type AppointmentMediaItem = {
  id: string;
  bucket: string;
  path: string;
  kind: AppointmentMediaKind;
  registroTipo: string | null;
  mimeType: string | null;
  bytes: number | null;
  createdAt: string | null;
  signedUrl: string | null;
};

type AppointmentAction = {
  id: string;
  resultado: "vendido" | "perdido";
  nfOuOs: string | null;
  valor: number | null;
  motivoPerda: string | null;
  observacao: string | null;
  createdBy: string | null;
  createdAt: string | null;
};

type CompanyContactRow = {
  name: string | null;
  contact: string | null;
  created_at: string | null;
};

const MEDIA_KIND_TONES: Record<
  AppointmentMediaKind,
  "emerald" | "rose" | "amber" | "violet" | "slate"
> = {
  checkin: "emerald",
  checkout: "rose",
  absence: "amber",
  registro: "violet",
  other: "slate",
};

const normalizeMediaKind = (
  value: string | null | undefined,
): AppointmentMediaKind => {
  if (value === "checkin") return "checkin";
  if (value === "checkout") return "checkout";
  if (value === "absence") return "absence";
  if (value === "registro") return "registro";
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
  const { user } = useAuth();
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
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionResult, setActionResult] = useState<"vendido" | "perdido" | "">(
    "",
  );
  const [actionNfOs, setActionNfOs] = useState("");
  const [actionValue, setActionValue] = useState("");
  const [actionLossReason, setActionLossReason] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const actionCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const [appointmentAction, setAppointmentAction] =
    useState<AppointmentAction | null>(null);
  const [appointmentActionLoading, setAppointmentActionLoading] =
    useState(false);
  const [appointmentActionError, setAppointmentActionError] = useState<
    string | null
  >(null);
  const appointmentActionRequestIdRef = useRef(0);
  const [fallbackCompany, setFallbackCompany] = useState<Company | null>(null);
  const fallbackCompanyRequestIdRef = useRef(0);
  const [latestCompanyContact, setLatestCompanyContact] =
    useState<CompanyContactRow | null>(null);
  const latestCompanyContactRequestIdRef = useRef(0);

  const contextCompany = useMemo(
    () => companies.find((item) => item.id === appointment?.companyId),
    [companies, appointment?.companyId],
  );
  const company =
    contextCompany ??
    (fallbackCompany?.id === appointment?.companyId ? fallbackCompany : null);

  const loadLatestCompanyContact = useCallback(
    async (companyId: string) => {
      const requestId = ++latestCompanyContactRequestIdRef.current;
      setLatestCompanyContact(null);

      try {
        const { data, error } = await supabase
          .from("company_contacts")
          .select("name, contact, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (requestId !== latestCompanyContactRequestIdRef.current) return;

        if (error) {
          console.error(error);
          setLatestCompanyContact(null);
          return;
        }

        setLatestCompanyContact((data as CompanyContactRow | null) ?? null);
      } catch (error) {
        console.error(error);
        if (requestId !== latestCompanyContactRequestIdRef.current) return;
        setLatestCompanyContact(null);
      }
    },
    [supabase],
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
          setLatestCompanyContact(null);
          setAppointmentLoading(false);
          setAppointmentError(t("appointment.loadError"));
          return;
        }

        if (!data) {
          setAppointment(null);
          setLatestCompanyContact(null);
          setAppointmentLoading(false);
          return;
        }

        const nextAppointment = mapAppointment(data as AppointmentRow);
        setAppointment(nextAppointment);
        if (nextAppointment.companyId) {
          void loadLatestCompanyContact(nextAppointment.companyId);
        } else {
          setLatestCompanyContact(null);
        }
        setAppointmentLoading(false);
      } catch (error) {
        console.error(error);
        if (requestId !== appointmentRequestIdRef.current) return;
        setAppointment(null);
        setLatestCompanyContact(null);
        setAppointmentLoading(false);
        setAppointmentError(t("appointment.loadError"));
      }
    },
    [loadLatestCompanyContact, supabase, t],
  );

  const loadFallbackCompany = useCallback(
    async (id: string) => {
      const requestId = ++fallbackCompanyRequestIdRef.current;
      try {
        const { data, error } = await supabase
          .from("companies")
          .select(COMPANY_SELECT)
          .eq("id", id)
          .maybeSingle();

        if (requestId !== fallbackCompanyRequestIdRef.current) return;

        if (error || !data) {
          if (error) console.error(error);
          setFallbackCompany(null);
          return;
        }

        setFallbackCompany(mapCompany(data));
      } catch (error) {
        console.error(error);
        if (requestId !== fallbackCompanyRequestIdRef.current) return;
        setFallbackCompany(null);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!appointmentId) return;
    setAppointment(null);
    void loadAppointment(appointmentId);
  }, [appointmentId, loadAppointment]);

  useEffect(() => {
    setFallbackCompany(null);
  }, [appointmentId]);

  useEffect(() => {
    if (!appointment?.companyId) return;
    if (contextCompany) return;
    void loadFallbackCompany(appointment.companyId);
  }, [appointment?.companyId, contextCompany, loadFallbackCompany]);

  const loadMedia = useCallback(
    async (id: string) => {
      const requestId = ++mediaRequestIdRef.current;
      setMediaLoading(true);
      setMediaError(null);

      try {
        const { data, error } = await supabase
          .from("apontamento_media")
          .select(
            "id, bucket, path, kind, registro_tipo, mime_type, bytes, created_at",
          )
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
              registroTipo: row.registro_tipo ?? null,
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

  const loadAppointmentAction = useCallback(
    async (id: string) => {
      const requestId = ++appointmentActionRequestIdRef.current;
      setAppointmentActionLoading(true);
      setAppointmentActionError(null);
      try {
        const { data, error } = await supabase
          .from("apontamento_acoes")
          .select(
            "id, resultado, nf_ou_os, valor, motivo_perda, observacao, created_by, created_at",
          )
          .eq("apontamento_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (requestId !== appointmentActionRequestIdRef.current) return;

        if (error) {
          console.error(error);
          setAppointmentAction(null);
          setAppointmentActionLoading(false);
          setAppointmentActionError(t("appointment.action.loadError"));
          return;
        }

        if (!data) {
          setAppointmentAction(null);
          setAppointmentActionLoading(false);
          return;
        }

        setAppointmentAction({
          id: data.id,
          resultado: data.resultado,
          nfOuOs: data.nf_ou_os ?? null,
          valor: data.valor ?? null,
          motivoPerda: data.motivo_perda ?? null,
          observacao: data.observacao ?? null,
          createdBy: data.created_by ?? null,
          createdAt: data.created_at ?? null,
        });
        setAppointmentActionLoading(false);
      } catch (err) {
        console.error(err);
        if (requestId !== appointmentActionRequestIdRef.current) return;
        setAppointmentAction(null);
        setAppointmentActionLoading(false);
        setAppointmentActionError(t("appointment.action.loadError"));
      }
    },
    [supabase, t],
  );

  useEffect(() => {
    if (!appointmentId) return;
    setMedia([]);
    void loadMedia(appointmentId);
  }, [appointmentId, loadMedia]);

  useEffect(() => {
    if (!appointmentId) return;
    setAppointmentAction(null);
    void loadAppointmentAction(appointmentId);
  }, [appointmentId, loadAppointmentAction]);

  const mediaGroups = useMemo(() => {
    const groups = new Map<AppointmentMediaKind, AppointmentMediaItem[]>();
    media.forEach((item) => {
      const list = groups.get(item.kind) ?? [];
      list.push(item);
      groups.set(item.kind, list);
    });
    return groups;
  }, [media]);

  const activityGroups = useMemo(() => {
    const groups = new Map<string, AppointmentMediaItem[]>();
    media.forEach((item) => {
      if (!item.registroTipo) return;
      const list = groups.get(item.registroTipo) ?? [];
      list.push(item);
      groups.set(item.registroTipo, list);
    });
    return groups;
  }, [media]);

  const orderedMediaKinds = useMemo(() => {
    const ordered: AppointmentMediaKind[] = [
      "checkin",
      "checkout",
      "absence",
      "registro",
    ];
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
      registro: t("appointment.mediaKind.registro"),
      other: t("appointment.mediaKind.other"),
    }),
    [t],
  );

  const activityLabels = useMemo(
    () => ({
      reconexao: t("appointment.activity.reconexao"),
      medicao_mr: t("appointment.activity.medicao_mr"),
      proposta_preventiva: t("appointment.activity.proposta_preventiva"),
      proposta_powergard: t("appointment.activity.proposta_powergard"),
      outro: t("appointment.activity.outro"),
    }),
    [t],
  );

  const orderedActivityKeys = useMemo(() => {
    const ordered = [
      "reconexao",
      "medicao_mr",
      "proposta_preventiva",
      "proposta_powergard",
      "outro",
    ];
    for (const key of activityGroups.keys()) {
      if (!ordered.includes(key)) {
        ordered.push(key);
      }
    }
    return ordered.filter((key) => activityGroups.has(key));
  }, [activityGroups]);

  const lossReasons = useMemo(
    () => [
      "preco_da_peca",
      "preco_da_mao_de_obra",
      "preco_do_deslocamento",
      "indisponibilidade_tecnica",
      "indisponibilidade_de_peca",
      "experiencia_anterior_negativa",
      "mao_de_obra_propria",
      "mao_de_obra_terceirizada",
      "postergou_o_servico",
      "pendencia_financeira",
      "falta_de_flexibilidade_comercial",
    ],
    [],
  );

  const handleRefreshMedia = useCallback(() => {
    if (!appointmentId) return;
    void loadMedia(appointmentId);
  }, [appointmentId, loadMedia]);

  const canRegisterAction =
    appointment?.status === "done" || appointment?.status === "atuado";

  useEffect(() => {
    if (!actionModalOpen) return;
    setActionResult("");
    setActionNfOs("");
    setActionValue("");
    setActionLossReason("");
    setActionNote("");
    setActionError(null);
    const id = window.setTimeout(() => actionCloseButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [actionModalOpen]);

  const handleConfirmAction = useCallback(async () => {
    if (!appointment || !appointmentId) return;
    if (!actionResult) {
      setActionError(t("appointment.action.resultRequired"));
      return;
    }
    if (actionResult === "vendido") {
      if (!actionNfOs.trim()) {
        setActionError(t("appointment.action.nfOsRequired"));
        return;
      }
      const value = Number(actionValue.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) {
        setActionError(t("appointment.action.valueRequired"));
        return;
      }
    }
    if (actionResult === "perdido" && !actionLossReason) {
      setActionError(t("appointment.action.lossReasonRequired"));
      return;
    }
    setActionLoading(true);
    setActionError(null);

    const normalizedValue =
      actionResult === "vendido"
        ? Number(actionValue.replace(",", "."))
        : null;

    try {
      const { error: insertError } = await supabase
        .from("apontamento_acoes")
        .insert({
          apontamento_id: appointmentId,
          resultado: actionResult,
          nf_ou_os: actionResult === "vendido" ? actionNfOs.trim() : null,
          valor: actionResult === "vendido" ? normalizedValue : null,
          motivo_perda: actionResult === "perdido" ? actionLossReason : null,
          observacao: actionNote.trim() || null,
          created_by: user?.email?.trim() || null,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          await loadAppointmentAction(appointmentId);
        } else {
          console.error(insertError);
          setActionError(t("appointment.action.loadError"));
        }
        setActionLoading(false);
        return;
      }

      const { data, error: updateError } = await supabase
        .from("apontamentos")
        .update({ status: "atuado" })
        .eq("id", appointmentId)
        .select(APPOINTMENT_SELECT)
        .maybeSingle();

      if (updateError) {
        console.error(updateError);
        setActionError(t("appointment.action.loadError"));
        setActionLoading(false);
        return;
      }

      if (data) {
        setAppointment(mapAppointment(data as AppointmentRow));
      }
      await loadAppointmentAction(appointmentId);
      setActionModalOpen(false);
      setActionLoading(false);
    } catch (err) {
      console.error(err);
      setActionError(t("appointment.action.loadError"));
      setActionLoading(false);
    }
  }, [
    actionNote,
    actionLossReason,
    actionNfOs,
    actionResult,
    appointment,
    appointmentId,
    loadAppointmentAction,
    supabase,
    t,
    user,
    actionValue,
  ]);

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
        <button
          type="button"
          onClick={() => setActionModalOpen(true)}
          disabled={!canRegisterAction || appointment.status === "atuado"}
          title={
            appointment.status === "atuado"
              ? t("appointment.action.registered")
              : !canRegisterAction
                ? t("appointment.action.doneRequired")
                : undefined
          }
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            appointment.status === "atuado"
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : !canRegisterAction
                ? "border-slate-200 bg-white text-slate-400"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
          }`}
        >
          {appointment.status === "atuado"
            ? t("appointment.action.registered")
            : t("appointment.action.button")}
        </button>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {company?.id ? (
                  <Link
                    href={`/cronograma/empresa/${company.id}`}
                    className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 underline decoration-sky-300 decoration-2 underline-offset-4 transition hover:text-sky-800"
                  >
                    <span>{company.name}</span>
                    <span className="text-xs font-semibold text-sky-700">
                      {t("appointment.openCompany")}
                    </span>
                  </Link>
                ) : (
                  <div className="text-lg font-semibold text-slate-900">
                    {company?.name ?? t("appointment.companyMissing")}
                  </div>
                )}
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
              <div>
                <span className="font-semibold text-slate-600">
                  {t("appointment.createdBy")}:{" "}
                </span>
                {appointment.createdBy?.trim() ||
                  t("appointment.notInformed")}
              </div>
              <div>
                <span className="font-semibold text-slate-600">
                  {t("appointment.latestContact")}:{" "}
                </span>
                {latestCompanyContact
                  ? [
                      latestCompanyContact.name?.trim(),
                      latestCompanyContact.contact?.trim(),
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("appointment.noCompanyContact")
                  : t("appointment.noCompanyContact")}
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

          {appointment.creationNotes?.trim() ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {t("appointment.creationNotes")}
              </h2>
              <div className="mt-2 text-sm text-slate-600">
                {appointment.creationNotes}
              </div>
            </div>
          ) : null}

          {activityGroups.size ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {t("appointment.activitiesTitle")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                {orderedActivityKeys.map((key) => {
                  const items = activityGroups.get(key) ?? [];
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1"
                    >
                      <span className="font-semibold text-slate-700">
                        {activityLabels[
                          key as keyof typeof activityLabels
                        ] ?? t(`appointment.activity.${key}`, undefined, key)}
                      </span>
                      <span className="text-slate-400">
                        {t("appointment.activityCount", {
                          count: items.length,
                        })}
                      </span>
                    </div>
                  );
                })}
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
            <h2 className="text-sm font-semibold text-slate-900">
              {t("appointment.action.sectionTitle")}
            </h2>
            {appointmentActionError ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {appointmentActionError}
              </div>
            ) : null}
            {appointmentActionLoading ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                {t("appointment.action.loading")}
              </div>
            ) : appointmentAction ? (
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <div>
                  <span className="font-semibold text-slate-600">
                    {t("appointment.action.resultLabel")}:{" "}
                  </span>
                  {appointmentAction.resultado === "vendido"
                    ? t("appointment.action.resultSold")
                    : t("appointment.action.resultLost")}
                </div>
                {appointmentAction.resultado === "vendido" ? (
                  <>
                    <div>
                      <span className="font-semibold text-slate-600">
                        {t("appointment.action.nfOsLabel")}:{" "}
                      </span>
                      {appointmentAction.nfOuOs ?? t("appointment.notInformed")}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600">
                        {t("appointment.action.valueLabel")}:{" "}
                      </span>
                      {appointmentAction.valor != null
                        ? new Intl.NumberFormat(locale, {
                            style: "currency",
                            currency: "BRL",
                          }).format(appointmentAction.valor)
                        : t("appointment.notInformed")}
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="font-semibold text-slate-600">
                      {t("appointment.action.lossReasonLabel")}:{" "}
                    </span>
                    {appointmentAction.motivoPerda
                      ? t(
                          `appointment.action.lossReasons.${appointmentAction.motivoPerda}`,
                          undefined,
                          appointmentAction.motivoPerda,
                        )
                      : t("appointment.notInformed")}
                  </div>
                )}
                {appointmentAction.observacao ? (
                  <div>
                    <span className="font-semibold text-slate-600">
                      {t("appointment.action.noteLabel")}:{" "}
                    </span>
                    {appointmentAction.observacao}
                  </div>
                ) : null}
                <div>
                  <span className="font-semibold text-slate-600">
                    {t("appointment.action.createdByLabel")}:{" "}
                  </span>
                  {appointmentAction.createdBy?.trim() ||
                    t("appointment.notInformed")}
                </div>
                {appointmentAction.createdAt ? (
                  <div className="text-xs text-slate-500">
                    {t("appointment.action.createdAt", {
                      date: formatDateLabel(
                        new Date(appointmentAction.createdAt),
                      ),
                      time: formatTime(new Date(appointmentAction.createdAt)),
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">
                {t("appointment.action.empty")}
              </div>
            )}
          </div>

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
              {/* <div>
                <div className="font-semibold text-slate-700">
                  {t("schedule.timeline.scheduled")}
                </div>
                <div>
                  {dateLabel} · {formatTime(appointment.startAt)}
                </div>
              </div> */}
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

      {actionModalOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
              onMouseDown={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget) setActionModalOpen(false);
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t("appointment.action.dialogLabel")}
            >
              <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">
                      {t("appointment.action.dialogTitle")}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {t("appointment.action.dialogSubtitle")}
                    </p>
                  </div>
                  <button
                    ref={actionCloseButtonRef}
                    type="button"
                    onClick={() => setActionModalOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    {t("createAppointment.close")}
                  </button>
                </div>

                <div className="space-y-4 p-5">
                  {actionError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                      {actionError}
                    </div>
                  ) : null}

                  <label className="space-y-1 text-sm font-semibold text-slate-700">
                    <span>
                      {t("appointment.action.resultLabel")}{" "}
                      <span className="text-rose-600">*</span>
                    </span>
                    <select
                      value={actionResult}
                      onChange={(event) =>
                        setActionResult(
                          event.target.value as "vendido" | "perdido" | "",
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    >
                      <option value="">
                        {t("appointment.action.resultPlaceholder")}
                      </option>
                      <option value="vendido">
                        {t("appointment.action.resultSold")}
                      </option>
                      <option value="perdido">
                        {t("appointment.action.resultLost")}
                      </option>
                    </select>
                  </label>

                  {actionResult === "vendido" && (
                    <>
                      <label className="space-y-1 text-sm font-semibold text-slate-700">
                        <span>
                          {t("appointment.action.nfOsLabel")}{" "}
                          <span className="text-rose-600">*</span>
                        </span>
                        <input
                          value={actionNfOs}
                          onChange={(event) => setActionNfOs(event.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          placeholder={t("appointment.action.nfOsPlaceholder")}
                        />
                      </label>
                      <label className="space-y-1 text-sm font-semibold text-slate-700">
                        <span>
                          {t("appointment.action.valueLabel")}{" "}
                          <span className="text-rose-600">*</span>
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={actionValue}
                          onChange={(event) =>
                            setActionValue(event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          placeholder={t("appointment.action.valuePlaceholder")}
                          min="0"
                          step="0.01"
                        />
                      </label>
                    </>
                  )}

                  {actionResult === "perdido" && (
                    <label className="space-y-1 text-sm font-semibold text-slate-700">
                      <span>
                        {t("appointment.action.lossReasonLabel")}{" "}
                        <span className="text-rose-600">*</span>
                      </span>
                      <select
                        value={actionLossReason}
                        onChange={(event) =>
                          setActionLossReason(event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      >
                        <option value="">
                          {t("appointment.action.lossReasonPlaceholder")}
                        </option>
                        {lossReasons.map((reason) => (
                          <option key={reason} value={reason}>
                            {t(
                              `appointment.action.lossReasons.${reason}`,
                              undefined,
                              reason,
                            )}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="space-y-1 text-sm font-semibold text-slate-700">
                    <span>{t("appointment.action.noteLabel")}</span>
                    <textarea
                      value={actionNote}
                      onChange={(event) => setActionNote(event.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      placeholder={t("appointment.action.notePlaceholder")}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setActionModalOpen(false)}
                    disabled={actionLoading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                  >
                    {t("appointment.action.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    disabled={actionLoading}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading
                      ? t("appointment.action.saving")
                      : t("appointment.action.confirm")}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </PageShell>
  );
}
