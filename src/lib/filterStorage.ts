import { FiltersState, INITIAL_FILTERS, SortOrder } from "./filters";
import { INITIAL_TICKET_FILTERS, TicketFiltersState } from "./ticketFilters";

const isBrowser = typeof window !== "undefined";

export const FILTER_STORAGE_KEYS = {
  home: "filters:home",
  dashboardLeads: "filters:dashboard:leads",
  dashboardServiceOrders: "filters:dashboard:service-orders",
  dashboardTickets: "filters:dashboard:tickets",
};

function safeParse(value: string | null): unknown {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.every((item) => typeof item === "string") ? value : fallback;
}

function asSortOrder(value: unknown, fallback: SortOrder): SortOrder {
  return value === "recentes" || value === "antigos" ? value : fallback;
}

export function loadLeadFilters(
  key: string,
  fallback: FiltersState = INITIAL_FILTERS,
): FiltersState {
  if (!isBrowser) {
    return fallback;
  }
  const parsed = safeParse(window.localStorage.getItem(key));
  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }
  const data = parsed as Partial<FiltersState>;
  return {
    search: asString(data.search, fallback.search),
    regiao: asString(data.regiao, fallback.regiao) as FiltersState["regiao"],
    estado: asString(data.estado, fallback.estado) as FiltersState["estado"],
    tipoLead: asString(
      data.tipoLead,
      fallback.tipoLead,
    ) as FiltersState["tipoLead"],
    status: asStringArray(data.status, fallback.status),
    sort: asSortOrder(data.sort, fallback.sort),
    groupByEmpresa: asBoolean(
      data.groupByEmpresa,
      fallback.groupByEmpresa ?? false,
    ),
    groupByChassi: asBoolean(
      data.groupByChassi,
      fallback.groupByChassi ?? false,
    ),
  };
}

export function loadTicketFilters(
  key: string,
  fallback: TicketFiltersState = INITIAL_TICKET_FILTERS,
): TicketFiltersState {
  if (!isBrowser) {
    return fallback;
  }
  const parsed = safeParse(window.localStorage.getItem(key));
  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }
  const data = parsed as Partial<TicketFiltersState>;
  return {
    search: asString(data.search, fallback.search),
    status: asString(
      data.status,
      fallback.status,
    ) as TicketFiltersState["status"],
    sort: asSortOrder(data.sort, fallback.sort),
    groupByEmpresa: asBoolean(data.groupByEmpresa, fallback.groupByEmpresa),
    groupByChassi: asBoolean(data.groupByChassi, fallback.groupByChassi),
    consultor: asString(data.consultor, fallback.consultor),
    cliente: asString(data.cliente, fallback.cliente),
    equipe: asString(data.equipe, fallback.equipe),
  };
}

export function saveFilters(key: string, value: unknown): void {
  if (!isBrowser) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}
