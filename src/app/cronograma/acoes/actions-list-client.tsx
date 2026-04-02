"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/Badge";
import { LeadTypesMultiSelect } from "@/components/LeadTypesMultiSelect";
import { PaginationControls } from "@/components/PaginationControls";
import { PageShell } from "@/components/PageShell";
import { TableColumnFilterHeader } from "@/components/TableColumnFilterHeader";
import { createTranslator, getMessages, type Locale } from "@/lib/i18n";
import { OPPORTUNITY_OPTIONS, formatDateLabel, formatTime } from "@/lib/schedule";
import { loadSessionStorage, saveSessionStorage } from "@/lib/sessionStorage";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

type Props = { locale: Locale };
type Result = "em_andamento" | "vendido" | "perdido";
type Sort =
  | "date_desc"
  | "date_asc"
  | "company_asc"
  | "company_desc"
  | "consultant_asc"
  | "consultant_desc"
  | "actor_asc"
  | "actor_desc"
  | "result_asc"
  | "result_desc"
  | "opportunity_asc"
  | "opportunity_desc"
  | "value_asc"
  | "value_desc";
type Col = "empresa" | "consultor" | "ator" | "data" | "resultado" | "oportunidade" | "valor" | "nfOs";
type ActionRow = {
  id: string; apontamento_id: string | null; resultado: Result; tipo_oportunidade?: string | null;
  nf_ou_os: string | null; valor: number | string | null; motivo_perda: string | null;
  observacao: string | null; created_by: string | null; created_at: string | null;
};
type AppointmentRow = { id: string; company_id: string | null; consultant_name: string | null };
type CompanyRow = { id: string; name: string; document: string | null };
type Item = {
  id: string; appointmentId: string; companyName: string | null; companyDocument: string | null;
  consultantName: string | null; actorId: string | null; actorLabel: string | null; createdAt: string | null;
  result: Result; opportunityType: string | null; nfOuOs: string | null; value: number | null;
  lossReason: string | null; note: string | null;
};

type ActionsListSessionState = {
  actorFilter: string[];
  companyFilter: string[];
  consultantFilter: string[];
  search: string;
  resultFilter: Result[];
  oppFilter: string[];
  columns: Col[];
  sort: Sort;
  page: number;
};

const ACTIONS_LIST_SESSION_STORAGE_KEY = "cronograma:acoes:ui-state";

function ToolbarRow({ summary, children, className }: { summary: ReactNode; children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}><div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{summary}</div><div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{children}</div></div>;
}
function ToolbarField({ label, srOnlyLabel = false, children, className, contentClassName }: { label?: string; srOnlyLabel?: boolean; children: ReactNode; className?: string; contentClassName?: string }) {
  return <label className={`relative z-0 flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus-within:z-30 sm:w-auto ${className ?? ""}`}>{label ? <span className={srOnlyLabel ? "sr-only" : "text-xs uppercase tracking-wide text-slate-500"}>{label}</span> : null}<div className={contentClassName}>{children}</div></label>;
}

