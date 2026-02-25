"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { Tabs } from "@/components/Tabs";
import { useSchedule } from "@/contexts/ScheduleContext";
import {
  buildDocumentVariants,
  splitProtheusSeries,
  type ProtheusSerieRow,
} from "@/lib/protheus";
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
import { CreateAppointmentModal } from "../../components/CreateAppointmentPanel";

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

type OrcamentoRow = {
  csa: string | null;
  definicao: string | null;
  classe: string | null;
  clientes: string | null;
  vs1_numorc: number | string | null;
  vs1_filial: number | string | null;
  vs3_codite: string | null;
  descricao: string | null;
  vs3_qtdite: number | string | null;
  vs3_valtot: number | string | null;
  vs1_nclift: string | null;
  vs1_datorc: number | string | null;
  cnpj: number | string | null;
  vs1_vtotnf: number | string | null;
  consultor_bd: string | null;
  consultor_codigo: number | string | null;
  status: string | null;
};

type OrcamentoGroup = {
  key: string;
  numorc: string;
  filial: string | null;
  data: number | string | null;
  status: string | null;
  consultor: string | null;
  total: number | null;
  definicao: string | null;
  classe: string | null;
  clientes: string | null;
  items: Array<{
    codigo: string | null;
    descricao: string | null;
    qtd: number | null;
    valor: number | null;
  }>;
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

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatQuantity = (value: number | null) =>
  value == null ? "Sem dados" : numberFormatter.format(value);

const formatCurrency = (value: number | null) =>
  value == null ? "Sem dados" : currencyFormatter.format(value);

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

const formatOrcDate = (value: number | string | null) => {
  if (value == null) return "Sem data";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 8) {
    const year = digits.slice(0, 4);
    const month = digits.slice(4, 6);
    const day = digits.slice(6, 8);
    return `${day}/${month}/${year}`;
  }
  return String(value);
};

const normalizeCnpj = (value: string | null | undefined) => {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length ? digits : null;
};

