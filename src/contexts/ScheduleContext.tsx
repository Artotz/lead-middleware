"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  APPOINTMENT_LIST_SELECT,
  COMPANY_LIST_SELECT,
  type Appointment,
  type Company,
  type ScheduleRange,
  getWeekRange,
  mapAppointment,
  mapCompany,
  normalizeRange,
} from "@/lib/schedule";

type ScheduleState = {
  range: ScheduleRange;
  appointments: Appointment[];
  companies: Company[];
  consultants: Consultant[];
  selectedConsultantId: string | null;
  loading: boolean;
  error: string | null;
};

type ScheduleContextValue = ScheduleState & {
  setRange: (range: { startAt: Date; endAt: Date }) => void;
  refresh: () => Promise<void>;
  getCompany: (id: string) => Company | undefined;
  getAppointment: (id: string) => Appointment | undefined;
  setSelectedConsultantId: (id: string | null) => void;
};

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

const sortAppointments = (items: Appointment[]) =>
  [...items].sort((a, b) => a.startAt.localeCompare(b.startAt));

type Consultant = {
  id: string;
  name: string;
};

type ConsultantRow = {
  csa: string | null;
  email_csa: string | null;
};

const normalizeConsultantName = (
  name: string | null | undefined,
  fallback: string,
) => name?.trim() || fallback || "Consultor sem nome";
const normalizeConsultantKey = (value: string | null | undefined) =>
  value?.trim() ?? "";

