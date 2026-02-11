"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, getUserDisplayName } from "@/contexts/AuthContext";
import { useToast } from "@/components/ToastProvider";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  STATUS_LABELS,
  type Company,
  type SupabaseAppointmentStatus,
  formatDuration,
} from "@/lib/schedule";

type Consultant = {
  id: string;
  name: string;
};

type CreateAppointmentPanelProps = {
  companies: Company[];
  consultants: Consultant[];
  defaultConsultantId: string | null;
  defaultDate: Date;
  onCancel: () => void;
  onCreated?: () => void | Promise<void>;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateTime = (dateValue: string, timeValue: string) => {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const normalizeTextInput = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export function CreateAppointmentPanel({
  companies,
  consultants,
  defaultConsultantId,
  defaultDate,
  onCancel,
  onCreated,
}: CreateAppointmentPanelProps) {
  const { user } = useAuth();
  const toast = useToast();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [addressSnapshot, setAddressSnapshot] = useState("");
  const [addressTouched, setAddressTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [dateValue, setDateValue] = useState(() => toDateInputValue(defaultDate));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [status, setStatus] = useState<SupabaseAppointmentStatus>("scheduled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultantsWithUser = useMemo(() => {
    if (!user?.id) return consultants;
    if (consultants.some((item) => item.id === user.id)) return consultants;
    const displayName = getUserDisplayName(user) ?? "Consultor atual";
    return [{ id: user.id, name: displayName }, ...consultants];
  }, [consultants, user]);

  useEffect(() => {
    if (consultantId) return;
    const next =
      defaultConsultantId ?? user?.id ?? consultantsWithUser[0]?.id ?? "";
    if (next) setConsultantId(next);
  }, [consultantId, consultantsWithUser, defaultConsultantId, user?.id]);

  const normalizedCompanySearch = companySearch.trim().toLowerCase();
  const filteredCompanies = useMemo(() => {
    if (!normalizedCompanySearch) return companies;
    return companies.filter((company) => {
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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedCompanySearch);
    });
  }, [companies, normalizedCompanySearch]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  useEffect(() => {
    if (!selectedCompany) return;
    if (addressTouched) return;
    setAddressSnapshot(selectedCompany.state ?? "");
  }, [addressTouched, selectedCompany]);

  const selectedConsultant = useMemo(
    () => consultantsWithUser.find((item) => item.id === consultantId) ?? null,
    [consultantId, consultantsWithUser],
  );

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
    return formatDuration(startDateTime.toISOString(), endDateTime.toISOString());
  }, [endDateTime, startDateTime]);

  const canCreate =
    Boolean(selectedCompanyId) && Boolean(consultantId) && !timeError && !loading;

  const handleCreate = async () => {
    if (!canCreate) return;
    if (!startDateTime || !endDateTime) return;

    setError(null);
    setLoading(true);
    try {
      const consultantName =
        selectedConsultant?.name ?? getUserDisplayName(user) ?? null;

      const payload = {
        company_id: selectedCompanyId,
        starts_at: startDateTime.toISOString(),
        ends_at: endDateTime.toISOString(),
        consultant_id: consultantId || null,
        consultant_name: consultantName,
        status,
        address_snapshot:
          normalizeTextInput(addressSnapshot) ?? selectedCompany?.state ?? null,
        notes: normalizeTextInput(notes),
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
      onCancel();
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Criar apontamento
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Preencha os dados basicos para criar um apontamento no cronograma.
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Fechar
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Empresa
          </div>

          <label className="space-y-1 text-xs font-semibold text-slate-600">
            <span>Buscar empresa</span>
            <input
              type="search"
              value={companySearch}
              onChange={(event) => setCompanySearch(event.target.value)}
              placeholder="Buscar por nome, documento ou carteira"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="space-y-1 text-xs font-semibold text-slate-600">
            <span>Empresa selecionada</span>
            <select
              value={selectedCompanyId}
              onChange={(event) => {
                setSelectedCompanyId(event.target.value);
                setAddressTouched(false);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">Selecione a empresa</option>
              {filteredCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>

          {selectedCompany ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="font-semibold text-slate-700">
                {selectedCompany.name}
              </div>
              <div className="mt-1 grid gap-1 sm:grid-cols-2">
                <span>
                  Documento: {selectedCompany.document ?? "Nao informado"}
                </span>
                <span>Estado: {selectedCompany.state ?? "Nao informado"}</span>
                <span>CSA: {selectedCompany.csa ?? "Nao informado"}</span>
                <span>
                  Carteira: {selectedCompany.carteiraDef ?? "Nao informado"}
                </span>
              </div>
            </div>
          ) : null}

          <label className="space-y-1 text-xs font-semibold text-slate-600">
            <span>Endereco do apontamento</span>
            <input
              value={addressSnapshot}
              onChange={(event) => {
                setAddressSnapshot(event.target.value);
                setAddressTouched(true);
              }}
              placeholder="Endereco ou observacao"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="space-y-1 text-xs font-semibold text-slate-600">
            <span>Notas</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observacoes ou objetivo da visita"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>
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
              {consultantsWithUser.map((consultant) => (
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
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as SupabaseAppointmentStatus)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
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
            Duracao estimada: <span className="font-semibold">{durationLabel}</span>
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500">
          {filteredCompanies.length} empresa(s) disponiveis
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
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
  );
}