export default function CompanyDetailClient() {
  const params = useParams();
  const companyId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const {
    companies,
    consultants,
    selectedConsultantId,
    refresh,
    loading: scheduleLoading,
  } = useSchedule();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(
    null,
  );
  const requestIdRef = useRef(0);
  const orcRequestIdRef = useRef(0);
  const [showCompanies, setShowCompanies] = useState(true);
  const [showCheckIns, setShowCheckIns] = useState(true);
  const [showCheckOuts, setShowCheckOuts] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalDate, setCreateModalDate] = useState(() => new Date());
  const [orcamentos, setOrcamentos] = useState<OrcamentoRow[]>([]);
  const [orcamentosLoading, setOrcamentosLoading] = useState(false);
  const [orcamentosError, setOrcamentosError] = useState<string | null>(null);
  const [opportunityTab, setOpportunityTab] = useState<
    "cotacao" | "preventiva" | "reconexao"
  >("cotacao");
  const [protheusSeries, setProtheusSeries] = useState(() => ({
    preventivas: [] as string[],
    reconexoes: [] as string[],
  }));
  const [protheusLoading, setProtheusLoading] = useState(false);
  const [protheusError, setProtheusError] = useState<string | null>(null);
  const protheusRequestIdRef = useRef(0);

  const company = useMemo(
    () => companies.find((item) => item.id === companyId),
    [companies, companyId],
  );

  const openCreateModal = useCallback(() => {
    setCreateModalDate(new Date());
    setCreateModalOpen(true);
  }, []);

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

  const loadOrcamentos = useCallback(
    async (document: string | null | undefined) => {
      const requestId = ++orcRequestIdRef.current;
      setOrcamentosLoading(true);
      setOrcamentosError(null);

      const cnpj = normalizeCnpj(document);
      if (!cnpj) {
        setOrcamentos([]);
        setOrcamentosLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("base_csa_orc")
          .select(
            "csa, definicao, classe, clientes, vs1_numorc, vs1_filial, vs3_codite, descricao, vs3_qtdite, vs3_valtot, vs1_nclift, vs1_datorc, cnpj, vs1_vtotnf, consultor_bd, consultor_codigo, status",
          )
          .eq("cnpj", cnpj)
          .order("vs1_datorc", { ascending: false })
          .order("vs1_numorc", { ascending: false });

        if (requestId !== orcRequestIdRef.current) return;

        if (error) {
          console.error(error);
          setOrcamentos([]);
          setOrcamentosLoading(false);
          setOrcamentosError("Nao foi possivel carregar os orcamentos.");
          return;
        }

        setOrcamentos((data ?? []) as OrcamentoRow[]);
        setOrcamentosLoading(false);
      } catch (error) {
        console.error(error);
        if (requestId !== orcRequestIdRef.current) return;
        setOrcamentos([]);
        setOrcamentosLoading(false);
        setOrcamentosError("Nao foi possivel carregar os orcamentos.");
      }
    },
    [supabase],
  );

  const loadProtheusSeries = useCallback(
    async (document: string | null | undefined) => {
      const requestId = ++protheusRequestIdRef.current;
      setProtheusLoading(true);
      setProtheusError(null);

      const variants = buildDocumentVariants(document);
      if (!variants.length) {
        setProtheusSeries({ preventivas: [], reconexoes: [] });
        setProtheusLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("base_protheus")
          .select("serie, tipo_lead")
          .in("a1_cgc", variants);

        if (requestId !== protheusRequestIdRef.current) return;

        if (error) {
          console.error(error);
          setProtheusSeries({ preventivas: [], reconexoes: [] });
          setProtheusLoading(false);
          setProtheusError("Nao foi possivel carregar oportunidades.");
          return;
        }

        const rows = (data ?? []) as ProtheusSerieRow[];
        setProtheusSeries(splitProtheusSeries(rows));
        setProtheusLoading(false);
      } catch (error) {
        console.error(error);
        if (requestId !== protheusRequestIdRef.current) return;
        setProtheusSeries({ preventivas: [], reconexoes: [] });
        setProtheusLoading(false);
        setProtheusError("Nao foi possivel carregar oportunidades.");
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!companyId) return;
    setAppointments([]);
    void loadAppointments(companyId);
  }, [companyId, loadAppointments]);

  useEffect(() => {
    if (!companyId) return;
    void loadOrcamentos(company?.document ?? null);
  }, [company?.document, companyId, loadOrcamentos]);

  useEffect(() => {
    if (!companyId) return;
    void loadProtheusSeries(company?.document ?? null);
  }, [company?.document, companyId, loadProtheusSeries]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const done = appointments.filter(isAppointmentDone).length;
    const absent = appointments.filter(isAppointmentAbsent).length;
    const inProgress = appointments.filter(
      (item) =>
        !isAppointmentDone(item) &&
        !isAppointmentAbsent(item) &&
        isAppointmentInProgress(item),
    ).length;
    const pending = total - done - absent - inProgress;
    return { total, done, inProgress, absent, pending };
  }, [appointments]);

  const groupedOrcamentos = useMemo<OrcamentoGroup[]>(() => {
    if (!orcamentos.length) return [];

    const grouped = new Map<string, OrcamentoGroup>();

    orcamentos.forEach((row) => {
      const numorc = row.vs1_numorc != null ? String(row.vs1_numorc) : "Sem";
      const filial = row.vs1_filial != null ? String(row.vs1_filial) : null;
      const key = `${numorc}-${filial ?? "sem"}`;
      const item = {
        codigo: row.vs3_codite ?? null,
        descricao: row.descricao ?? null,
        qtd: toNumber(row.vs3_qtdite),
        valor: toNumber(row.vs3_valtot),
      };

      const entry = grouped.get(key);
      if (entry) {
        entry.items.push(item);
        if (entry.total == null) {
          entry.total = toNumber(row.vs1_vtotnf);
        }
        return;
      }

      grouped.set(key, {
        key,
        numorc,
        filial,
        data: row.vs1_datorc ?? null,
        status: row.status ?? null,
        consultor: row.consultor_bd ?? null,
        total: toNumber(row.vs1_vtotnf),
        definicao: row.definicao ?? null,
        classe: row.classe ?? null,
        clientes: row.clientes ?? null,
        items: [item],
      });
    });

    const toSortableDate = (value: number | string | null) => {
      if (value == null) return 0;
      const parsed = Number(String(value).replace(/\D/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return Array.from(grouped.values()).sort((a, b) => {
      const dateDiff = toSortableDate(b.data) - toSortableDate(a.data);
      if (dateDiff !== 0) return dateDiff;
      return a.numorc.localeCompare(b.numorc, "pt-BR");
    });
  }, [orcamentos]);

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
    {
      label: "Documento",
      value: company.document ?? "Documento nao informado",
    },
    { label: "Estado", value: company.state ?? "Sem estado" },
    { label: "CSA", value: company.csa ?? "Sem CSA" },
    { label: "Email CSA", value: company.emailCsa ?? "Sem email CSA" },
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
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Criar apontamento
        </button>
      </div>

      <CreateAppointmentModal
        open={createModalOpen}
        companies={companies}
        consultants={consultants}
        defaultConsultantId={selectedConsultantId}
        defaultCompanyId={company.id}
        defaultDate={createModalDate}
        onClose={() => setCreateModalOpen(false)}
        onCreated={async () => {
          await refresh();
          if (companyId) {
            await loadAppointments(companyId);
          }
        }}
      />

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
                Oportunidades
              </h2>
              <Tabs
                tabs={[
                  {
                    id: "cotacao",
                    label: `Cotacao (${groupedOrcamentos.length})`,
                  },
                  {
                    id: "preventiva",
                    label: `Preventiva (${protheusSeries.preventivas.length})`,
                  },
                  {
                    id: "reconexao",
                    label: `Reconexao (${protheusSeries.reconexoes.length})`,
                  },
                ]}
                activeTabId={opportunityTab}
                onTabChange={(id) => {
                  if (id === "preventiva" || id === "reconexao") {
                    setOpportunityTab(id);
                    return;
                  }
                  setOpportunityTab("cotacao");
                }}
              />
            </div>

            {opportunityTab === "cotacao" ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>{groupedOrcamentos.length} orcamentos</span>
                  <span>{orcamentos.length} itens</span>
                  <button
                    type="button"
                    onClick={() => loadOrcamentos(company.document)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Atualizar
                  </button>
                </div>

                {orcamentosError ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    {orcamentosError}
                  </div>
                ) : null}

                {orcamentosLoading ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                    Carregando orcamentos...
                  </div>
                ) : null}

                {!orcamentosLoading &&
                !orcamentosError &&
                orcamentos.length === 0 ? (
                  <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                    Nenhum orcamento encontrado para esta empresa.
                  </div>
                ) : null}

                <div className="mt-3 space-y-3">
                  {groupedOrcamentos.map((orcamento) => (
                    <div
                      key={orcamento.key}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">
                            Orcamento {orcamento.numorc}
                            {orcamento.filial
                              ? ` • Filial ${orcamento.filial}`
                              : ""}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Data: {formatOrcDate(orcamento.data)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                          {orcamento.status ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">
                              {orcamento.status}
                            </span>
                          ) : null}
                          {orcamento.total != null ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                              {formatCurrency(orcamento.total)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                        <div>
                          <span className="font-semibold text-slate-700">
                            Consultor:
                          </span>{" "}
                          {orcamento.consultor ?? "Nao informado"}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">
                            Definicao:
                          </span>{" "}
                          {orcamento.definicao ?? "Sem definicao"}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">
                            Classe:
                          </span>{" "}
                          {orcamento.classe ?? "Sem classe"}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">
                            Cliente:
                          </span>{" "}
                          {orcamento.clientes ?? "Sem cliente"}
                        </div>
                      </div>

                      <details className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                        <summary className="cursor-pointer select-none bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Itens do orcamento ({orcamento.items.length})
                        </summary>
                        <div className="overflow-x-auto">
                          <div className="min-w-[520px]">
                            <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              <span className="flex-1 min-w-0">Item</span>
                              <span className="w-20 shrink-0 text-right whitespace-nowrap tabular-nums">
                                Qtd
                              </span>
                              <span className="w-28 shrink-0 text-right whitespace-nowrap tabular-nums">
                                Valor
                              </span>
                            </div>
                            <div className="divide-y divide-slate-200">
                              {orcamento.items.map((item, index) => (
                                <div
                                  key={`${orcamento.key}-${index}`}
                                  className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate font-semibold text-slate-800">
                                      {item.descricao ?? "Item sem descricao"}
                                    </div>
                                    {item.codigo ? (
                                      <div className="text-[11px] text-slate-500">
                                        {item.codigo}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="w-20 shrink-0 text-right whitespace-nowrap tabular-nums">
                                    {formatQuantity(item.qtd)}
                                  </div>
                                  <div className="w-28 shrink-0 text-right whitespace-nowrap tabular-nums">
                                    {formatCurrency(item.valor)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>Fonte: Protheus</span>
                  <button
                    type="button"
                    onClick={() => loadProtheusSeries(company.document)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Atualizar
                  </button>
                </div>

                {protheusError ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    {protheusError}
                  </div>
                ) : null}

                {protheusLoading ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                    Carregando oportunidades...
                  </div>
                ) : null}

                {!protheusLoading &&
                !protheusError &&
                (opportunityTab === "preventiva"
                  ? protheusSeries.preventivas.length === 0
                  : protheusSeries.reconexoes.length === 0) ? (
                  <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                    Nenhuma oportunidade encontrada para esta empresa.
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {(opportunityTab === "preventiva"
                    ? protheusSeries.preventivas
                    : protheusSeries.reconexoes
                  ).map((serie) => (
                    <Badge
                      key={serie}
                      tone={opportunityTab === "preventiva" ? "amber" : "slate"}
                    >
                      Serie {serie}
                    </Badge>
                  ))}
                </div>
              </>
            )}
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

            {!appointmentsLoading &&
            !appointmentsError &&
            appointments.length === 0 ? (
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
                      Consultor:{" "}
                      {appointment.consultantName?.trim() || "Nao informado"}
                    </div>
                    <div>
                      Endereco:{" "}
                      {appointment.addressSnapshot?.trim() ||
                        company.state ||
                        "Nao informado"}
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
            {/* <div className="mt-3 space-y-3 text-sm text-slate-600">
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
            </div> */}
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
                Empresas
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
                Check-ins
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
                Check-outs
              </button>
            </div>
            <ScheduleMapView
              appointments={appointments}
              companies={[company]}
              showCompanies={showCompanies}
              showCheckIns={showCheckIns}
              showCheckOuts={showCheckOuts}
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
