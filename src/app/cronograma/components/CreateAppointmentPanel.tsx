"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth, getUserDisplayName } from "@/contexts/AuthContext";
import { useToast } from "@/components/ToastProvider";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  type Company,
  formatDuration,
  matchesConsultantCompany,
} from "@/lib/schedule";

type Consultant = {
  id: string;
  name: string;
};

type CreateAppointmentModalProps = {
  open: boolean;
  companies: Company[];
  consultants: Consultant[];
  defaultConsultantId: string | null;
  defaultCompanyId?: string | null;
  defaultDate: Date;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
};

const padTime = (value: number) => String(value).padStart(2, "0");

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (date: Date) =>
  `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;

const addMinutes = (date: Date, minutes: number) => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

const parseDateTime = (dateValue: string, timeValue: string) => {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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

export function CreateAppointmentModal({
  open,
  companies,
  consultants,
  defaultConsultantId,
  defaultCompanyId,
  defaultDate,
  onClose,
  onCreated,
}: CreateAppointmentModalProps) {
  const { user } = useAuth();
  const toast = useToast();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setLoading(false);

    const now = new Date();
    const endCandidate = addMinutes(now, 60);
    const endValue =
      endCandidate.toDateString() === now.toDateString()
        ? toTimeInputValue(endCandidate)
        : "23:59";

    setDateValue(toDateInputValue(defaultDate));
    setStartTime(toTimeInputValue(now));
    setEndTime(endValue);

    const hasDefaultConsultant =
      defaultConsultantId &&
      consultants.some((item) => item.id === defaultConsultantId);
    const nextConsultant = hasDefaultConsultant
      ? defaultConsultantId
      : consultants[0]?.id ?? "";
    setConsultantId(nextConsultant);
    setSelectedCompanyId(defaultCompanyId ?? "");

    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [
    consultants,
    defaultCompanyId,
    defaultConsultantId,
    defaultDate,
    open,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  const selectedConsultant = useMemo(
    () => consultants.find((item) => item.id === consultantId) ?? null,
    [consultantId, consultants],
  );

  const availableCompanies = useMemo(() => {
    if (!selectedConsultant?.name) return [];
    const matched = companies.filter((company) =>
      matchesConsultantCompany(company, selectedConsultant.name),
    );
    if (
      selectedCompany &&
      !matched.some((item) => item.id === selectedCompany.id)
    ) {
      return [selectedCompany, ...matched];
    }
    return matched;
  }, [companies, selectedCompany, selectedConsultant]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    if (!companies.length) return;
    if (
      availableCompanies.some((company) => company.id === selectedCompanyId)
    ) {
      return;
    }
    setSelectedCompanyId("");
  }, [availableCompanies, companies.length, selectedCompanyId]);

  const startDateTime = useMemo(
    () => parseDateTime(dateValue, startTime),
    [dateValue, startTime],
  );
  const endDateTime = useMemo(
    () => parseDateTime(dateValue, endTime),
    [dateValue, endTime],
  );

  const timeError = useMemo(() => {
    if (!dateValue || !startTime || !endTime) {
      return "Informe data e horario.";
    }
    if (!startDateTime || !endDateTime) {
      return "Horario invalido.";
    }
    if (endDateTime <= startDateTime) {
      return "Horario final deve ser maior que o inicial.";
    }
    return null;
  }, [dateValue, endDateTime, endTime, startDateTime, startTime]);

  const durationLabel = useMemo(() => {
    if (!startDateTime || !endDateTime) return "--";
    return formatDuration(
      startDateTime.toISOString(),
      endDateTime.toISOString(),
    );
  }, [endDateTime, startDateTime]);

  const canCreate =
    Boolean(selectedCompanyId) &&
    Boolean(consultantId) &&
    !timeError &&
    !loading;

  const handleCreate = async () => {
    if (!canCreate) return;
    if (!startDateTime || !endDateTime) return;

    setError(null);
    setLoading(true);
    try {
      const consultantName =
        selectedConsultant?.name ?? getUserDisplayName(user) ?? null;
      const createdBy = user?.email?.trim() || null;

      const payload = {
        company_id: selectedCompanyId,
        starts_at: startDateTime.toISOString(),
        ends_at: endDateTime.toISOString(),
        consultant_id: consultantId || null,
        consultant_name: consultantName,
        status: "scheduled",
        // address_snapshot: selectedCompany?.state ?? null,
        created_by: createdBy,
      };

      const { error: insertError } = await supabase
        .from("apontamentos")
        .insert(payload);

      if (insertError) {
        console.error(insertError);
        setError("Nao foi possivel criar o apontamento.");
        toast.push({
          variant: "error",
          message: "Nao foi possivel criar o apontamento.",
        });
        setLoading(false);
        return;
      }

      toast.push({
        variant: "success",
        message: "Apontamento criado com sucesso.",
      });
      await onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Nao foi possivel criar o apontamento.");
      toast.push({
        variant: "error",
        message: "Nao foi possivel criar o apontamento.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Criar apontamento"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Criar apontamento
            </h2>
            <p className="text-xs text-slate-500">
              Preencha os dados basicos para criar um apontamento no cronograma.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Fechar
          </button>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Empresa
            </div>

            {!selectedConsultant ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Selecione um consultor para listar as empresas.
              </div>
            ) : null}

            <label className="space-y-1 text-xs font-semibold text-slate-600">
              <span>Empresa selecionada</span>
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                disabled={!selectedConsultant}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {selectedConsultant
                    ? "Selecione a empresa"
                    : "Selecione o consultor primeiro"}
                </option>
                {availableCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedCompany ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 mt-4">
                <div className="font-semibold text-slate-700">
                  {selectedCompany.name}
                </div>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                  <span>
                    Documento: {selectedCompany.document ?? "Nao informado"}
                  </span>
                  <span>
                    Estado: {selectedCompany.state ?? "Nao informado"}
                  </span>
                  <span>CSA: {selectedCompany.csa ?? "Nao informado"}</span>
                  <span>
                    Email CSA: {selectedCompany.emailCsa ?? "Nao informado"}
                  </span>
                  <span>
                    Carteira: {selectedCompany.carteiraDef ?? "Nao informado"}
                  </span>
                  <span>
                    Qtd ultimos 3 meses:{" "}
                    {formatQuantity(selectedCompany.qtdUltimos3Meses)}
                  </span>
                  <span>
                    Valor ultimos 3 meses:{" "}
                    {formatCurrency(selectedCompany.vlrUltimos3Meses)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Agenda
            </div>

            <label className="space-y-1 text-xs font-semibold text-slate-600">
              <span>Consultor</span>
              <select
                value={consultantId}
                onChange={(event) => setConsultantId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                <option value="">Selecione o consultor</option>
                {consultants.map((consultant) => (
                  <option key={consultant.id} value={consultant.id}>
                    {consultant.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>Data</span>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(event) => setDateValue(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>Horario inicio</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                <span>Horario fim</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="text-xs text-slate-500">
              Duracao estimada:{" "}
              <span className="font-semibold">{durationLabel}</span>
            </div>

            {timeError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {timeError}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <div className="text-xs text-slate-500">
            {selectedConsultant
              ? `${availableCompanies.length} empresa(s) disponiveis`
              : "Selecione um consultor para listar empresas."}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Criando..." : "Criar apontamento"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
