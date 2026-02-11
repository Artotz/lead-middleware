"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { useSchedule } from "@/contexts/ScheduleContext";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  formatDateLabel,
  formatDuration,
  formatTime,
  getOpportunityLabel,
  STATUS_LABELS,
  STATUS_TONES,
} from "@/lib/schedule";
import { ScheduleMapView } from "../components/ScheduleMapView";

type AppointmentMediaKind = "checkin" | "checkout" | "absence" | "other";

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

const MEDIA_KIND_LABELS: Record<AppointmentMediaKind, string> = {
  checkin: "Check-in",
  checkout: "Check-out",
  absence: "Ausencia",
  other: "Outros",
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

const formatMediaTimestamp = (value: string | null) => {
  if (!value) return "Data nao informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data nao informada";
  return `${formatDateLabel(date)} · ${formatTime(date)}`;
};

export default function AppointmentDetailClient() {
  const params = useParams();
  const appointmentId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { appointments, companies, loading } = useSchedule();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [media, setMedia] = useState<AppointmentMediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const mediaRequestIdRef = useRef(0);

  const appointment = useMemo(
    () => appointments.find((item) => item.id === appointmentId),
    [appointments, appointmentId],
  );
  const company = useMemo(
    () => companies.find((item) => item.id === appointment?.companyId),
    [companies, appointment?.companyId],
  );

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
          setMediaError("Nao foi possivel carregar as imagens.");
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
        setMediaError("Nao foi possivel carregar as imagens.");
      }
    },
    [supabase],
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

  const handleRefreshMedia = useCallback(() => {
    if (!appointmentId) return;
    void loadMedia(appointmentId);
  }, [appointmentId, loadMedia]);

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
                <span className="font-semibold text-slate-600">
                  Consultor:{" "}
                </span>
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
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
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
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:p-4">
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

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Imagens do apontamento
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span>URLs expiram em 60s</span>
                <button
                  type="button"
                  onClick={handleRefreshMedia}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Atualizar imagens
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
                Carregando imagens...
              </div>
            ) : null}

            {!mediaLoading && !mediaError && media.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                Nenhuma imagem registrada neste apontamento.
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
                        {MEDIA_KIND_LABELS[kind]}
                      </Badge>
                      <span>{items.length} imagem(ns)</span>
                    </div>
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                        >
                          {item.signedUrl ? (
                            <a
                              href={item.signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={item.signedUrl}
                                alt={`Imagem ${MEDIA_KIND_LABELS[item.kind]}`}
                                className="h-48 w-full object-cover transition hover:scale-[1.01]"
                                loading="lazy"
                              />
                            </a>
                          ) : (
                            <div className="flex h-48 items-center justify-center px-4 text-xs text-slate-400">
                              Imagem indisponivel
                            </div>
                          )}
                          <div className="flex items-center justify-between px-2 py-1 text-[10px] text-slate-500">
                            <span>{formatMediaTimestamp(item.createdAt)}</span>
                            {item.mimeType ? (
                              <span>{item.mimeType}</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
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
              Linha do tempo
            </h2>
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
