"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSchedule } from "@/contexts/ScheduleContext";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

type FilterOption = {
  value: string;
  label: string;
};

type FilterOptionsContextValue = {
  consultantOptions: FilterOption[];
  consultantOptionValues: string[];
  actorOptions: FilterOption[];
  actorOptionValues: string[];
  actorOptionsLoading: boolean;
};

type ActorRow = {
  created_by: string | null;
};

const FilterOptionsContext = createContext<FilterOptionsContextValue | null>(
  null,
);

const formatActorLabel = (value: string) => {
  const raw = value.trim();
  if (!raw.includes("@")) return raw;
  return raw
    .split("@")[0]!
    .split(".")
    .filter(Boolean)
    .map((part) =>
      part
        .split("-")
        .map((token) =>
          token ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase() : "",
        )
        .join("-"),
    )
    .join(" ");
};

export function FilterOptionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { consultants } = useSchedule();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const requestIdRef = useRef(0);
  const [actorOptions, setActorOptions] = useState<FilterOption[]>([]);
  const [actorOptionsLoading, setActorOptionsLoading] = useState(true);

  const consultantOptions = useMemo(
    () => consultants.map((item) => ({ value: item.id, label: item.name })),
    [consultants],
  );
  const consultantOptionValues = useMemo(
    () => consultantOptions.map((item) => item.value),
    [consultantOptions],
  );
  const actorOptionValues = useMemo(
    () => actorOptions.map((item) => item.value),
    [actorOptions],
  );

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const loadActorOptions = async () => {
      setActorOptionsLoading(true);
      try {
        const { data, error } = await supabase
          .from("apontamento_acoes")
          .select("created_by")
          .order("created_by", { ascending: true });

        if (requestId !== requestIdRef.current) return;

        if (error) {
          console.error(error);
          setActorOptions([]);
          setActorOptionsLoading(false);
          return;
        }

        const counts = new Map<string, number>();
        ((data ?? []) as ActorRow[]).forEach((row) => {
          const actor = row.created_by?.trim().toLowerCase();
          if (!actor) return;
          counts.set(actor, (counts.get(actor) ?? 0) + 1);
        });

        const nextActorOptions = Array.from(counts.entries())
          .map(([value, count]) => ({
            value,
            label: formatActorLabel(value),
            count,
          }))
          .sort(
            (a, b) =>
              b.count - a.count || a.label.localeCompare(b.label, "pt-BR"),
          )
          .map(({ value, label }) => ({ value, label }));

        setActorOptions(nextActorOptions);
        setActorOptionsLoading(false);
      } catch (error) {
        console.error(error);
        if (requestId !== requestIdRef.current) return;
        setActorOptions([]);
        setActorOptionsLoading(false);
      }
    };

    void loadActorOptions();
  }, [supabase]);

  const value = useMemo<FilterOptionsContextValue>(
    () => ({
      consultantOptions,
      consultantOptionValues,
      actorOptions,
      actorOptionValues,
      actorOptionsLoading,
    }),
    [
      actorOptions,
      actorOptionValues,
      actorOptionsLoading,
      consultantOptions,
      consultantOptionValues,
    ],
  );

  return (
    <FilterOptionsContext.Provider value={value}>
      {children}
    </FilterOptionsContext.Provider>
  );
}

export function useFilterOptions(): FilterOptionsContextValue {
  const context = useContext(FilterOptionsContext);
  if (!context) {
    throw new Error(
      "useFilterOptions deve ser usado dentro de <FilterOptionsProvider />",
    );
  }
  return context;
}
