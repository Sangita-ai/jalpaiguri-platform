// All Mapbox GL layer + source definitions for the platform
// Each export is a function so layers are fresh objects on each call

export const MAPBOX_ARROW_MARKER = {
  id: 'arrow',
  viewBox: '0 0 10 10',
  refX: 8, refY: 5,
  markerWidth: 6, markerHeight: 6,
};

// ── Ward Boundaries ───────────────────────────────────────────

export function wardFillLayer(sourceId = 'wards') {
  return {
    id:     'wards-fill',
    type:   'fill',
    source: sourceId,
    paint:  {
      'fill-color': [
        'interpolate', ['linear'],
        ['coalesce', ['get', 'open_complaints'], 0],
        0,  '#eff6ff',
        10, '#bfdbfe',
        25, '#60a5fa',
        50, '#2563eb',
      ],
      'fill-opacity': 0.35,
    },
  } as const;
}

export function wardLineLayer(sourceId = 'wards') {
  return {
    id:     'wards-line',
    type:   'line',
    source: sourceId,
    paint:  {
      'line-color':   '#1d4ed8',
      'line-width':   1.8,
      'line-opacity': 0.7,
    },
  } as const;
}

export function wardLabelLayer(sourceId = 'wards') {
  return {
    id:     'wards-label',
    type:   'symbol',
    source: sourceId,
    layout: {
      'text-field':             ['concat', ['get', 'name'], '\n', 'Ward ', ['get', 'wardNumber']],
      'text-size':              11,
      'text-font':              ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-anchor':            'center',
      'text-max-width':         8,
      'text-allow-overlap':     false,
      'text-ignore-placement':  false,
    },
    paint: {
      'text-color':       '#1e3a8a',
      'text-halo-color':  'rgba(255,255,255,0.9)',
      'text-halo-width':  1.5,
    },
  } as const;
}

// ── Complaint Heatmap ─────────────────────────────────────────

export function complaintHeatmapLayer(sourceId = 'complaint-heat') {
  return {
    id:      'complaints-heatmap',
    type:    'heatmap',
    source:  sourceId,
    maxzoom: 15,
    paint:   {
      'heatmap-weight':    ['interpolate', ['linear'], ['get', 'count'], 0, 0, 20, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 15, 2],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,    'rgba(0,0,255,0)',
        0.15, 'rgba(65,182,196,0.6)',
        0.4,  'rgba(127,205,187,0.8)',
        0.65, 'rgba(253,141,60,0.9)',
        0.85, 'rgba(240,59,32,0.95)',
        1,    'rgba(189,0,38,1)',
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 25, 15, 45],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.85, 15, 0.4],
    },
  } as const;
}

// ── Complaint Clusters ────────────────────────────────────────

export function clusterCircleLayer(sourceId = 'complaint-points') {
  return {
    id:     'complaint-clusters',
    type:   'circle',
    source: sourceId,
    filter: ['has', 'point_count'],
    paint:  {
      'circle-color': [
        'step', ['get', 'point_count'],
        '#60a5fa', 10,
        '#f59e0b', 30,
        '#ef4444',
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        16, 10, 22, 30, 30,
      ],
      'circle-stroke-width': 3,
      'circle-stroke-color': 'rgba(255,255,255,0.7)',
      'circle-opacity': 0.92,
    },
  } as const;
}

export function clusterCountLayer(sourceId = 'complaint-points') {
  return {
    id:     'complaint-cluster-count',
    type:   'symbol',
    source: sourceId,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font':  ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
      'text-size':  12,
    },
    paint: { 'text-color': '#fff' },
  } as const;
}

