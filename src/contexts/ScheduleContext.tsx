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

type CheckInPayload = {
  at: Date;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
};

type CheckOutPayload = {
  at: Date;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  oportunidades: string[];
};

type ScheduleContextValue = ScheduleState & {
  setRange: (range: { startAt: Date; endAt: Date }) => void;
  refresh: () => Promise<void>;
  getCompany: (id: string) => Company | undefined;
  getAppointment: (id: string) => Appointment | undefined;
  checkIn: (id: string, payload: CheckInPayload) => Promise<Appointment>;
  checkOut: (id: string, payload: CheckOutPayload) => Promise<Appointment>;
  justifyAbsence: (
    id: string,
    reason: string,
    note?: string | null,
  ) => Promise<Appointment>;
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

  const updateAppointment = useCallback(
    async (id: string, changes: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from("apontamentos")
        .update(changes)
        .eq("id", id)
        .select(APPOINTMENT_SELECT)
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "update_failed");
      }

      const updated = mapAppointment(data);
      setState((prev) => {
        const index = prev.appointments.findIndex((item) => item.id === id);
        const nextAppointments = [...prev.appointments];
        if (index >= 0) {
          nextAppointments[index] = updated;
        } else {
          nextAppointments.push(updated);
        }
        return { ...prev, appointments: sortAppointments(nextAppointments) };
      });
      return updated;
    },
    [supabase],
  );

  const checkIn = useCallback(
    async (id: string, payload: CheckInPayload) =>
      updateAppointment(id, {
        check_in_at: payload.at.toISOString(),
        check_in_lat: payload.lat,
        check_in_lng: payload.lng,
        check_in_accuracy_m: payload.accuracy,
        status: "in_progress",
      }),
    [updateAppointment],
  );

  const checkOut = useCallback(
    async (id: string, payload: CheckOutPayload) =>
      updateAppointment(id, {
        check_out_at: payload.at.toISOString(),
        check_out_lat: payload.lat,
        check_out_lng: payload.lng,
        check_out_accuracy_m: payload.accuracy,
        status: "done",
        oportunidades: payload.oportunidades,
      }),
    [updateAppointment],
  );

  const justifyAbsence = useCallback(
    async (id: string, reason: string, note?: string | null) =>
      updateAppointment(id, {
        absence_reason: reason,
        absence_note: note ?? null,
        status: "absent",
      }),
    [updateAppointment],
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
      checkIn,
      checkOut,
      justifyAbsence,
    }),
    [
      state,
      setRange,
      refresh,
      getCompany,
      getAppointment,
      checkIn,
      checkOut,
      justifyAbsence,
    ],
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
