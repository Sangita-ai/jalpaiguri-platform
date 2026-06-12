// Fallback map using Leaflet + OpenStreetMap when no Mapbox token
'use client';
import { useEffect, useRef } from 'react';

interface MapFallbackProps {
  complaints?: any[];
  drains?:     any[];
  center?:     [number, number];
  zoom?:       number;
  height?:     string;
}

export default function MapFallback({
  complaints = [], drains = [],
  center = [26.5428, 88.7179], zoom = 13,
  height = '500px',
}: MapFallbackProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || mapInstance.current) return;
    let L: any;
    try { L = require('leaflet'); } catch { return; }

    const map = L.map(mapRef.current!, { center, zoom, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Plot complaints
    const CATEGORY_COLORS: Record<string, string> = {
      GARBAGE:'#ef4444', WATER_LEAKAGE:'#3b82f6', DRAINAGE:'#8b5cf6',
      ROAD_DAMAGE:'#f97316', STREETLIGHT_FAILURE:'#eab308', OTHER:'#6b7280',
    };
    complaints.forEach(c => {
      if (!c.locationLat || !c.locationLng) return;
      const color = CATEGORY_COLORS[c.category] ?? '#6b7280';
      L.circleMarker([c.locationLat, c.locationLng], {
        radius: 7, color: '#fff', weight: 2,
        fillColor: color, fillOpacity: 0.85,
      })
        .addTo(map)
        .bindPopup(`<b>${c.complaintNumber}</b><br>${c.category}<br>${c.status}`);
    });

    // Plot drain sensors
    drains.forEach(d => {
      if (!d.locationLat || !d.locationLng) return;
      const statusColor: Record<string, string> = {
        NORMAL:'#16a34a', ELEVATED:'#ca8a04', HIGH:'#ea580c', OVERFLOW_RISK:'#dc2626',
      };
      L.circleMarker([d.locationLat, d.locationLng], {
        radius: 8, color: '#fff', weight: 2,
        fillColor: statusColor[d.status] ?? '#6b7280', fillOpacity: 0.9,
      })
        .addTo(map)
        .bindPopup(`<b>${d.drainName}</b><br>Level: ${d.currentLevelCm}/${d.capacityCm}cm<br>${d.status}`);
    });

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden' }} />
      <div className="absolute top-3 right-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-1.5 rounded-lg shadow">
        OpenStreetMap fallback — add Mapbox token for full GIS features
      </div>
    </div>
  );
}