export function unclusteredPointLayer(sourceId = 'complaint-points') {
  return {
    id:     'complaint-points-single',
    type:   'circle',
    source: sourceId,
    filter: ['!', ['has', 'point_count']],
    paint:  {
      'circle-color': [
        'match', ['get', 'category'],
        'GARBAGE',             '#ef4444',
        'WATER_LEAKAGE',       '#3b82f6',
        'WATER_SUPPLY',        '#06b6d4',
        'DRAINAGE',            '#8b5cf6',
        'ROAD_DAMAGE',         '#f97316',
        'STREETLIGHT_FAILURE', '#eab308',
        'ILLEGAL_DUMPING',     '#ec4899',
        '#6b7280',
      ],
      'circle-radius': [
        'interpolate', ['linear'], ['get', 'priorityScore'],
        0, 5, 60, 7, 100, 10,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.9,
    },
  } as const;
}

// ── Drain Sensors ─────────────────────────────────────────────

export function drainCircleLayer(sourceId = 'drains') {
  return {
    id:     'drain-sensors',
    type:   'circle',
    source: sourceId,
    paint:  {
      'circle-color': [
        'match', ['get', 'status'],
        'NORMAL',        '#16a34a',
        'ELEVATED',      '#ca8a04',
        'HIGH',          '#ea580c',
        'OVERFLOW_RISK', '#dc2626',
        'OVERFLOW',      '#7f1d1d',
        '#9ca3af',
      ],
      'circle-radius': [
        'interpolate', ['linear'], ['get', 'fillPct'],
        0, 7, 70, 9, 100, 13,
      ],
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.95,
    },
  } as const;
}

export function drainPulseLayer(sourceId = 'drains') {
  return {
    id:     'drain-pulse',
    type:   'circle',
    source: sourceId,
    filter: ['in', ['get', 'status'], ['literal', ['OVERFLOW_RISK','OVERFLOW']]],
    paint:  {
      'circle-color':   'transparent',
      'circle-radius':  18,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#dc2626',
      'circle-stroke-opacity': ['interpolate', ['linear'], ['get', 'fillPct'], 85, 0.3, 100, 0.8],
    },
  } as const;
}

// ── Tree Cover ────────────────────────────────────────────────

export function treePointLayer(sourceId = 'trees') {
  return {
    id:     'tree-points',
    type:   'circle',
    source: sourceId,
    paint:  {
      'circle-color': [
        'match', ['get', 'healthStatus'],
        'EXCELLENT', '#14532d',
        'GOOD',      '#16a34a',
        'FAIR',      '#ca8a04',
        'POOR',      '#dc2626',
        'DEAD',      '#6b7280',
        '#16a34a',
      ],
      'circle-radius': 4,
      'circle-opacity': 0.75,
      'circle-stroke-width': 0.5,
      'circle-stroke-color': 'rgba(255,255,255,0.5)',
    },
  } as const;
}

export function treeHeatLayer(sourceId = 'trees') {
  return {
    id:     'tree-canopy-heat',
    type:   'heatmap',
    source: sourceId,
    paint:  {
      'heatmap-weight':    0.4,
      'heatmap-intensity': 0.8,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,   'rgba(0,100,0,0)',
        0.3, 'rgba(34,197,94,0.4)',
        0.6, 'rgba(22,163,74,0.7)',
        1,   'rgba(20,83,45,0.9)',
      ],
      'heatmap-radius':  15,
      'heatmap-opacity': 0.6,
    },
  } as const;
}

// ── Water Pipes ───────────────────────────────────────────────

export function pipeLineLayer(sourceId = 'water-pipes') {
  return {
    id:     'pipe-lines',
    type:   'line',
    source: sourceId,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  {
      'line-color': [
        'match', ['get', 'condition'],
        'GOOD',     '#22c55e',
        'FAIR',     '#eab308',
        'POOR',     '#f97316',
        'CRITICAL', '#dc2626',
        '#6b7280',
      ],
      'line-width': [
        'match', ['get', 'condition'],
        'CRITICAL', 4, 'POOR', 3, 2.5,
      ],
      'line-opacity': 0.85,
      'line-dasharray': ['match', ['get', 'condition'], 'GOOD', ['literal', [1]], ['literal', [3,1]]],
    },
  } as const;
}

export function leakPointLayer(sourceId = 'water-pipes') {
  return {
    id:     'leak-sensors',
    type:   'circle',
    source: 'water-sensors',
    filter: ['>', ['get', 'leakProbability'], 0.4],
    paint:  {
      'circle-color': [
        'interpolate', ['linear'], ['get', 'leakProbability'],
        0.4, '#fbbf24',
        0.6, '#f97316',
        0.8, '#dc2626',
        1.0, '#7f1d1d',
      ],
      'circle-radius':  9,
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.95,
    },
  } as const;
}
