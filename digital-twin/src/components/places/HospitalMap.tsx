import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PlaceDTO } from '../../types/places';

// Configurable so a production deployment can use a commercial or self-hosted tile provider:
// openstreetmap.org's own tile servers are for light use only.
const TILE_URL = (import.meta.env.VITE_MAP_TILE_URL as string | undefined) ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

interface Props {
  center: { lat: number; lon: number };
  radiusKm: number;
  places: PlaceDTO[];
  selected: number | null;
  onSelect: (index: number) => void;
}

const markerHtml = (n: number, active: boolean) =>
  `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);` +
  `background:${active ? '#e74c3c' : '#3498db'};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);">` +
  `<span style="transform:rotate(45deg);color:#fff;font:600 12px system-ui,sans-serif;">${n}</span></span>`;

/** The map itself. Lazy-loaded so Leaflet only downloads when someone opens the finder. */
export default function HospitalMap({ center, radiusKm, places, selected, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<L.Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false }).setView([center.lat, center.lon], 12);
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      layer.current = null;
    };
    // The map is created once; the effect below keeps it in step with the data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    markers.current = [];
    // The searched position is only ever rounded to about 1 km, so it is drawn as an area, not a pin.
    const area = L.circle([center.lat, center.lon], { radius: 800, color: '#7f8c8d', weight: 1, fillOpacity: 0.12, interactive: false }).addTo(g);
    const bounds = L.latLngBounds([area.getBounds().getSouthWest(), area.getBounds().getNorthEast()]);
    places.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lon], { icon: L.divIcon({ html: markerHtml(i + 1, false), className: '', iconSize: [28, 28], iconAnchor: [14, 28] }), title: p.name, keyboard: true, alt: p.name })
        .on('click', () => onSelectRef.current(i))
        .addTo(g);
      markers.current.push(marker);
      bounds.extend([p.lat, p.lon]);
    });
    m.fitBounds(bounds.pad(0.15), { maxZoom: 15 });
    // Circle radius hint for the search area.
    L.circle([center.lat, center.lon], { radius: radiusKm * 1000, color: '#3498db', weight: 1, dashArray: '4 6', fill: false, interactive: false }).addTo(g);
  }, [center.lat, center.lon, radiusKm, places]);

  useEffect(() => {
    markers.current.forEach((mk, i) => {
      mk.setIcon(L.divIcon({ html: markerHtml(i + 1, i === selected), className: '', iconSize: [28, 28], iconAnchor: [14, 28] }));
      mk.setZIndexOffset(i === selected ? 1000 : 0);
    });
    if (selected !== null && places[selected] && map.current) map.current.panTo([places[selected].lat, places[selected].lon]);
  }, [selected, places]);

  return <div ref={el} role="region" aria-label="Map of nearby places. The list beside it has the same information." className="h-72 w-full rounded-xl border border-hud-border sm:h-80" />;
}
