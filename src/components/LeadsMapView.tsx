"use client";

import { useEffect, useMemo, useRef } from "react";
import type { LatLngBounds, Layer, Map as LeafletMap } from "leaflet";
import { Lead } from "@/lib/domain";

type MarkerClusterGroup = Layer & {
  addLayer: (layer: Layer) => void;
  clearLayers: () => void;
  getBounds: () => LatLngBounds;
};

type LeafletWithCluster = typeof import("leaflet") & {
  markerClusterGroup: (options?: Record<string, unknown>) => MarkerClusterGroup;
};

type LeadsMapViewProps = {
  leads: Lead[];
  onLeadSelect?: (lead: Lead) => void;
  visible?: boolean;
  loading?: boolean;
  error?: string | null;
};

type LeadPoint = {
  lead: Lead;
  lat: number;
  lng: number;
};

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;
const BRAZIL_BOUNDS = {
  latMin: -33.8,
  latMax: 5.3,
  lngMin: -74.0,
  lngMax: -34.8,
};

const normalizeCoordinate = (
  value: unknown,
  min: number,
  max: number,
): number | null => {
  if (typeof value === "number") {
    return value >= min && value <= max ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(",", "."));
    return parsed >= min && parsed <= max ? parsed : null;
  }
  return null;
};

const getLeadPoint = (lead: Lead): LeadPoint | null => {
  const record = lead as Record<string, unknown>;
  const lat =
    normalizeCoordinate(record.latitude, -90, 90) ??
    normalizeCoordinate(record.lat, -90, 90);
  const lng =
    normalizeCoordinate(record.longitude, -180, 180) ??
    normalizeCoordinate(record.lng, -180, 180);
  if (lat !== null && lng !== null) {
    return { lead, lat, lng };
  }

  // TEMP: mock lat/lng inside Brazil while leads have no coordinates.
  const seed = Number.isFinite(lead.id) ? lead.id : Date.now();
  const random = (value: number) => {
    const x = Math.sin(value) * 10000;
    return x - Math.floor(x);
  };
  const mockedLat =
    BRAZIL_BOUNDS.latMin +
    random(seed) * (BRAZIL_BOUNDS.latMax - BRAZIL_BOUNDS.latMin);
  const mockedLng =
    BRAZIL_BOUNDS.lngMin +
    random(seed + 1) * (BRAZIL_BOUNDS.lngMax - BRAZIL_BOUNDS.lngMin);
  return { lead, lat: mockedLat, lng: mockedLng };
};

const getMarkerLabel = (lead: Lead) =>
  lead.chassi ??
  lead.clienteBaseEnriquecida ??
  lead.nomeContato ??
  `Lead ${lead.id}`;

export function LeadsMapView({
  leads,
  onLeadSelect,
  visible = false,
  loading = false,
  error = null,
}: LeadsMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerGroupRef = useRef<MarkerClusterGroup | null>(null);
  const leafletRef = useRef<LeafletWithCluster | null>(null);

  const leadPoints = useMemo(() => {
    return leads
      .map((lead) => getLeadPoint(lead))
      .filter((item): item is LeadPoint => Boolean(item));
  }, [leads]);

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      if (!containerRef.current || mapRef.current) return;

      await import("leaflet/dist/leaflet-src.js");
      const L = (globalThis as typeof globalThis & {
        L?: LeafletWithCluster;
      }).L;
      if (!L) {
        throw new Error("Leaflet global was not initialized.");
      }
      await import("leaflet.markercluster/dist/leaflet.markercluster-src.js");

      if (!mounted || !containerRef.current) return;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const createClusterGroup =
        L.markerClusterGroup ??
        (() => {
          throw new Error("leaflet.markercluster did not attach to Leaflet.");
        });
      const clusterGroup = createClusterGroup({
        maxClusterRadius: 42,
        showCoverageOnHover: false,
      });
      clusterGroup.addTo(map);

      mapRef.current = map;
      markerGroupRef.current = clusterGroup;
      leafletRef.current = L;
    };

    void initMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerGroupRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markerGroupRef.current;
    const L = leafletRef.current;
    if (!map || !markerGroup || !L) return;

    markerGroup.clearLayers();

    if (!leadPoints.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    leadPoints.forEach((point) => {
      const marker = L.marker([point.lat, point.lng], {
        title: getMarkerLabel(point.lead),
      });
      marker.on("click", () => onLeadSelect?.(point.lead));
      markerGroup.addLayer(marker);
    });

    const bounds = markerGroup.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2), { maxZoom: 13 });
    }
  }, [leadPoints, onLeadSelect]);

  useEffect(() => {
    if (!visible) return;
    const map = mapRef.current;
    if (!map) return;
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [visible]);

  const overlayMessage = error
    ? error
    : loading
      ? "Carregando mapa..."
      : leadPoints.length === 0
        ? "Nenhum lead para mostrar no mapa."
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
