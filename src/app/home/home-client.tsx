"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { LeadDetailsAside } from "@/components/LeadDetailsAside";
import { LeadsList } from "@/components/LeadsList";
import { MetricCard } from "@/components/MetricCard";
import { PageShell } from "@/components/PageShell";
import { getUserDisplayName, useAuth } from "@/contexts/AuthContext";
import { fetchLeads } from "@/lib/api";
import type { Lead } from "@/lib/domain";
import { FiltersState, INITIAL_FILTERS } from "@/lib/filters";

const PAGE_SIZE = 20;

export default function HomeClient() {
  const { user } = useAuth();
  const consultor = useMemo(() => getUserDisplayName(user), [user]);
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadStatusOptions, setLeadStatusOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetailsOpen, setLeadDetailsOpen] = useState(false);

  const consultorFilter = consultor?.trim() ?? "";

  const loadLeads = useCallback(
    async (nextFilters: FiltersState) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchLeads({
          page: 1,
          pageSize: PAGE_SIZE,
          consultor: consultorFilter,
          ...nextFilters,
        });
        setLeads(response.items);
        setLeadsTotal(response.total);
        setLeadStatusOptions(response.statusOptions ?? []);
      } catch (err) {
        console.error(err);
        setError("Nao foi possivel carregar os leads.");
      } finally {
        setLoading(false);
      }
    },
    [consultorFilter],
  );

  useEffect(() => {
    void loadLeads(filters);
  }, [filters, loadLeads]);

  const metrics = useMemo(() => {
    const novos = leads.filter((lead) =>
      (lead.status ?? "").trim().toLowerCase().includes("novo"),
    ).length;
    const semStatus = leads.filter(
      (lead) => !(lead.status ?? "").trim(),
    ).length;
    return { novos, semStatus };
  }, [leads]);

  const handleLeadAssigned = useCallback((leadId: number, assignee: string) => {
    const updatedAt = new Date().toISOString();
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? { ...lead, consultor: assignee, status: "atribuido", updatedAt }
          : lead,
      ),
    );
    setSelectedLead((prev) =>
      prev && prev.id === leadId
        ? { ...prev, consultor: assignee, status: "atribuido", updatedAt }
        : prev,
    );
  }, []);

  const handleLeadStatusChange = useCallback((leadId: number, status: string) => {
    const updatedAt = new Date().toISOString();
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status, updatedAt } : lead,
      ),
    );
    setSelectedLead((prev) =>
      prev && prev.id === leadId ? { ...prev, status, updatedAt } : prev,
    );
  }, []);

  return (
    <PageShell
      title="Home"
      subtitle="Resumo rapido dos seus leads e atividade recente."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Total de leads"
          value={leadsTotal}
          subtitle={consultorFilter ? `Consultor: ${consultorFilter}` : undefined}
        />
        <MetricCard label="Leads novos" value={metrics.novos} subtitle="na lista atual" />
        <MetricCard label="Sem status" value={metrics.semStatus} subtitle="na lista atual" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">
            {consultorFilter ? "Leads do consultor" : "Leads"}
          </div>
          <span className="text-xs text-slate-500">
            {leadsTotal} leads encontrados
          </span>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Carregando leads...
            </div>
          ) : null}

          {!loading && error ? (
            <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => loadLeads(filters)}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          {!loading && !error ? (
            <LeadsList
              leads={leads}
              filters={filters}
              onFiltersChange={setFilters}
              currentUserName={consultor}
              statusOptions={leadStatusOptions}
              onLeadAssigned={handleLeadAssigned}
              onLeadStatusChange={handleLeadStatusChange}
              onLeadSelect={(lead) => {
                setSelectedLead(lead);
                setLeadDetailsOpen(true);
              }}
            />
          ) : null}
        </div>
      </div>

      {selectedLead ? (
        <LeadDetailsAside
          lead={selectedLead}
          open={leadDetailsOpen}
          onClose={() => setLeadDetailsOpen(false)}
          currentUserName={consultor}
          onLeadAssigned={handleLeadAssigned}
        />
      ) : null}
    </PageShell>
  );
}
