"use client";

import { useMemo, useState } from "react";
import { Lead } from "@/lib/domain";
import { Badge } from "./Badge";
import { FiltersBar, FiltersState } from "./FiltersBar";

type LeadsListProps = {
  leads: Lead[];
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const initialFilters: FiltersState = {
  search: "",
  empresa: "",
  tipoLead: "",
  sort: "recentes",
};

const leadStatusTone: Record<Lead["status"], Parameters<typeof Badge>[0]["tone"]> =
  {
    novo: "sky",
    em_triagem: "amber",
    descartado: "rose",
    convertido: "emerald",
  };

const leadStatusLabel: Record<Lead["status"], string> = {
  novo: "Novo",
  em_triagem: "Em triagem",
  descartado: "Descartado",
  convertido: "Convertido",
};

const formatDate = (iso: string) => dateFormatter.format(new Date(iso));

export function LeadsList({ leads }: LeadsListProps) {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);

  const empresaOptions = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.empresa))).sort(),
    [leads],
  );

  const tipoLeadOptions = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.tipoLead))).sort(),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    const sorted = [...leads].sort((a, b) => {
      const aDate = new Date(a.criadoEm).getTime();
      const bDate = new Date(b.criadoEm).getTime();
      return filters.sort === "recentes" ? bDate - aDate : aDate - bDate;
    });

    return sorted.filter((lead) => {
      const matchesEmpresa =
        !filters.empresa || lead.empresa === filters.empresa;
      const matchesTipo =
        !filters.tipoLead || lead.tipoLead === filters.tipoLead;
      const matchesSearch =
        !searchTerm ||
        lead.nomeContato.toLowerCase().includes(searchTerm) ||
        lead.telefone.toLowerCase().includes(searchTerm) ||
        lead.chassiOuMaquina.toLowerCase().includes(searchTerm) ||
        lead.tipoLead.toLowerCase().includes(searchTerm) ||
        lead.empresa.toLowerCase().includes(searchTerm);

      return matchesEmpresa && matchesTipo && matchesSearch;
    });
  }, [filters, leads]);

  return (
    <div className="space-y-4">
      <FiltersBar
        value={filters}
        empresaOptions={empresaOptions}
        tipoLeadOptions={tipoLeadOptions}
        searchPlaceholder="Buscar por contato, telefone ou chassi"
        onFiltersChange={setFilters}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_0.9fr_0.9fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span>Empresa</span>
          <span>Contato</span>
          <span>Telefone</span>
          <span>Chassi / Tipo</span>
          <span>Data</span>
          <span>Status</span>
          <span>Ticket</span>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="grid grid-cols-[1.1fr_1fr_1fr_1fr_0.9fr_0.9fr_0.9fr] items-center gap-4 px-5 py-3 text-sm text-slate-800 hover:bg-slate-50"
            >
              <div className="flex flex-col gap-1">
                <Badge tone="sky">{lead.empresa}</Badge>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-900">
                  {lead.nomeContato}
                </span>
                <span className="text-xs text-slate-500">{lead.tipoLead}</span>
              </div>
              <div className="text-slate-800">{lead.telefone}</div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="emerald">{lead.chassiOuMaquina}</Badge>
                <Badge tone="violet">{lead.tipoLead}</Badge>
              </div>
              <div className="text-slate-800">{formatDate(lead.criadoEm)}</div>
              <div>
                <Badge tone={leadStatusTone[lead.status]}>
                  {leadStatusLabel[lead.status]}
                </Badge>
              </div>
              <div>
                {lead.ticketId ? (
                  <Badge tone="violet">#{lead.ticketId}</Badge>
                ) : (
                  <span className="text-xs text-slate-500">Sem ticket</span>
                )}
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="px-5 py-4 text-sm text-slate-500">
              Nenhum lead encontrado com esses filtros.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
