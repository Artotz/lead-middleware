"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import { Badge } from "@/components/Badge";
import { ActionModal } from "@/components/ActionModal";
import { PageShell } from "@/components/PageShell";
import type { ActionDefinition, EventPayload } from "@/lib/events";

type ScheduleType =
  | "Inspecao"
  | "Revisao"
  | "Manutencao"
  | "Entrega"
  | "Treinamento"
  | "Visita"
  | "Instalacao";

type ScheduleStatus = "Confirmado" | "Pendente" | "Critico";

type ScheduleItem = {
  id: string;
  time: string;
  duration: string;
  title: string;
  client: string;
  location: string;
  lat: number;
  lng: number;
  consultant: string;
  type: ScheduleType;
  status: ScheduleStatus;
};

type BadgeTone = NonNullable<Parameters<typeof Badge>[0]["tone"]>;
type ScheduleAction = "mark_done";
type FortalezaStop = Pick<ScheduleItem, "location" | "lat" | "lng">;

type ScheduleDay = {
  id: string;
  label: string;
  dateLabel: string;
  tone: BadgeTone;
  items: ScheduleItem[];
};

const typeTone: Record<ScheduleType, BadgeTone> = {
  Inspecao: "sky",
  Revisao: "amber",
  Manutencao: "violet",
  Entrega: "emerald",
  Treinamento: "slate",
  Visita: "stone",
  Instalacao: "sky",
};

const statusTone: Record<ScheduleStatus, BadgeTone> = {
  Confirmado: "emerald",
  Pendente: "amber",
  Critico: "rose",
};

const weekDayIds = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;

const FORTALEZA_CENTER: [number, number] = [-3.7319, -38.5267];
const FORTALEZA_ZOOM = 12;
const FORTALEZA_STOPS: FortalezaStop[] = [
  { location: "Meireles / Fortaleza - CE", lat: -3.7298, lng: -38.4977 },
  { location: "Aldeota / Fortaleza - CE", lat: -3.7463, lng: -38.4998 },
  { location: "Varjota / Fortaleza - CE", lat: -3.7386, lng: -38.4868 },
  { location: "Praia de Iracema / Fortaleza - CE", lat: -3.7196, lng: -38.5176 },
  { location: "Benfica / Fortaleza - CE", lat: -3.7409, lng: -38.5326 },
  { location: "Papicu / Fortaleza - CE", lat: -3.7368, lng: -38.4737 },
  { location: "Montese / Fortaleza - CE", lat: -3.7711, lng: -38.5311 },
  { location: "Centro / Fortaleza - CE", lat: -3.7295, lng: -38.5273 },
  { location: "Coco / Fortaleza - CE", lat: -3.7551, lng: -38.4732 },
  { location: "Dionisio Torres / Fortaleza - CE", lat: -3.7482, lng: -38.5001 },
  { location: "Edson Queiroz / Fortaleza - CE", lat: -3.7852, lng: -38.4753 },
  { location: "Cidade 2000 / Fortaleza - CE", lat: -3.7472, lng: -38.4562 },
  { location: "Messejana / Fortaleza - CE", lat: -3.8222, lng: -38.4925 },
  { location: "Maraponga / Fortaleza - CE", lat: -3.7769, lng: -38.5628 },
  { location: "Barra do Ceara / Fortaleza - CE", lat: -3.7081, lng: -38.5907 },
  { location: "Passare / Fortaleza - CE", lat: -3.8112, lng: -38.5173 },
];

const SCHEDULE_ACTIONS: ActionDefinition<ScheduleAction>[] = [
  {
    id: "mark_done",
    label: "Marcar como feito",
    description: "Marca o agendamento como feito.",
    hideNote: true,
  },
];

