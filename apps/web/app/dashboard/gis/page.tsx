'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import LayerControl, { DEFAULT_LAYERS, LayerConfig } from '@/components/maps/LayerControl';
import MapStyleToggle from '@/components/maps/MapStyleToggle';
import MapLegend from '@/components/maps/MapLegend';
import MapPopup, { PopupData } from '@/components/maps/MapPopup';
import { useMapbox, MapStyle } from '@/hooks/useMapbox';
import { useQuery } from '@tanstack/react-query';
import { gisApi, dashboardApi } from '@/lib/api';
import { buildWardsGeoJSON, JALPAIGURI_BOUNDS } from '../../../../../packages/geojson-data/jalpaiguri-wards';
import {
  wardFillLayer, wardLineLayer, wardLabelLayer,
  complaintHeatmapLayer, clusterCircleLayer, clusterCountLayer, unclusteredPointLayer,
  drainCircleLayer, drainPulseLayer,
  treePointLayer, treeHeatLayer,
  pipeLineLayer, leakPointLayer,
} from '@/lib/mapLayers';
import { CATEGORY_LABELS } from '@/lib/utils';
import {
  RotateCcw, Maximize2, Search, SlidersHorizontal,
  Layers, MapPin, AlertTriangle, Droplets, TreePine, Waves,
  BarChart3, ChevronRight, Activity,
} from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';

// ── Layer state init ──────────────────────────────────────────
const INITIAL_LAYERS: LayerConfig[] = DEFAULT_LAYERS.map(l => ({
  ...l,
  enabled: ['wards', 'complaints', 'clusters'].includes(l.id),
}));

// ── Source IDs that need clustering ──────────────────────────
const CLUSTERED_SOURCES = {
  'complaint-points': {
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  },
};