const COLS: readonly Col[] = ["empresa", "consultor", "ator", "data", "resultado", "oportunidade", "valor", "nfOs"];
const RESULTS: readonly Result[] = ["em_andamento", "vendido", "perdido"];
const chunk = <T,>(arr: T[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
const toNumber = (v: number | string | null | undefined) => v == null ? null : Number.isFinite(typeof v === "string" ? Number(v) : v) ? Number(v) : null;
const norm = (v: string | null | undefined) => v?.trim().toLowerCase() ?? "";
const actorName = (v: string | null | undefined) => {
  const raw = v?.trim() ?? "";
  if (!raw.includes("@")) return raw;
  return raw.split("@")[0]!.split(".").filter(Boolean).map((p) => p.split("-").map((t) => t ? t[0]!.toUpperCase() + t.slice(1).toLowerCase() : "").join("-")).join(" ");
};

export default function ActionsListClient({ locale }: Props) {
  const t = useMemo(() => createTranslator(getMessages(locale)), [locale]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const reqRef = useRef(0);
  const panel = "rounded-2xl border border-slate-200 bg-white shadow-lg shadow-black/5";
  const toolbar = "rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm";
  const input = "w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";
  const persistedState = useMemo(
    () =>
      loadSessionStorage<ActionsListSessionState>(
        ACTIONS_LIST_SESSION_STORAGE_KEY,
        {
          actorFilter: [],
          companyFilter: [],
          consultantFilter: [],
          search: "",
          resultFilter: [],
          oppFilter: [],
          columns: [...COLS],
          sort: "date_desc",
          page: 1,
        },
        (value) => {
          if (!value || typeof value !== "object") {
            return {
              actorFilter: [],
              companyFilter: [],
              consultantFilter: [],
              search: "",
              resultFilter: [],
              oppFilter: [],
              columns: [...COLS],
              sort: "date_desc",
              page: 1,
            };
          }
          const data = value as Partial<ActionsListSessionState>;
          return {
            actorFilter: Array.isArray(data.actorFilter) ? data.actorFilter.filter((item): item is string => typeof item === "string") : [],
            companyFilter: Array.isArray(data.companyFilter) ? data.companyFilter.filter((item): item is string => typeof item === "string") : [],
            consultantFilter: Array.isArray(data.consultantFilter) ? data.consultantFilter.filter((item): item is string => typeof item === "string") : [],
            search: typeof data.search === "string" ? data.search : "",
            resultFilter: Array.isArray(data.resultFilter) ? data.resultFilter.filter((item): item is Result => RESULTS.includes(item as Result)) : [],
            oppFilter: Array.isArray(data.oppFilter) ? data.oppFilter.filter((item): item is string => typeof item === "string") : [],
            columns: Array.isArray(data.columns) ? ((data.columns.filter((item): item is Col => COLS.includes(item as Col)) as Col[]).length ? Array.from(new Set(data.columns.filter((item): item is Col => COLS.includes(item as Col)))) : [...COLS]) : [...COLS],
            sort: data.sort && ["date_desc", "date_asc", "company_asc", "company_desc", "consultant_asc", "consultant_desc", "actor_asc", "actor_desc", "result_asc", "result_desc", "opportunity_asc", "opportunity_desc", "value_asc", "value_desc"].includes(data.sort) ? data.sort : "date_desc",
            page: typeof data.page === "number" && Number.isInteger(data.page) && data.page > 0 ? data.page : 1,
          };
        },
      ),
    [],
  );
  const [actorFilter, setActorFilter] = useState<string[]>(persistedState.actorFilter);
  const [companyFilter, setCompanyFilter] = useState<string[]>(persistedState.companyFilter);
  const [consultantFilter, setConsultantFilter] = useState<string[]>(persistedState.consultantFilter);
  const [search, setSearch] = useState(persistedState.search);
  const [resultFilter, setResultFilter] = useState<Result[]>(persistedState.resultFilter);
  const [oppFilter, setOppFilter] = useState<string[]>(persistedState.oppFilter);
  const [columns, setColumns] = useState<Col[]>(persistedState.columns as Col[]);
  const [sort, setSort] = useState<Sort>(persistedState.sort);
  const [page, setPage] = useState(persistedState.page);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const req = ++reqRef.current;
      setLoading(true); setError(null);
      try {
        const { data: raw, error: e } = await supabase.from("apontamento_acoes").select("id, apontamento_id, resultado, tipo_oportunidade, nf_ou_os, valor, motivo_perda, observacao, created_by, created_at").order("created_at", { ascending: false });
        if (req !== reqRef.current) return;
        if (e) throw e;
        const actions = ((raw ?? []) as ActionRow[]).filter((r): r is ActionRow & { apontamento_id: string } => Boolean(r.apontamento_id));
        const appointmentIds = Array.from(new Set(actions.map((r) => r.apontamento_id)));
        const appointments = new Map<string, AppointmentRow>();
        for (const ids of chunk(appointmentIds, 200)) {
          const { data, error: e2 } = await supabase.from("apontamentos").select("id, company_id, consultant_name").in("id", ids);
          if (req !== reqRef.current) return;
          if (e2) throw e2;
          ((data ?? []) as AppointmentRow[]).forEach((row) => appointments.set(row.id, row));
        }
        const companyIds = Array.from(new Set(actions.map((r) => appointments.get(r.apontamento_id)?.company_id).filter(Boolean))) as string[];
        const companies = new Map<string, CompanyRow>();
        for (const ids of chunk(companyIds, 200)) {
          const { data, error: e3 } = await supabase.from("companies").select("id, name, document").in("id", ids);
          if (req !== reqRef.current) return;
          if (e3) throw e3;
          ((data ?? []) as CompanyRow[]).forEach((row) => companies.set(row.id, row));
        }
        setItems(actions.map((row) => {
          const appointment = appointments.get(row.apontamento_id);
          const company = appointment?.company_id ? companies.get(appointment.company_id) : null;
          const actorId = row.created_by?.trim() ?? null;
          return { id: row.id, appointmentId: row.apontamento_id, companyName: company?.name ?? null, companyDocument: company?.document ?? null, consultantName: appointment?.consultant_name ?? null, actorId, actorLabel: actorId ? actorName(actorId) : null, createdAt: row.created_at ?? null, result: row.resultado, opportunityType: row.tipo_oportunidade ?? null, nfOuOs: row.nf_ou_os ?? null, value: toNumber(row.valor), lossReason: row.motivo_perda ?? null, note: row.observacao ?? null };
        }));
      } catch (err) {
        console.error("Falha ao carregar a lista de ações", err);
        if (req !== reqRef.current) return;
        setItems([]); setError(t("schedule.actionsList.loadError"));
      } finally {
        if (req === reqRef.current) setLoading(false);
      }
    };
    void load();
  }, [supabase, t]);

  const money = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }), [locale]);
  const actorOptions = useMemo(() => Array.from(items.reduce((m, item) => {
    if (!item.actorId) return m;
    m.set(item.actorId, (m.get(item.actorId) ?? 0) + 1);
    return m;
  }, new Map<string, number>()).entries()).map(([value, count]) => ({ value, label: actorName(value), count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR")).map(({ value, label }) => ({ value, label })), [items]);
  const actorOptionValues = useMemo(() => actorOptions.map((option) => option.value), [actorOptions]);
  const companyOptions = useMemo(
    () =>
      Array.from(
        items.reduce((map, item) => {
          const value = item.companyName?.trim();
          if (!value) return map;
          map.set(value, (map.get(value) ?? 0) + 1);
          return map;
        }, new Map<string, number>()).entries(),
      )
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
        .map(({ value, label }) => ({ value, label })),
    [items],
  );
  const companyOptionValues = useMemo(
    () => companyOptions.map((option) => option.value),
    [companyOptions],
  );
  const consultantOptions = useMemo(
    () =>
      Array.from(
        items.reduce((map, item) => {
          const value = item.consultantName?.trim();
          if (!value) return map;
          map.set(value, (map.get(value) ?? 0) + 1);
          return map;
        }, new Map<string, number>()).entries(),
      )
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
        .map(({ value, label }) => ({ value, label })),
    [items],
  );
  const consultantOptionValues = useMemo(
    () => consultantOptions.map((option) => option.value),
    [consultantOptions],
  );
  useEffect(() => {
    setActorFilter((current) => {
      if (!actorOptionValues.length) return [];
      const sanitized = current.filter((value) => actorOptionValues.includes(value));
      return sanitized.length ? sanitized : actorOptionValues;
    });
  }, [actorOptionValues]);
  useEffect(() => {
    setCompanyFilter((current) => {
      const sanitized = current.filter((value) => companyOptionValues.includes(value));
      return sanitized;
    });
  }, [companyOptionValues]);
  useEffect(() => {
    setConsultantFilter((current) => {
      const sanitized = current.filter((value) => consultantOptionValues.includes(value));
      return sanitized;
    });
  }, [consultantOptionValues]);

  useEffect(() => {
    if (
      sort !== "date_desc" &&
      sort !== "date_asc" &&
      sort !== "company_asc" &&
      sort !== "company_desc" &&
      sort !== "consultant_asc" &&
      sort !== "consultant_desc" &&
      sort !== "actor_asc" &&
      sort !== "actor_desc" &&
      sort !== "result_asc" &&
      sort !== "result_desc" &&
      sort !== "opportunity_asc" &&
      sort !== "opportunity_desc" &&
      sort !== "value_asc" &&
      sort !== "value_desc"
    ) {
      setSort("date_desc");
    }
  }, [sort]);

  const colDefs = useMemo(() => ([
    { id: "empresa", label: t("schedule.actionsList.columns.company"), width: "1.7fr" },
    { id: "consultor", label: t("schedule.actionsList.columns.consultant"), width: "1.1fr" },
    { id: "ator", label: t("schedule.actionsList.columns.actor"), width: "1.1fr" },
    { id: "data", label: t("schedule.actionsList.columns.date"), width: "0.95fr" },
    { id: "resultado", label: t("schedule.actionsList.columns.result"), width: "0.9fr" },
    { id: "oportunidade", label: t("schedule.actionsList.columns.opportunity"), width: "1.2fr" },
    { id: "valor", label: t("schedule.actionsList.columns.value"), width: "1fr" },
    { id: "nfOs", label: t("schedule.actionsList.columns.nfOs"), width: "1fr" },
  ] as const), [t]);
  const visibleCols = colDefs.filter((c) => columns.includes(c.id));
  const grid = visibleCols.map((c) => c.width).join(" ");

  const selectedActorIds = useMemo(() => actorFilter.filter((value) => actorOptionValues.includes(value)), [actorFilter, actorOptionValues]);
  const allActorsSelected = actorOptionValues.length > 0 && selectedActorIds.length === actorOptionValues.length;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const getResultLabel = (item: Item) =>
      item.result === "vendido"
        ? t("appointment.action.resultSold")
        : item.result === "perdido"
          ? t("appointment.action.resultLost")
          : t("appointment.action.resultInProgress");
    const getOpportunityLabel = (item: Item) =>
      item.opportunityType
        ? t(`schedule.opportunity.${item.opportunityType}`, undefined, item.opportunityType)
        : "";
    return items.filter((item) => allActorsSelected ? true : selectedActorIds.length ? selectedActorIds.some((value) => norm(item.actorId) === norm(value)) : false)
      .filter((item) => companyFilter.length ? companyFilter.some((value) => norm(item.companyName) === norm(value)) : true)
      .filter((item) => consultantFilter.length ? consultantFilter.some((value) => norm(item.consultantName) === norm(value)) : true)
      .filter((item) => resultFilter.length ? resultFilter.includes(item.result) : true)
      .filter((item) => oppFilter.length ? item.opportunityType != null && oppFilter.includes(item.opportunityType) : true)
      .filter((item) => !q || [item.companyName, item.companyDocument, item.consultantName, item.actorLabel, item.actorId, item.nfOuOs, item.note, item.opportunityType ? t(`schedule.opportunity.${item.opportunityType}`, undefined, item.opportunityType) : null, item.lossReason ? t(`appointment.action.lossReasons.${item.lossReason}`, undefined, item.lossReason) : null].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => sort === "date_asc" ? (a.createdAt ?? "").localeCompare(b.createdAt ?? "") : sort === "company_asc" ? (a.companyName ?? "").localeCompare(b.companyName ?? "", "pt-BR") : sort === "company_desc" ? (b.companyName ?? "").localeCompare(a.companyName ?? "", "pt-BR") : sort === "consultant_asc" ? (a.consultantName ?? "").localeCompare(b.consultantName ?? "", "pt-BR") : sort === "consultant_desc" ? (b.consultantName ?? "").localeCompare(a.consultantName ?? "", "pt-BR") : sort === "actor_asc" ? (a.actorLabel ?? "").localeCompare(b.actorLabel ?? "", "pt-BR") : sort === "actor_desc" ? (b.actorLabel ?? "").localeCompare(a.actorLabel ?? "", "pt-BR") : sort === "result_asc" ? getResultLabel(a).localeCompare(getResultLabel(b), "pt-BR") : sort === "result_desc" ? getResultLabel(b).localeCompare(getResultLabel(a), "pt-BR") : sort === "opportunity_asc" ? getOpportunityLabel(a).localeCompare(getOpportunityLabel(b), "pt-BR") : sort === "opportunity_desc" ? getOpportunityLabel(b).localeCompare(getOpportunityLabel(a), "pt-BR") : sort === "value_asc" ? (a.value ?? -1) - (b.value ?? -1) : sort === "value_desc" ? (b.value ?? -1) - (a.value ?? -1) : (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [allActorsSelected, companyFilter, consultantFilter, items, oppFilter, resultFilter, search, selectedActorIds, sort, t]);
  useEffect(() => setPage(1), [actorFilter, companyFilter, consultantFilter, oppFilter, resultFilter, search, sort]);
  useEffect(() => {
    saveSessionStorage(ACTIONS_LIST_SESSION_STORAGE_KEY, {
      actorFilter,
      companyFilter,
      consultantFilter,
      search,
      resultFilter,
      oppFilter,
      columns,
      sort,
      page,
    } satisfies ActionsListSessionState);
  }, [actorFilter, columns, companyFilter, consultantFilter, oppFilter, page, resultFilter, search, sort]);

  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  useEffect(() => setPage((p) => Math.min(Math.max(p, 1), totalPages)), [totalPages]);
  const pageItems = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page]);
  const summary = filtered.length === 0 ? { start: 0, end: 0, total: 0 } : { start: (page - 1) * perPage + 1, end: Math.min(page * perPage, filtered.length), total: filtered.length };
  const skeleton = useMemo(() => Array.from({ length: perPage }, (_, i) => i), []);

  const resultBadge = (r: Result) => r === "vendido" ? <Badge tone="emerald">{t("appointment.action.resultSold")}</Badge> : r === "perdido" ? <Badge tone="rose">{t("appointment.action.resultLost")}</Badge> : <Badge tone="amber">{t("appointment.action.resultInProgress")}</Badge>;
  const headerSortOptions = useMemo(
    () => ({
      data: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "date_asc", label: t("schedule.columnSortAsc") },
        { value: "date_desc", label: t("schedule.columnSortDesc") },
      ],
      empresa: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "company_asc", label: t("schedule.columnSortAsc") },
        { value: "company_desc", label: t("schedule.columnSortDesc") },
      ],
      consultor: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "consultant_asc", label: t("schedule.columnSortAsc") },
        { value: "consultant_desc", label: t("schedule.columnSortDesc") },
      ],
      ator: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "actor_asc", label: t("schedule.columnSortAsc") },
        { value: "actor_desc", label: t("schedule.columnSortDesc") },
      ],
      resultado: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "result_asc", label: t("schedule.columnSortAsc") },
        { value: "result_desc", label: t("schedule.columnSortDesc") },
      ],
      oportunidade: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "opportunity_asc", label: t("schedule.columnSortAsc") },
        { value: "opportunity_desc", label: t("schedule.columnSortDesc") },
      ],
      valor: [
        { value: "__none__", label: t("schedule.columnSortNone") },
        { value: "value_asc", label: t("schedule.columnSortAsc") },
        { value: "value_desc", label: t("schedule.columnSortDesc") },
      ],
    }),
    [t],
  );
  const resultOptions = useMemo(
    () => [
      { value: "em_andamento", label: t("appointment.action.resultInProgress") },
      { value: "vendido", label: t("appointment.action.resultSold") },
      { value: "perdido", label: t("appointment.action.resultLost") },
    ],
    [t],
  );
  const cell = (col: Col, item: Item) => {
    const date = item.createdAt ? new Date(item.createdAt) : null;
    const dateLabel = date && !Number.isNaN(date.getTime()) ? `${formatDateLabel(date)} · ${formatTime(date)}` : t("appointment.notInformed");
    if (col === "empresa") return <div className="min-w-0"><div className="truncate font-semibold text-slate-900">{item.companyName ?? t("appointment.companyMissing")}</div><div className="truncate text-xs text-slate-500">{item.companyDocument ?? t("schedule.companyDocumentMissing")}</div></div>;
    if (col === "consultor") return <div className="truncate text-slate-700">{item.consultantName ?? t("appointment.notInformed")}</div>;
    if (col === "ator") return <div className="truncate text-slate-700">{item.actorLabel ?? t("appointment.notInformed")}</div>;
    if (col === "data") return <div className="truncate text-slate-700">{dateLabel}</div>;
    if (col === "resultado") return resultBadge(item.result);
    if (col === "oportunidade") return <div className="truncate text-slate-700">{item.opportunityType ? t(`schedule.opportunity.${item.opportunityType}`, undefined, item.opportunityType) : t("appointment.notInformed")}</div>;
    if (col === "valor") return <div className="truncate text-slate-700">{item.value == null ? t("schedule.noData") : money.format(item.value)}</div>;
    return <div className="truncate text-slate-700">{item.nfOuOs ?? t("appointment.notInformed")}</div>;
  };

  return (
    <PageShell title={t("schedule.actionsList.title")} subtitle={t("schedule.actionsList.subtitle")}>
      <div className="flex flex-col gap-4">
        <div className={`${panel} p-3 sm:p-4`}>
          <div className="flex flex-col gap-3">
            <ToolbarRow className={toolbar} summary={loading ? <div className="h-3 w-28 rounded-full bg-slate-200 animate-pulse" /> : <span>{t("schedule.actionsList.count", { count: filtered.length })}</span>}>
              <ToolbarField label={t("schedule.search")} srOnlyLabel className="sm:min-w-[280px]" contentClassName="w-full"><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("schedule.actionsList.searchPlaceholder")} disabled={!selectedActorIds.length} aria-label={t("schedule.search")} className={input} /></ToolbarField>
              <ToolbarField label={t("schedule.visibleColumnsLabel")} className="sm:min-w-[250px]" contentClassName="w-full"><div className="w-full min-w-[190px]"><LeadTypesMultiSelect value={columns} options={colDefs.map((c) => ({ value: c.id, label: c.label }))} onChange={(next) => setColumns(((next.filter((v): v is Col => COLS.includes(v as Col)) as Col[]).length ? Array.from(new Set(next.filter((v): v is Col => COLS.includes(v as Col)))) : [...COLS]))} placeholder={t("schedule.visibleColumnsPlaceholder")} searchPlaceholder={t("schedule.visibleColumnsSearchPlaceholder")} noResultsText={t("schedule.visibleColumnsNoResults")} selectedCountTemplate={t("schedule.multiSelectSelectedCount")} selectAllLabel={t("schedule.multiSelectSelectAll")} clearAllLabel={t("schedule.multiSelectClearAll")} /></div></ToolbarField>
            </ToolbarRow>
            <PaginationControls className="px-1" summary={loading ? <div className="h-3 w-36 rounded-full bg-slate-200 animate-pulse" /> : t("schedule.paginationSummary", summary)} pageInfo={loading ? <div className="h-3 w-20 rounded-full bg-slate-200 animate-pulse" /> : t("schedule.paginationPage", { page, total: totalPages })} prevLabel={t("schedule.paginationPrev")} nextLabel={t("schedule.paginationNext")} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(totalPages, p + 1))} prevDisabled={page <= 1 || loading} nextDisabled={page >= totalPages || loading} />
            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</div> : null}
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-black/5">
            <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3" style={{ gridTemplateColumns: grid }}>{visibleCols.map((c) => <div key={c.id} className="min-w-0">{c.id === "empresa" ? <TableColumnFilterHeader label={c.label} filterValue={companyFilter} filterOptions={companyOptions} onFilterChange={setCompanyFilter} filterPlaceholder={c.label} filterAllLabel={t("schedule.dashboard.allCompanies")} filterSearchPlaceholder={t("schedule.companyFilterSearchPlaceholder")} filterNoResultsText={t("schedule.companyFilterNoResults")} selectedCountTemplate={t("schedule.multiSelectSelectedCount")} selectAllLabel={t("schedule.multiSelectSelectAll")} clearAllLabel={t("schedule.multiSelectClearAll")} sortValue={sort === "company_asc" || sort === "company_desc" ? sort : "__none__"} sortOptions={headerSortOptions.empresa} onSortChange={(next) => setSort(next === "__none__" ? "date_desc" : next as Sort)} sortAriaLabel={c.label} /> : c.id === "consultor" ? <TableColumnFilterHeader label={c.label} filterValue={consultantFilter} filterOptions={consultantOptions} onFilterChange={setConsultantFilter} filterPlaceholder={c.label} filterAllLabel={t("schedule.dashboard.allConsultants")} filterSearchPlaceholder={t("schedule.consultantFilterSearchPlaceholder")} filterNoResultsText={t("schedule.emptyConsultant")} selectedCountTemplate={t("schedule.multiSelectSelectedCount")} selectAllLabel={t("schedule.multiSelectSelectAll")} clearAllLabel={t("schedule.multiSelectClearAll")} sortValue={sort === "consultant_asc" || sort === "consultant_desc" ? sort : "__none__"} sortOptions={headerSortOptions.consultor} onSortChange={(next) => setSort(next === "__none__" ? "date_desc" : next as Sort)} sortAriaLabel={c.label} /> : c.id === "ator" ? <TableColumnFilterHeader label={c.label} filterValue={actorFilter} filterOptions={actorOptions} onFilterChange={setActorFilter} filterPlaceholder={c.label} filterAllLabel={t("schedule.actionsList.actorAll")} filterSearchPlaceholder={t("schedule.actorFilterSearchPlaceholder")} filterNoResultsText={t("schedule.emptyConsultant")} selectedCountTemplate={t("schedule.multiSelectSelectedCount")} selectAllLabel={t("schedule.multiSelectSelectAll")} clearAllLabel={t("schedule.multiSelectClearAll")} sortValue={sort === "actor_asc" || sort === "actor_desc" ? sort : "__none__"} sortOptions={headerSortOptions.ator} onSortChange={(next) => setSort(next === "__none__" ? "date_desc" : next as Sort)} sortAriaLabel={c.label} /> : c.id === "data" ? <TableColumnFilterHeader label={c.label} sortValue={sort === "date_asc" || sort === "date_desc" ? sort : "__none__"} sortOptions={headerSortOptions.data} onSortChange={(next) => setSort(next === "__none__" ? "date_desc" : next as Sort)} sortAriaLabel={c.label} /> : c.id === "resultado" ? <TableColumnFilterHeader label={c.label} sortValue={sort === "result_asc" || sort === "result_desc" ? sort : "__none__"} sortOptions={headerSortOptions.resultado} onSortChange={(next) => setSort(next === "__none__" ? "date_desc" : next as Sort)} sortAriaLabel={c.label} /> : c.id === "oportunidade" ? <TableColumnFilterHeader label={c.label} sortValue={sort === "opportunity_asc" || sort === "opportunity_desc" ? sort : "__none__"} sortOptions={headerSortOptions.oportunidade} onSortChange={(next) => setSort(next === "__none__" ? "date_desc" : next as Sort)} sortAriaLabel={c.label} /> : c.id === "valor" ? <TableColumnFilterHeader label={c.label} sortValue={sort === "value_asc" || sort === "value_desc" ? sort : "__none__"} sortOptions={headerSortOptions.valor} onSortChange={(next) => setSort(next === "__none__" ? "date_desc" : next as Sort)} sortAriaLabel={c.label} /> : <span className="block truncate text-xs font-semibold uppercase tracking-wide text-slate-600">{c.label}</span>}</div>)}</div>
            <div className="divide-y divide-slate-200">
              {!selectedActorIds.length ? <div className="px-5 py-4 text-sm text-slate-500">{t("schedule.actionsList.selectAtLeastOneActorToView")}</div> : loading ? skeleton.map((i) => <div key={`actions-skeleton-${i}`} className="grid min-w-0 items-center gap-4 px-5 py-3 text-sm min-h-[56px]" style={{ gridTemplateColumns: grid }}>{visibleCols.map((c) => <div key={`${i}-${c.id}`} className="min-w-0"><div className="h-4 w-4/5 rounded-full bg-slate-200 animate-pulse" /></div>)}</div>) : pageItems.map((item) => <Link key={item.id} href={`/cronograma/${item.appointmentId}`} className="grid min-w-0 items-center gap-4 px-5 py-3 text-sm text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A900]/50" style={{ gridTemplateColumns: grid }}>{visibleCols.map((c) => <div key={`${item.id}-${c.id}`} className="min-w-0 overflow-hidden">{cell(c.id, item)}</div>)}</Link>)}
              {!loading && filtered.length === 0 ? <div className="px-5 py-4 text-sm text-slate-500">{t("schedule.actionsList.empty")}</div> : null}
            </div>
            {!loading && filtered.length > 0 ? <PaginationControls className="border-t border-slate-200 bg-slate-50 px-5 py-3" summary={t("schedule.paginationSummary", summary)} pageInfo={t("schedule.paginationPage", { page, total: totalPages })} prevLabel={t("schedule.paginationPrev")} nextLabel={t("schedule.paginationNext")} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(totalPages, p + 1))} prevDisabled={page <= 1} nextDisabled={page >= totalPages} /> : null}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