const mergeConsultant = (
  map: Map<string, string>,
  id: string,
  name: string | null | undefined,
) => {
  const normalized = name?.trim() || "";
  const fallback = "Consultor sem nome";
  const current = map.get(id);

  if (!current) {
    map.set(id, normalized || fallback);
    return;
  }

  if (current === fallback && normalized) {
    map.set(id, normalized);
  }
};

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user, loading: authLoading } = useAuth();
  const [consultantsLoaded, setConsultantsLoaded] = useState(false);
  const [state, setState] = useState<ScheduleState>(() => {
    const range = normalizeRange(getWeekRange(new Date()));
    return {
      range,
      appointments: [],
      companies: [],
      consultants: [],
      selectedConsultantId: null,
      loading: true,
      error: null,
    };
  });
  const requestIdRef = useRef(0);
  const consultantsRequestIdRef = useRef(0);
  const companiesRequestIdRef = useRef(0);

  const applyConsultantFilter = useCallback(
    (query: any, consultantId: string | null) => {
      const normalized = consultantId?.trim();
      if (!normalized) return query;
      const safe = normalized.replace(/,/g, "\\,");
      if (normalized.includes("@")) {
        return query.ilike("email_csa", `%${safe}%`);
      }
      return query.or(`csa.ilike.%${safe}%,email_csa.ilike.%${safe}%`);
    },
    [],
  );

  const loadSchedule = useCallback(
    async (range: ScheduleRange, consultantId: string | null) => {
      const requestId = ++requestIdRef.current;
      const companiesRequestId = ++companiesRequestIdRef.current;
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        if (!consultantId?.trim()) {
          setState((prev) => ({
            ...prev,
            loading: false,
            appointments: [],
            companies: [],
          }));
          return;
        }

        let companiesQuery = supabase
          .from("companies")
          .select(COMPANY_LIST_SELECT)
          .order("name", { ascending: true });
        companiesQuery = applyConsultantFilter(companiesQuery, consultantId);

        let appointmentsQuery = supabase
          .from("apontamentos")
          .select(APPOINTMENT_LIST_SELECT)
          .gte("starts_at", range.startIso)
          .lte("starts_at", range.endIso)
          .order("starts_at", { ascending: true });

        if (consultantId) {
          const normalizedConsultantId = consultantId.trim();
          if (normalizedConsultantId.includes("@")) {
            appointmentsQuery = appointmentsQuery.eq(
              "consultant_name",
              normalizedConsultantId,
            );
          } else {
            appointmentsQuery = appointmentsQuery.eq(
              "consultant_id",
              normalizedConsultantId,
            );
          }
        }

        const [companiesResp, appointmentsResp] = await Promise.all([
          companiesQuery,
          appointmentsQuery,
        ]);

        if (
          requestId !== requestIdRef.current ||
          companiesRequestId !== companiesRequestIdRef.current
        ) {
          return;
        }

        if (companiesResp.error || appointmentsResp.error) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "Nao foi possivel carregar o cronograma.",
            appointments: [],
            companies: [],
          }));
          return;
        }

        const companies = (companiesResp.data ?? []).map(mapCompany);
        const appointments = sortAppointments(
          (appointmentsResp.data ?? []).map(mapAppointment),
        );

        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          appointments,
          companies,
        }));
      } catch (error) {
        console.error(error);
        if (requestId !== requestIdRef.current) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Nao foi possivel carregar o cronograma.",
        }));
      }
    },
    [supabase],
  );

  const loadConsultants = useCallback(async () => {
    const requestId = ++consultantsRequestIdRef.current;

    try {
      const consultantsResp = await supabase
        .from("companies")
        .select("csa, email_csa")
        .order("csa", { ascending: true });

      if (requestId !== consultantsRequestIdRef.current) return;

      if (consultantsResp.error) {
        console.error(consultantsResp.error);
        return;
      }

      const rows = (consultantsResp.data ?? []) as ConsultantRow[];
      const map = new Map<string, string>();
      for (const row of rows) {
        const consultantId =
          normalizeConsultantKey(row.email_csa) ||
          normalizeConsultantKey(row.csa);
        if (!consultantId) continue;
        mergeConsultant(map, consultantId, row.csa ?? row.email_csa);
      }

      const consultants = Array.from(map, ([id, name]) => ({
        id,
        name: normalizeConsultantName(name, id),
      })).sort((a, b) => a.name.localeCompare(b.name));

      setState((prev) => {
        const keepSelected =
          prev.selectedConsultantId &&
          consultants.some((item) => item.id === prev.selectedConsultantId)
            ? prev.selectedConsultantId
            : null;
        const normalizedUserEmail = user?.email?.trim().toLowerCase() ?? "";
        const userCandidate = normalizedUserEmail
          ? consultants.find(
              (item) => item.id.toLowerCase() === normalizedUserEmail,
            )?.id ?? null
          : null;
        const selectedConsultantId =
          keepSelected ?? userCandidate ?? consultants[0]?.id ?? null;
        return {
          ...prev,
          consultants,
          selectedConsultantId,
        };
      });
    } catch (error) {
      console.error(error);
    } finally {
      if (requestId === consultantsRequestIdRef.current) {
        setConsultantsLoaded(true);
      }
    }
  }, [supabase, user?.email]);

  const setRange = useCallback((range: { startAt: Date; endAt: Date }) => {
    const normalized = normalizeRange(range);
    setState((prev) => {
      if (
        prev.range.startIso === normalized.startIso &&
        prev.range.endIso === normalized.endIso
      ) {
        return prev;
      }
      return { ...prev, range: normalized };
    });
  }, []);

  const refresh = useCallback(async () => {
    const consultantId = state.selectedConsultantId ?? null;
    await Promise.all([
      loadConsultants(),
      loadSchedule(state.range, consultantId),
    ]);
  }, [
    loadConsultants,
    loadSchedule,
    state.range,
    state.selectedConsultantId,
  ]);

  const setSelectedConsultantId = useCallback((id: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedConsultantId: id,
    }));
  }, []);

  const getCompany = useCallback(
    (id: string) => state.companies.find((company) => company.id === id),
    [state.companies],
  );

  const getAppointment = useCallback(
    (id: string) => state.appointments.find((item) => item.id === id),
    [state.appointments],
  );

  useEffect(() => {
    if (authLoading) return;
    void loadConsultants();
  }, [authLoading, loadConsultants]);

  useEffect(() => {
    if (authLoading) return;
    if (!consultantsLoaded) return;
    void loadSchedule(state.range, state.selectedConsultantId ?? null);
  }, [
    authLoading,
    consultantsLoaded,
    loadSchedule,
    state.range,
    state.selectedConsultantId,
  ]);

  const value = useMemo<ScheduleContextValue>(
    () => ({
      ...state,
      setRange,
      refresh,
      getCompany,
      getAppointment,
      setSelectedConsultantId,
    }),
    [state, setRange, refresh, getCompany, getAppointment, setSelectedConsultantId],
  );

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule(): ScheduleContextValue {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error("useSchedule deve ser usado dentro de <ScheduleProvider />");
  }
  return ctx;
}
