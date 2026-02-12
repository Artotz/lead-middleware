"use client";

import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import type { Appointment, Company } from "@/lib/schedule";

type MapPointType = "company" | "check_in" | "check_out";

type MapPoint = {
  id: string;
  type: MapPointType;
  lat: number;
  lng: number;
  label: string;
};

type ScheduleMapViewProps = {
  appointments: Appointment[];
  companies: Company[];
  showCompanies: boolean;
  showCheckIns: boolean;
  showCheckOuts: boolean;
  visible?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
};

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;

const markerStyles: Record<MapPointType, { color: string; fill: string }> = {
  company: { color: "#0284c7", fill: "#38bdf8" },
  check_in: { color: "#059669", fill: "#34d399" },
  check_out: { color: "#e11d48", fill: "#fb7185" },
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    const bounds = latLngBounds(points.map((point) => [point.lat, point.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
    }
  }, [map, points]);

  return null;
}

function MapInvalidator({ visible }: { visible: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!visible) return;
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [map, visible]);

  return null;
}

export function ScheduleMapView({
  appointments,
  companies,
  showCompanies,
  showCheckIns,
  showCheckOuts,
  visible = false,
  loading = false,
  error = null,
  emptyMessage = "Sem coordenadas para exibir no mapa.",
}: ScheduleMapViewProps) {
  const points = useMemo<MapPoint[]>(() => {
    const list: MapPoint[] = [];
    const companyById = new Map(companies.map((company) => [company.id, company]));

    if (showCompanies) {
      const seen = new Set<string>();
      appointments.forEach((appointment) => {
        if (seen.has(appointment.companyId)) return;
        const company = companyById.get(appointment.companyId);
        if (!company) return;
        if (!isFiniteNumber(company.lat) || !isFiniteNumber(company.lng)) return;
        seen.add(appointment.companyId);
        list.push({
          id: `company-${company.id}`,
          type: "company",
          lat: company.lat,
          lng: company.lng,
          label: company.name,
        });
      });
    }

    if (showCheckIns) {
      appointments.forEach((appointment) => {
        if (
          !isFiniteNumber(appointment.checkInLat) ||
          !isFiniteNumber(appointment.checkInLng)
        ) {
          return;
        }
        list.push({
          id: `checkin-${appointment.id}`,
          type: "check_in",
          lat: appointment.checkInLat,
          lng: appointment.checkInLng,
          label: `Check-in ${appointment.id.slice(0, 6)}`,
        });
      });
    }

    if (showCheckOuts) {
      appointments.forEach((appointment) => {
        if (
          !isFiniteNumber(appointment.checkOutLat) ||
          !isFiniteNumber(appointment.checkOutLng)
        ) {
          return;
        }
        list.push({
          id: `checkout-${appointment.id}`,
          type: "check_out",
          lat: appointment.checkOutLat,
          lng: appointment.checkOutLng,
          label: `Check-out ${appointment.id.slice(0, 6)}`,
        });
      });
    }

    return list;
  }, [appointments, companies, showCompanies, showCheckIns, showCheckOuts]);

  const overlayMessage = error
    ? error
    : loading
      ? "Carregando mapa..."
      : points.length === 0
        ? emptyMessage
        : null;

  return (
    <div className="relative z-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-[320px] w-full bg-slate-100 sm:h-[420px] lg:h-[520px]"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        <MapInvalidator visible={visible} />
        {points.map((point) => {
          const style = markerStyles[point.type];
          return (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={8}
              pathOptions={{
                color: style.color,
                fillColor: style.fill,
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {point.label}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
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
