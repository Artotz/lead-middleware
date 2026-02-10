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
  APPOINTMENT_SELECT,
  COMPANY_SELECT,
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
  consultant_id: string | null;
  consultant_name: string | null;
};

const normalizeConsultantName = (name: string | null | undefined) =>
  name?.trim() || "Consultor sem nome";

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

  const loadSchedule = useCallback(
    async (range: ScheduleRange, consultantId: string | null) => {
      const requestId = ++requestIdRef.current;
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const companiesQuery = supabase
          .from("companies")
          .select(COMPANY_SELECT)
          .order("name", { ascending: true });

        let appointmentsQuery = supabase
          .from("apontamentos")
          .select(APPOINTMENT_SELECT)
          .gte("starts_at", range.startIso)
          .lte("starts_at", range.endIso)
          .order("starts_at", { ascending: true });

        if (consultantId) {
          appointmentsQuery = appointmentsQuery.eq("consultant_id", consultantId);
        }

        const [companiesResp, appointmentsResp] = await Promise.all([
          companiesQuery,
          appointmentsQuery,
        ]);

        if (requestId !== requestIdRef.current) return;

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
        .from("apontamentos")
        .select("consultant_id, consultant_name")
        .order("consultant_name", { ascending: true });

      if (requestId !== consultantsRequestIdRef.current) return;

      if (consultantsResp.error) {
        console.error(consultantsResp.error);
        return;
      }

      const rows = (consultantsResp.data ?? []) as ConsultantRow[];
      const map = new Map<string, string>();
      for (const row of rows) {
        const consultantId = row.consultant_id;
        if (!consultantId) continue;
        mergeConsultant(map, consultantId, row.consultant_name);
      }

      const consultants = Array.from(map, ([id, name]) => ({
        id,
        name: normalizeConsultantName(name),
      })).sort((a, b) => a.name.localeCompare(b.name));

      setState((prev) => {
        const keepSelected =
          prev.selectedConsultantId &&
          consultants.some((item) => item.id === prev.selectedConsultantId)
            ? prev.selectedConsultantId
            : null;
        const userCandidate =
          user?.id && consultants.some((item) => item.id === user.id)
            ? user.id
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
    }
  }, [supabase, user?.id]);

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
    const consultantId = state.selectedConsultantId ?? user?.id ?? null;
    await Promise.all([
      loadConsultants(),
      loadSchedule(state.range, consultantId),
    ]);
  }, [
    loadConsultants,
    loadSchedule,
    state.range,
    state.selectedConsultantId,
    user?.id,
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
    void loadSchedule(state.range, state.selectedConsultantId ?? user?.id ?? null);
  }, [
    authLoading,
    loadSchedule,
    state.range,
    state.selectedConsultantId,
    user?.id,
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