export default function GISPage() {
  const [layers,      setLayers]     = useState<LayerConfig[]>(INITIAL_LAYERS);
  const [popup,       setPopup]      = useState<PopupData | null>(null);
  const [sidepanel,   setSidepanel]  = useState(false);
  const [wardFilter,  setWardFilter] = useState('');
  const [fullscreen,  setFullscreen] = useState(false);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const clickHandlers = useRef<Map<string, any>>(new Map());

  // Data queries
  const { data: wardStats   } = useQuery({ queryKey: ['gis-ward-stats'], queryFn: dashboardApi.wardStats });
  const { data: heatmapGeo  } = useQuery({ queryKey: ['gis-heatmap'],    queryFn: gisApi.heatmap,        refetchInterval: 120_000 });
  const { data: pointsGeo   } = useQuery({ queryKey: ['gis-points'],     queryFn: () => gisApi.complaintPoints(), refetchInterval: 60_000 });
  const { data: drainsGeo   } = useQuery({ queryKey: ['gis-drains'],     queryFn: gisApi.drains,         refetchInterval: 30_000 });
  const { data: treesGeo    } = useQuery({ queryKey: ['gis-trees'],      queryFn: () => gisApi.trees()  });
  const { data: pipesGeo    } = useQuery({ queryKey: ['gis-pipes'],      queryFn: gisApi.waterPipes     });
  const { data: summary     } = useQuery({ queryKey: ['dashboard-summary'], queryFn: dashboardApi.summary });

  // Mapbox hook
  const {
    mapContainer, map, isLoaded, isError,
    mapStyle, changeStyle,
    flyTo, resetView,
    addLayer, removeLayer, setSource, toggleLayer,
  } = useMapbox({
    center: JALPAIGURI_BOUNDS.center,
    zoom:   JALPAIGURI_BOUNDS.zoom,
    onLoad: (m) => {
      console.log('[GIS] Map loaded');
    },
  });

  // ── Build ward GeoJSON with live stats ──────────────────────
  const wardsGeo = useCallback(() => {
    const statsMap: Record<number, any> = {};
    if (Array.isArray(wardStats)) {
      wardStats.forEach((w: any) => { statsMap[w.ward_number] = w; });
    }
    return buildWardsGeoJSON(statsMap);
  }, [wardStats]);

  // ── Register click handler on a layer (idempotent) ──────────
  const registerClick = useCallback((layerId: string, handler: (e: any) => void) => {
    if (!map.current || clickHandlers.current.has(layerId)) return;
    map.current.on('click', layerId, handler);
    map.current.on('mouseenter', layerId, () => { map.current.getCanvas().style.cursor = 'pointer'; });
    map.current.on('mouseleave', layerId, () => { map.current.getCanvas().style.cursor = ''; });
    clickHandlers.current.set(layerId, handler);
  }, [map]);

  // ── Add all sources + layers once map is loaded ─────────────
  useEffect(() => {
    if (!isLoaded || !map.current) return;
    const m = map.current;

    // ── Wards ──
    const wGeo = wardsGeo();
    if (!m.getSource('wards')) {
      m.addSource('wards', { type: 'geojson', data: wGeo });
    } else {
      m.getSource('wards').setData(wGeo);
    }
    addLayer(wardFillLayer());
    addLayer(wardLineLayer());
    addLayer(wardLabelLayer());

    registerClick('wards-fill', (e: any) => {
      const p = e.features?.[0]?.properties;
      if (p) setPopup({ type: 'ward', properties: p });
    });

    // ── Complaint heatmap ──
    if (heatmapGeo) {
      if (!m.getSource('complaint-heat')) {
        m.addSource('complaint-heat', { type: 'geojson', data: heatmapGeo });
      } else {
        m.getSource('complaint-heat').setData(heatmapGeo);
      }
      addLayer(complaintHeatmapLayer());
    }

    // ── Complaint clusters + points ──
    if (pointsGeo) {
      if (!m.getSource('complaint-points')) {
        m.addSource('complaint-points', {
          type: 'geojson',
          data: pointsGeo,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });
      } else {
        m.getSource('complaint-points').setData(pointsGeo);
      }
      addLayer(clusterCircleLayer());
      addLayer(clusterCountLayer());
      addLayer(unclusteredPointLayer());

      // Cluster expand on click
      registerClick('complaint-clusters', (e: any) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['complaint-clusters'] });
        const clusterId = features?.[0]?.properties?.cluster_id;
        if (!clusterId) return;
        m.getSource('complaint-points').getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          m.easeTo({ center: (features[0].geometry as any).coordinates, zoom: zoom + 0.5, duration: 600 });
        });
      });

      // Single point popup
      registerClick('complaint-points-single', (e: any) => {
        const p = e.features?.[0]?.properties;
        if (p) setPopup({ type: 'complaint', properties: p });
      });
    }

    // ── Drains ──
    if (drainsGeo) {
      if (!m.getSource('drains')) {
        m.addSource('drains', { type: 'geojson', data: drainsGeo });
      } else {
        m.getSource('drains').setData(drainsGeo);
      }
      addLayer(drainPulseLayer());
      addLayer(drainCircleLayer());

      registerClick('drain-sensors', (e: any) => {
        const p = e.features?.[0]?.properties;
        if (p) setPopup({ type: 'drain', properties: p });
      });
    }

    // ── Trees ──
    if (treesGeo) {
      if (!m.getSource('trees')) {
        m.addSource('trees', { type: 'geojson', data: treesGeo });
      } else {
        m.getSource('trees').setData(treesGeo);
      }
      addLayer(treeHeatLayer());
      addLayer(treePointLayer());

      registerClick('tree-points', (e: any) => {
        const p = e.features?.[0]?.properties;
        if (p) setPopup({ type: 'tree', properties: p });
      });
    }

    // ── Water pipes ──
    if (pipesGeo) {
      if (!m.getSource('water-pipes')) {
        m.addSource('water-pipes', { type: 'geojson', data: pipesGeo });
      } else {
        m.getSource('water-pipes').setData(pipesGeo);
      }
      addLayer(pipeLineLayer());
    }

  }, [isLoaded, heatmapGeo, pointsGeo, drainsGeo, treesGeo, pipesGeo, wardStats]);

  // ── Sync layer visibility ────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    const vis = (id: string) => layers.find(l => l.id === id)?.enabled ?? false;

    const layerGroups: Record<string, string[]> = {
      wards:       ['wards-fill', 'wards-line', 'wards-label'],
      complaints:  ['complaints-heatmap'],
      clusters:    ['complaint-clusters', 'complaint-cluster-count', 'complaint-points-single'],
      drains:      ['drain-sensors', 'drain-pulse'],
      'water-pipes': ['pipe-lines'],
      'water-leaks': ['leak-sensors'],
      trees:       ['tree-points'],
      'tree-canopy': ['tree-canopy-heat'],
    };

    Object.entries(layerGroups).forEach(([groupId, layerIds]) => {
      const show = vis(groupId);
      layerIds.forEach(lid => toggleLayer(lid, show));
    });
  }, [layers, isLoaded, toggleLayer]);

  // ── Toggle a layer on/off ────────────────────────────────────
  const handleToggle = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l));
  };

  // ── Fullscreen ───────────────────────────────────────────────
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapWrapperRef.current?.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  // Live stats strip
  const statsStrip = [
    { label: 'Total complaints', value: summary?.total ?? '—',   color: 'text-blue-600'   },
    { label: 'Open',             value: summary?.pending ?? '—', color: 'text-orange-600' },
    { label: 'Drain alerts',     value: summary?.drainAlerts ?? '—', color: 'text-red-600' },
    { label: 'Trees monitored',  value: '5,000+',                color: 'text-green-600'  },
  ];

  // Ward search results
  const wardFeatures = wardsGeo().features.filter(f =>
    !wardFilter || f.properties.name.toLowerCase().includes(wardFilter.toLowerCase())
  );

  return (
    <DashboardShell title="GIS Intelligence Map">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="page-title">GIS Intelligence Map</h1>
          <p className="page-subtitle">
            Jalpaiguri Municipality · 20 wards · Real-time complaint, drain & tree overlay
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live data
          </span>
          <button onClick={() => setSidepanel(p => !p)}
            className={`btn-sm ${sidepanel ? 'btn-primary' : 'btn-secondary'}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Analytics
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {statsStrip.map(s => (
          <div key={s.label} className="card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-2xs text-slate-500 uppercase tracking-wide truncate">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`flex gap-4 ${sidepanel ? 'flex-col xl:flex-row' : ''}`}>
        {/* Map area */}
        <div ref={mapWrapperRef} className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-panel flex-1 ${fullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
          style={{ height: fullscreen ? '100vh' : 'calc(100vh - 270px)', minHeight: 480 }}>

          {/* Mapbox container */}
          <div ref={mapContainer} className="w-full h-full" />

          {/* Error / fallback */}
          {isError && (
            <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
              <div className="text-center p-8">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 mb-1">Mapbox token not configured</p>
                <p className="text-xs text-slate-500 mb-3">Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local</p>
                <p className="text-xs text-slate-400">Add your token from mapbox.com to enable the full GIS experience.</p>
              </div>
            </div>
          )}

          {/* Loading */}
          {!isLoaded && !isError && (
            <div className="absolute inset-0 bg-slate-50/80 flex items-center justify-center z-10 pointer-events-none">
              <div className="flex flex-col items-center gap-2">
                <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Loading map...</p>
              </div>
            </div>
          )}

          {/* ── Map controls — top right ── */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
            <MapStyleToggle current={mapStyle} onChange={changeStyle} />
            <div className="flex gap-1.5 justify-end">
              <button onClick={resetView}
                className="bg-white rounded-lg shadow-panel border border-slate-200 p-1.5 hover:bg-slate-50 transition"
                title="Reset view">
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <button onClick={handleFullscreen}
                className="bg-white rounded-lg shadow-panel border border-slate-200 p-1.5 hover:bg-slate-50 transition"
                title="Fullscreen">
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* ── Layer control — left ── */}
          <div className="absolute top-3 left-14 z-10">
            <LayerControl layers={layers} onToggle={handleToggle} />
          </div>

          {/* ── Legend — bottom right ── */}
          <div className="absolute bottom-8 right-3 z-10">
            <MapLegend />
          </div>

          {/* ── Ward search — bottom left ── */}
          <div className="absolute bottom-8 left-3 z-10">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-panel border border-slate-200 p-2.5 w-48">
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  className="w-full pl-6 pr-2 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Search ward..."
                  value={wardFilter}
                  onChange={e => setWardFilter(e.target.value)}
                />
              </div>
              <div className="max-h-36 overflow-y-auto scrollbar-thin space-y-0.5">
                {wardFeatures.slice(0, 20).map(f => (
                  <button
                    key={f.properties.wardNumber}
                    onClick={() => {
                      const [lng, lat] = f.properties.center as [number, number];
                      flyTo(lng, lat, 15);
                      setWardFilter('');
                    }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-brand-50 hover:text-brand-700 text-xs text-slate-700 transition flex items-center justify-between group"
                  >
                    <span>{f.properties.name}</span>
                    <span className="text-2xs text-slate-400 group-hover:text-brand-500">W{f.properties.wardNumber}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Popup ── */}
          {popup && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
              <MapPopup data={popup} onClose={() => setPopup(null)} />
            </div>
          )}
        </div>

        {/* ── Side analytics panel ── */}
        {sidepanel && (
          <div className="w-full xl:w-80 flex-shrink-0 space-y-4">
            <WardStatsPanel
              wardStats={Array.isArray(wardStats) ? wardStats : []}
              onWardClick={(ward: any) => {
                const feature = wardsGeo().features.find(f => f.properties.wardNumber === ward.ward_number);
                if (feature) {
                  const [lng, lat] = feature.properties.center as [number, number];
                  flyTo(lng, lat, 15);
                }
              }}
            />
            <DrainSummaryPanel drainsGeo={drainsGeo} />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

// ── Ward Stats Side Panel ─────────────────────────────────────
function WardStatsPanel({ wardStats, onWardClick }: { wardStats: any[]; onWardClick: (w: any) => void }) {
  const sorted = [...wardStats].sort((a, b) => (b.open_complaints ?? 0) - (a.open_complaints ?? 0));
  const max = sorted[0]?.open_complaints ?? 1;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-600" />Ward Performance
        </h3>
        <span className="text-xs text-slate-400">Open complaints</span>
      </div>
      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto scrollbar-thin">
        {sorted.slice(0, 20).map(w => (
          <button key={w.ward_number}
            onClick={() => onWardClick(w)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left group">
            <span className="text-xs font-mono text-slate-400 w-6 flex-shrink-0">W{w.ward_number}</span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-xs font-medium text-slate-700 truncate">{w.ward_name}</span>
                <span className="text-xs font-bold text-orange-600 ml-2 flex-shrink-0">{w.open_complaints ?? 0}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-400 transition-all"
                  style={{ width: `${max > 0 ? ((w.open_complaints ?? 0) / max) * 100 : 0}%` }}
                />
              </div>
            </div>
            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition" />
          </button>
        ))}
        {sorted.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">No ward data yet</p>
        )}
      </div>
    </div>
  );
}

// ── Drain Summary Panel ───────────────────────────────────────
function DrainSummaryPanel({ drainsGeo }: { drainsGeo: any }) {
  const features = drainsGeo?.features ?? [];
  const byStatus = features.reduce((acc: Record<string, number>, f: any) => {
    const s = f.properties?.status ?? 'UNKNOWN';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const alerts = features
    .filter((f: any) => ['HIGH','OVERFLOW_RISK','OVERFLOW'].includes(f.properties?.status))
    .map((f: any) => f.properties)
    .sort((a: any, b: any) => b.fillPct - a.fillPct)
    .slice(0, 5);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-600" />Drain Alerts
        </h3>
        <span className="text-xs font-medium text-red-600">{alerts.length} active</span>
      </div>
      <div className="card-body space-y-2">
        {/* Status summary pills */}
        <div className="flex flex-wrap gap-1.5 mb-1">
          {Object.entries(byStatus).map(([status, count]) => {
            const colors: Record<string, string> = {
              NORMAL:'bg-green-100 text-green-700', ELEVATED:'bg-yellow-100 text-yellow-700',
              HIGH:'bg-orange-100 text-orange-700', OVERFLOW_RISK:'bg-red-100 text-red-700',
              OFFLINE:'bg-slate-100 text-slate-500',
            };
            return (
              <span key={status} className={`text-2xs font-medium px-2 py-0.5 rounded-full ${colors[status] ?? 'bg-slate-100 text-slate-600'}`}>
                {status}: {count as number}
              </span>
            );
          })}
        </div>

        {/* Alert list */}
        {alerts.map((d: any) => (
          <div key={d.sensorCode} className="flex items-center gap-2.5 p-2 bg-red-50 rounded-lg border border-red-100">
            <Activity className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{d.drainName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-1 flex-1 bg-red-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${d.fillPct}%` }} />
                </div>
                <span className="text-2xs font-bold text-red-600">{d.fillPct}%</span>
              </div>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-3">All drains operating normally</p>
        )}
      </div>
    </div>
  );
}
