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
  loading: boolean;
  error: string | null;
};

type ScheduleContextValue = ScheduleState & {
  setRange: (range: { startAt: Date; endAt: Date }) => void;
  refresh: () => Promise<void>;
  getCompany: (id: string) => Company | undefined;
  getAppointment: (id: string) => Appointment | undefined;
};

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

const sortAppointments = (items: Appointment[]) =>
  [...items].sort((a, b) => a.startAt.localeCompare(b.startAt));

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ScheduleState>(() => {
    const range = normalizeRange(getWeekRange(new Date()));
    return {
      range,
      appointments: [],
      companies: [],
      loading: true,
      error: null,
    };
  });
  const requestIdRef = useRef(0);

  const loadSchedule = useCallback(
    async (range: ScheduleRange) => {
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

        if (user?.id) {
          appointmentsQuery = appointmentsQuery.eq("consultant_id", user.id);
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
    [supabase, user?.id],
  );

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
    await loadSchedule(state.range);
  }, [loadSchedule, state.range]);

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
    void loadSchedule(state.range);
  }, [authLoading, loadSchedule, state.range]);

  const value = useMemo<ScheduleContextValue>(
    () => ({
      ...state,
      setRange,
      refresh,
      getCompany,
      getAppointment,
    }),
    [state, setRange, refresh, getCompany, getAppointment],
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
