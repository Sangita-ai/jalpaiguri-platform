'use client';
import { cn } from '@/lib/utils';
import { Layers, Thermometer, Waves, Droplets, TreePine, Building2, Eye, EyeOff } from 'lucide-react';

export interface LayerConfig {
  id:       string;
  label:    string;
  icon:     React.ElementType;
  color:    string;
  enabled:  boolean;
  group?:   string;
}

interface LayerControlProps {
  layers:   LayerConfig[];
  onToggle: (id: string) => void;
}

export const DEFAULT_LAYERS: Omit<LayerConfig, 'enabled'>[] = [
  { id: 'wards',       label: 'Ward Boundaries',    icon: Building2,   color: '#2563eb', group: 'Base'     },
  { id: 'complaints',  label: 'Complaint Heatmap',  icon: Thermometer, color: '#ef4444', group: 'Civic'    },
  { id: 'clusters',    label: 'Complaint Pins',     icon: Layers,      color: '#f59e0b', group: 'Civic'    },
  { id: 'drains',      label: 'Drain Sensors',      icon: Waves,       color: '#06b6d4', group: 'Sensors'  },
  { id: 'water-pipes', label: 'Water Pipelines',    icon: Droplets,    color: '#8b5cf6', group: 'Sensors'  },
  { id: 'water-leaks', label: 'Leak Detections',    icon: Droplets,    color: '#dc2626', group: 'Sensors'  },
  { id: 'trees',       label: 'Tree Cover',         icon: TreePine,    color: '#16a34a', group: 'Green'    },
  { id: 'tree-canopy', label: 'Canopy Density',     icon: TreePine,    color: '#14532d', group: 'Green'    },
];

const GROUP_ORDER = ['Base', 'Civic', 'Sensors', 'Green'];

export default function LayerControl({ layers, onToggle }: LayerControlProps) {
  const groups = GROUP_ORDER.map(g => ({
    name:   g,
    layers: layers.filter(l => {
      const def = DEFAULT_LAYERS.find(d => d.id === l.id);
      return (def?.group ?? 'Base') === g;
    }),
  })).filter(g => g.layers.length > 0);

  return (
    <div className="bg-white rounded-xl shadow-panel border border-slate-200 p-3 min-w-[188px]">
      <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-100">
        <Layers className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Map Layers</span>
      </div>

      <div className="space-y-3">
        {groups.map(group => (
          <div key={group.name}>
            <p className="text-2xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">{group.name}</p>
            <div className="space-y-0.5">
              {group.layers.map(layer => (
                <button
                  key={layer.id}
                  onClick={() => onToggle(layer.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 group',
                    layer.enabled
                      ? 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  )}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity"
                    style={{ background: layer.color, opacity: layer.enabled ? 1 : 0.3 }}
                  />
                  <span className="flex-1 text-left leading-tight">{layer.label}</span>
                  {layer.enabled
                    ? <Eye     className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    : <EyeOff  className="w-3 h-3 text-slate-300 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
