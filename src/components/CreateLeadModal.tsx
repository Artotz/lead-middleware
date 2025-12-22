"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createLead, type CreateLeadInput } from "@/lib/api";
import { ESTADOS, REGIOES } from "@/lib/filters";
import type { LeadCategory } from "@/lib/domain";
import { useToast } from "@/components/ToastProvider";

type CreateLeadModalProps = {
  open: boolean;
  onClose: () => void;
  initial?: Partial<CreateLeadInput>;
  onCreated?: () => void;
};

const normalizeTextInput = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export function CreateLeadModal({
  open,
  onClose,
  initial,
  onCreated,
}: CreateLeadModalProps) {
  const toast = useToast();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const [regional, setRegional] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [city, setCity] = useState("");
  const [cliente, setCliente] = useState("");
  const [chassi, setChassi] = useState("");
  const [modelName, setModelName] = useState("");
  const [status, setStatus] = useState("");
  const [tipoLead, setTipoLead] = useState<LeadCategory>("indefinido");
  const [horimetro, setHorimetro] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDisabled = true;

  useEffect(() => {
    if (!open) return;

    setError(null);
    setLoading(false);

    setRegional(initial?.regional ? String(initial.regional) : "");
    setEstado(initial?.estado ? String(initial.estado) : "");
    setCity(initial?.city ? String(initial.city) : "");
    setCliente(
      initial?.clienteBaseEnriquecida
        ? String(initial.clienteBaseEnriquecida)
        : ""
    );
    setChassi(initial?.chassi ? String(initial.chassi) : "");
    setModelName(initial?.modelName ? String(initial.modelName) : "");
    setStatus(initial?.status ? String(initial.status) : "");
    setTipoLead(
      typeof initial?.tipoLead === "string"
        ? (initial.tipoLead as LeadCategory)
        : "indefinido"
    );
    setHorimetro(
      typeof initial?.horimetroAtualMachineList === "number"
        ? String(initial.horimetroAtualMachineList)
        : ""
    );

    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [initial, open]);

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

  const canCreate = useMemo(() => {
    if (loading) return false;
    if (createDisabled) return false;
    return Boolean(
      normalizeTextInput(chassi) ||
        normalizeTextInput(cliente) ||
        normalizeTextInput(city) ||
        normalizeTextInput(modelName)
    );
  }, [chassi, city, cliente, createDisabled, loading, modelName]);

  const handleCreate = async () => {
    if (!canCreate) return;

    setError(null);
    setLoading(true);
    try {
      const horimetroValueRaw = horimetro.trim();
      const horimetroValue =
        horimetroValueRaw === "" ? null : Number(horimetroValueRaw);

      const input: CreateLeadInput = {
        regional: regional || null,
        estado: estado || null,
        city: normalizeTextInput(city),
        chassi: normalizeTextInput(chassi),
        modelName: normalizeTextInput(modelName),
        clienteBaseEnriquecida: normalizeTextInput(cliente),
        status: normalizeTextInput(status),
        tipoLead,
        horimetroAtualMachineList: Number.isFinite(horimetroValue)
          ? horimetroValue
          : null,
      };

      await createLead(input);
      toast.push({ variant: "success", message: "Lead criado com sucesso." });
      onClose();
      onCreated?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Nao foi possivel criar lead.";
      setError(message);
      toast.push({ variant: "error", message });
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
      aria-label="Criar lead"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Novo lead
            </h2>
            <p className="text-xs text-slate-500">
              Preencha os campos basicos para criar um lead manual.
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

        <div className="grid gap-4 p-5 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Identificacao
            </p>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Cliente</span>
              <input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Nome do cliente"
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Chassi</span>
              <input
                value={chassi}
                onChange={(e) => setChassi(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Ex.: ABC123"
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Modelo</span>
              <input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Modelo da maquina"
              />
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Detalhes
            </p>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Regional</span>
                <select
                  value={regional}
                  onChange={(e) => setRegional(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">-</option>
                  {REGIOES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Estado</span>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">-</option>
                  {ESTADOS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Cidade</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Cidade"
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Tipo de lead</span>
              <select
                value={tipoLead}
                onChange={(e) => setTipoLead(e.target.value as LeadCategory)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                <option value="indefinido">indefinido</option>
                <option value="preventiva">preventiva</option>
                <option value="garantia_basica">garantia_basica</option>
                <option value="garantia_estendida">garantia_estendida</option>
                <option value="reforma_componentes">reforma_componentes</option>
                <option value="lamina">lamina</option>
                <option value="dentes">dentes</option>
                <option value="rodante">rodante</option>
                <option value="disponibilidade">disponibilidade</option>
                <option value="reconexao">reconexao</option>
                <option value="transferencia_aor">transferencia_aor</option>
                <option value="pops">pops</option>
                <option value="outros">outros</option>
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Status</span>
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Ex.: novo"
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Horimetro</span>
              <input
                value={horimetro}
                onChange={(e) => setHorimetro(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Ex.: 1234"
                inputMode="numeric"
              />
            </label>

            {/* {createDisabled && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Criacao de leads esta em desenvolvimento. O botao de criar esta desabilitado.
              </div>
            )} */}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            title={createDisabled ? "Em breve" : "Criar lead"}
          >
            {loading ? "Criando..." : "Criar lead"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