const weekSchedule: ScheduleDay[] = [
  {
    id: "seg",
    label: "Segunda",
    dateLabel: "15 Jan",
    tone: "sky",
    items: [
      {
        id: "seg-1",
        time: "08:00",
        duration: "1h30",
        title: "Inspecao preventiva - D8T",
        client: "Construtora Vale",
        consultant: "Carlos Lima",
        type: "Inspecao",
        status: "Confirmado",
        ...FORTALEZA_STOPS[0],
      },
      {
        id: "seg-2",
        time: "10:30",
        duration: "1h",
        title: "Revisao de garantia - 320GX",
        client: "Mineradora Azul",
        consultant: "Marina Souza",
        type: "Revisao",
        status: "Pendente",
        ...FORTALEZA_STOPS[1],
      },
      {
        id: "seg-3",
        time: "14:00",
        duration: "2h",
        title: "Entrega de laudo - 140K",
        client: "Logistica Norte",
        consultant: "Carlos Lima",
        type: "Entrega",
        status: "Confirmado",
        ...FORTALEZA_STOPS[2],
      },
    ],
  },
  {
    id: "ter",
    label: "Terca",
    dateLabel: "16 Jan",
    tone: "sky",
    items: [
      {
        id: "ter-1",
        time: "09:00",
        duration: "2h",
        title: "Manutencao programada - 938K",
        client: "Construtora Delta",
        consultant: "Paulo Reis",
        type: "Manutencao",
        status: "Confirmado",
        ...FORTALEZA_STOPS[3],
      },
      {
        id: "ter-2",
        time: "13:30",
        duration: "1h",
        title: "Visita comercial - Frota CAT",
        client: "Transporte Sol",
        consultant: "Ana Cruz",
        type: "Visita",
        status: "Pendente",
        ...FORTALEZA_STOPS[4],
      },
    ],
  },
  {
    id: "qua",
    label: "Quarta",
    dateLabel: "17 Jan",
    tone: "sky",
    items: [
      {
        id: "qua-1",
        time: "07:30",
        duration: "1h",
        title: "Checklist de entrega - 320",
        client: "Terraplenagem Lima",
        consultant: "Juliana Prado",
        type: "Entrega",
        status: "Confirmado",
        ...FORTALEZA_STOPS[5],
      },
      {
        id: "qua-2",
        time: "09:30",
        duration: "1h30",
        title: "Treinamento operador - 950L",
        client: "Mina Serra",
        consultant: "Rafael Dias",
        type: "Treinamento",
        status: "Confirmado",
        ...FORTALEZA_STOPS[6],
      },
      {
        id: "qua-3",
        time: "13:00",
        duration: "2h",
        title: "Inspecao de seguranca - 336",
        client: "Pedreira Oeste",
        consultant: "Juliana Prado",
        type: "Inspecao",
        status: "Critico",
        ...FORTALEZA_STOPS[7],
      },
      {
        id: "qua-4",
        time: "16:00",
        duration: "1h",
        title: "Revisao pos-venda - 416F",
        client: "Agro Campo",
        consultant: "Rafael Dias",
        type: "Revisao",
        status: "Pendente",
        ...FORTALEZA_STOPS[8],
      },
    ],
  },
  {
    id: "qui",
    label: "Quinta",
    dateLabel: "18 Jan",
    tone: "sky",
    items: [
      {
        id: "qui-1",
        time: "08:30",
        duration: "1h",
        title: "Instalacao telemetria - D6R",
        client: "Construtora Horizonte",
        consultant: "Carlos Lima",
        type: "Instalacao",
        status: "Confirmado",
        ...FORTALEZA_STOPS[9],
      },
      {
        id: "qui-2",
        time: "15:30",
        duration: "1h30",
        title: "Manutencao emergencia - 988H",
        client: "Porto Seco",
        consultant: "Paulo Reis",
        type: "Manutencao",
        status: "Critico",
        ...FORTALEZA_STOPS[10],
      },
    ],
  },
  {
    id: "sex",
    label: "Sexta",
    dateLabel: "19 Jan",
    tone: "sky",
    items: [
      {
        id: "sex-1",
        time: "08:00",
        duration: "1h",
        title: "Revisao trimestral - 140M",
        client: "Prefeitura Sul",
        consultant: "Marina Souza",
        type: "Revisao",
        status: "Confirmado",
        ...FORTALEZA_STOPS[11],
      },
      {
        id: "sex-2",
        time: "11:00",
        duration: "2h",
        title: "Inspecao preventiva - 950H",
        client: "Rodovias Minas",
        consultant: "Ana Cruz",
        type: "Inspecao",
        status: "Confirmado",
        ...FORTALEZA_STOPS[12],
      },
      {
        id: "sex-3",
        time: "15:00",
        duration: "1h",
        title: "Visita de follow-up - 312D",
        client: "Rural Terra",
        consultant: "Ana Cruz",
        type: "Visita",
        status: "Pendente",
        ...FORTALEZA_STOPS[13],
      },
    ],
  },
  {
    id: "sab",
    label: "Sabado",
    dateLabel: "20 Jan",
    tone: "sky",
    items: [
      {
        id: "sab-1",
        time: "09:00",
        duration: "1h30",
        title: "Manutencao leve - 420F",
        client: "Cia Estradas",
        consultant: "Paulo Reis",
        type: "Manutencao",
        status: "Confirmado",
        ...FORTALEZA_STOPS[14],
      },
      {
        id: "sab-2",
        time: "11:30",
        duration: "1h",
        title: "Entrega de checklist - 320",
        client: "Construtora Vale",
        consultant: "Carlos Lima",
        type: "Entrega",
        status: "Confirmado",
        ...FORTALEZA_STOPS[15],
      },
    ],
  },
  {
    id: "dom",
    label: "Domingo",
    dateLabel: "21 Jan",
    tone: "sky",
    items: [],
  },
];

