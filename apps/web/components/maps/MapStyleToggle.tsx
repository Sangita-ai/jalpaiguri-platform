'use client';
import { MapStyle } from '@/hooks/useMapbox';
import { cn } from '@/lib/utils';

const STYLES: { id: MapStyle; label: string }[] = [
  { id: 'light',     label: 'Light'     },
  { id: 'dark',      label: 'Dark'      },
  { id: 'satellite', label: 'Satellite' },
  { id: 'streets',   label: 'Streets'   },
];

interface Props {
  current:  MapStyle;
  onChange: (s: MapStyle) => void;
}

export default function MapStyleToggle({ current, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-panel border border-slate-200 flex overflow-hidden">
      {STYLES.map(s => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-all duration-150 border-r border-slate-100 last:border-0',
            current === s.id
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
