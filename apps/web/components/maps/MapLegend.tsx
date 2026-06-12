'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface LegendItem { color: string; label: string; shape?: 'circle' | 'line' | 'square' }
interface LegendSection { title: string; items: LegendItem[] }

const LEGENDS: LegendSection[] = [
  {
    title: 'Complaint Type',
    items: [
      { color: '#ef4444', label: 'Garbage'            },
      { color: '#3b82f6', label: 'Water Leakage'      },
      { color: '#8b5cf6', label: 'Drainage'           },
      { color: '#f97316', label: 'Road Damage'        },
      { color: '#eab308', label: 'Streetlight'        },
      { color: '#6b7280', label: 'Other'              },
    ],
  },
  {
    title: 'Drain Status',
    items: [
      { color: '#16a34a', label: 'Normal'        },
      { color: '#ca8a04', label: 'Elevated'      },
      { color: '#ea580c', label: 'High'          },
      { color: '#dc2626', label: 'Overflow Risk' },
    ],
  },
  {
    title: 'Tree Health',
    items: [
      { color: '#14532d', label: 'Excellent' },
      { color: '#16a34a', label: 'Good'      },
      { color: '#ca8a04', label: 'Fair'      },
      { color: '#dc2626', label: 'Poor'      },
      { color: '#9ca3af', label: 'Dead'      },
    ],
  },
  {
    title: 'Pipeline Condition',
    items: [
      { color: '#22c55e', label: 'Good',     shape: 'line' },
      { color: '#eab308', label: 'Fair',     shape: 'line' },
      { color: '#f97316', label: 'Poor',     shape: 'line' },
      { color: '#dc2626', label: 'Critical', shape: 'line' },
    ],
  },
];

export default function MapLegend() {
  const [open, setOpen] = useState(true);
  const [section, setSection] = useState(0);

  const current = LEGENDS[section];

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-panel border border-slate-200 overflow-hidden min-w-[160px]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
      >
        <span>Legend</span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-3 pb-3">
          {/* Section tabs */}
          <div className="flex gap-0.5 mb-2.5 overflow-x-auto">
            {LEGENDS.map((l, i) => (
              <button key={l.title} onClick={() => setSection(i)}
                className={`text-2xs px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${
                  i === section ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {l.title}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {current.items.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                {item.shape === 'line' ? (
                  <div className="w-5 h-0.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                )}
                <span className="text-xs text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