const totalAppointments = weekSchedule.reduce(
  (total, day) => total + day.items.length,
  0
);

function ScheduleCard({
  item,
  order,
  onSelect,
}: {
  item: ScheduleItem;
  order: number;
  onSelect: (item: ScheduleItem) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
      aria-label={`Abrir acoes do agendamento ${item.title}`}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-2 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-start gap-1.5">
          <input
            type="checkbox"
            defaultChecked={item.status === "Confirmado"}
            aria-label={`Marcar agendamento ${item.title}`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            className="mt-0.5 h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <Badge tone="slate">#{order}</Badge>
        </div>
        <div className="text-right text-[10px] text-slate-400">
          <div className="font-semibold text-slate-600">{item.time}</div>
          <div>{item.duration}</div>
        </div>
      </div>

      <div className="mt-2 min-w-0">
        <div className="text-xs font-semibold text-slate-900 line-clamp-2">
          {item.title}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
          {item.client}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge tone={typeTone[item.type]}>{item.type}</Badge>
        <Badge tone={statusTone[item.status]}>{item.status}</Badge>
      </div>

      <div className="mt-2 space-y-0.5 text-[11px] text-slate-600">
        <div>{item.location}</div>
        <div>Consultor: {item.consultant}</div>
      </div>
    </div>
  );
}

type RoutingControlOptions = {
  waypoints: LatLngExpression[];
  show: boolean;
  addWaypoints: boolean;
  routeWhileDragging: boolean;
  draggableWaypoints: boolean;
  fitSelectedRoutes: boolean;
  lineOptions?: {
    styles: Array<{ color: string; weight: number; opacity: number }>;
  };
};

type RoutingControl = {
  addTo: (map: LeafletMap) => RoutingControl;
  setWaypoints: (waypoints: LatLngExpression[]) => void;
  remove: () => void;
};

type LeafletWithRouting = typeof import("leaflet") & {
  Routing?: {
    control: (options: RoutingControlOptions) => RoutingControl;
  };
};

type ScheduleMapViewProps = {
  points: ScheduleItem[];
  visible: boolean;
};

function ScheduleMapView({ points, visible }: ScheduleMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const routingRef = useRef<RoutingControl | null>(null);
  const leafletRef = useRef<LeafletWithRouting | null>(null);

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      if (!containerRef.current || mapRef.current) return;

      await import("leaflet/dist/leaflet-src.js");
      await import("leaflet-routing-machine/dist/leaflet-routing-machine.js");

      const L = (globalThis as typeof globalThis & {
        L?: LeafletWithRouting;
      }).L;

      if (!L?.Routing?.control) {
        throw new Error("Leaflet Routing Machine not available.");
      }

      if (!mounted || !containerRef.current) return;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        center: FORTALEZA_CENTER,
        zoom: FORTALEZA_ZOOM,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const routing = L.Routing.control({
        waypoints: [],
        show: false,
        addWaypoints: false,
        routeWhileDragging: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        lineOptions: {
          styles: [{ color: "#0ea5e9", weight: 4, opacity: 0.85 }],
        },
      }).addTo(map);

      mapRef.current = map;
      routingRef.current = routing;
      leafletRef.current = L;
    };

    void initMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (routingRef.current) {
        routingRef.current.remove();
        routingRef.current = null;
      }
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const routing = routingRef.current;
    if (!map || !routing) return;

    if (!points.length) {
      routing.setWaypoints([]);
      map.setView(FORTALEZA_CENTER, FORTALEZA_ZOOM);
      return;
    }

    const waypoints = points.map(
      (point) => [point.lat, point.lng] as LatLngExpression
    );
    routing.setWaypoints(waypoints);
  }, [points]);

  useEffect(() => {
    if (!visible) return;
    const map = mapRef.current;
    if (!map) return;
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [visible]);

  const overlayMessage =
    points.length === 0
      ? "Nenhum agendamento para esse dia."
      : points.length === 1
        ? "Somente um agendamento para esse dia."
        : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div ref={containerRef} className="h-[520px] w-full bg-slate-100" />
      {overlayMessage ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
            {overlayMessage}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CronogramaClient() {
  const todayId = weekDayIds[new Date().getDay()];
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "map">("board");
  const [selectedDayId, setSelectedDayId] =
    useState<ScheduleDay["id"]>(todayId);

  const selectedDay = useMemo(
    () => weekSchedule.find((day) => day.id === selectedDayId) ?? weekSchedule[0],
    [selectedDayId]
  );

  const handleSelectItem = (item: ScheduleItem) => {
    setSelectedItem(item);
    setActionOpen(true);
  };

  const handleCloseAction = () => {
    setActionOpen(false);
    setActionError(null);
    setSelectedItem(null);
  };

  const handleConfirmAction = async (
    action: ScheduleAction,
    _payload: EventPayload
  ) => {
    if (!selectedItem) return;

    setActionLoading(true);
    setActionError(null);
    try {
      if (action === "mark_done") {
        setActionOpen(false);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error(error);
      setActionError("Nao foi possivel registrar a acao.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <PageShell
      title="Cronograma semanal"
      subtitle="Agendamentos mockados por dia, em ordem de execucao."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Semana atual</span>
              <span>{totalAppointments} agendamentos</span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-semibold">
              {[
                { id: "board", label: "Quadro" },
                { id: "map", label: "Mapa" },
              ].map((tab) => {
                const isActive = viewMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setViewMode(tab.id as "board" | "map")
                    }
                    className={`rounded-md px-2 py-1 transition ${
                      isActive
                        ? "bg-sky-100 text-sky-800"
                        : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {weekSchedule.map((day) => {
              const isActive = day.id === selectedDayId;
              const isToday = day.id === todayId;
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                  className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                    isActive
                      ? "border-sky-300 bg-sky-100 text-sky-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  } ${isToday ? "ring-1 ring-emerald-200" : ""}`}
                >
                  <span>{day.label}</span>
                  <span className="ml-1 text-[10px] text-slate-400">
                    {day.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {viewMode === "board" ? (
          <div className="mt-3 overflow-x-auto pb-1">
            <div className="flex min-w-full gap-1">
              {weekSchedule.map((day) => {
                const isToday = day.id === todayId;

                return (
                  <div
                    key={day.id}
                    className={`min-w-[170px] max-w-[220px] flex-1 rounded-xl border p-1 ${
                      isToday
                        ? "border-sky-200 bg-sky-100/80"
                        : "border-transparent"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between rounded-lg border px-2 py-1.5 shadow-sm ${
                        isToday
                          ? "border-sky-200 bg-sky-50 ring-2 ring-sky-200"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge tone={day.tone}>{day.label}</Badge>
                          {isToday ? <Badge tone="emerald">Hoje</Badge> : null}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {day.dateLabel}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {day.items.length}
                      </span>
                    </div>

                    <div className="mt-2 space-y-2">
                      {day.items.length ? (
                        day.items.map((item, index) => (
                          <ScheduleCard
                            key={item.id}
                            item={item}
                            order={index + 1}
                            onSelect={handleSelectItem}
                          />
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-2 py-4 text-center text-[11px] text-slate-400">
                          Sem agendamentos.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <ScheduleMapView
              points={selectedDay?.items ?? []}
              visible={viewMode === "map"}
            />
          </div>
        )}
      </div>

      <ActionModal<ScheduleAction>
        open={actionOpen}
        entity="lead"
        actions={SCHEDULE_ACTIONS}
        defaultAction="mark_done"
        onClose={handleCloseAction}
        onConfirm={handleConfirmAction}
        loading={actionLoading}
        error={actionError}
      />
    </PageShell>
  );
}
