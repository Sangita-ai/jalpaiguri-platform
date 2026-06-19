'use client';
import { X, MapPin, AlertTriangle, Droplets, TreePine, Waves } from 'lucide-react';
import { cn, CATEGORY_LABELS, fmt, drainStatusLabel, waterStatusColor } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';

export type PopupType = 'complaint' | 'drain' | 'tree' | 'water' | 'ward';

export interface PopupData {
  type:       PopupType;
  properties: Record<string, any>;
  lngLat?:    [number, number];
}

interface MapPopupProps {
  data:     PopupData;
  onClose:  () => void;
}

export default function MapPopup({ data, onClose }: MapPopupProps) {
  const { type, properties: p } = data;

  return (
    <div className="bg-white rounded-xl shadow-panel border border-slate-200 w-72 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className={cn(
        'px-3.5 py-2.5 flex items-center justify-between',
        type === 'complaint' && 'bg-blue-50 border-b border-blue-100',
        type === 'drain'     && 'bg-cyan-50 border-b border-cyan-100',
        type === 'tree'      && 'bg-green-50 border-b border-green-100',
        type === 'water'     && 'bg-purple-50 border-b border-purple-100',
        type === 'ward'      && 'bg-slate-50 border-b border-slate-100',
      )}>
        <div className="flex items-center gap-2">
          {type === 'complaint' && <AlertTriangle className="w-3.5 h-3.5 text-blue-600" />}
          {type === 'drain'     && <Waves           className="w-3.5 h-3.5 text-cyan-600" />}
          {type === 'tree'      && <TreePine         className="w-3.5 h-3.5 text-green-600" />}
          {type === 'water'     && <Droplets         className="w-3.5 h-3.5 text-purple-600" />}
          {type === 'ward'      && <MapPin           className="w-3.5 h-3.5 text-slate-600" />}
          <span className="text-xs font-semibold text-slate-800">
            {type === 'complaint' ? p.complaintNumber
              : type === 'drain'  ? p.drainName
              : type === 'tree'   ? p.treeCode
              : type === 'water'  ? p.sensorCode
              : `Ward ${p.wardNumber} — ${p.name}`}
          </span>
        </div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-black/10 transition">
          <X className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3 space-y-2">
        {type === 'complaint' && <ComplaintPopupBody p={p} />}
        {type === 'drain'     && <DrainPopupBody     p={p} />}
        {type === 'tree'      && <TreePopupBody      p={p} />}
        {type === 'water'     && <WaterPopupBody     p={p} />}
        {type === 'ward'      && <WardPopupBody      p={p} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

function ComplaintPopupBody({ p }: { p: Record<string, any> }) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={p.status} />
        <span className="badge bg-slate-100 text-slate-600 text-xs">{CATEGORY_LABELS[p.category] ?? p.category}</span>
      </div>
      {p.description && (
        <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-2 leading-relaxed line-clamp-3">
          {p.description}
        </p>
      )}
      <Row label="Ward"     value={`Ward ${p.wardNumber} — ${p.wardName}`} />
      <Row label="Priority" value={<span className={`font-semibold ${p.priorityScore >= 70 ? 'text-red-600' : p.priorityScore >= 40 ? 'text-yellow-600' : 'text-green-600'}`}>{p.priorityScore}/100</span>} />
      {p.submittedAt && <Row label="Submitted" value={fmt.relative(p.submittedAt)} />}
      <Link href={`/dashboard/complaints/${p.id}`}
        className="block text-center mt-1 text-xs text-brand-600 hover:underline font-medium py-1">
        View full complaint →
      </Link>
    </>
  );
}

function DrainPopupBody({ p }: { p: Record<string, any> }) {
  const { label, color, bg } = drainStatusLabel(p.status);
  const pct = Math.round(p.fillPct ?? (p.currentLevelCm / p.capacityCm) * 100);
  return (
    <>
      <span className="badge text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: bg, color }}>{label}</span>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">Water Level</span>
          <span className="font-semibold" style={{ color }}>{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <Row label="Level"    value={`${p.currentLevelCm} cm / ${p.capacityCm} cm`} />
      <Row label="Ward"     value={p.wardName} />
      <Row label="Sensor"   value={p.sensorCode} />
      {p.lastReading && <Row label="Updated" value={fmt.relative(p.lastReading)} />}
    </>
  );
}

function TreePopupBody({ p }: { p: Record<string, any> }) {
  const healthColor: Record<string, string> = {
    EXCELLENT: 'text-emerald-700', GOOD: 'text-green-600',
    FAIR: 'text-yellow-600', POOR: 'text-red-600', DEAD: 'text-slate-500',
  };
  return (
    <>
      <Row label="Species"  value={p.species ?? p.speciesCommon} />
      <Row label="Health"   value={<span className={`font-semibold ${healthColor[p.healthStatus] ?? ''}`}>{p.healthStatus}</span>} />
      {p.heightM    && <Row label="Height"  value={`${p.heightM} m`} />}
      {p.crownDiaM  && <Row label="Crown"   value={`${p.crownDiaM} m dia.`} />}
      {p.carbonKg   && <Row label="Carbon"  value={`${p.carbonKg} kg`} />}
      {p.plantedAt  && <Row label="Planted" value={fmt.date(p.plantedAt)} />}
    </>
  );
}

function WaterPopupBody({ p }: { p: Record<string, any> }) {
  const color = waterStatusColor(p.leakProbability ?? 0);
  return (
    <>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">Leak Probability</span>
          <span className="font-bold" style={{ color }}>{Math.round((p.leakProbability ?? 0) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${(p.leakProbability ?? 0) * 100}%`, background: color }} />
        </div>
      </div>
      <Row label="Pressure"    value={`${p.pressureBar ?? '—'} bar`} />
      <Row label="Flow"        value={`${p.flowLpm ?? '—'} L/min`} />
      {p.estimatedLossLph && <Row label="Est. loss" value={`${Math.round(p.estimatedLossLph)} L/hr`} />}
      <Row label="Status"      value={p.status} />
    </>
  );
}

function WardPopupBody({ p }: { p: Record<string, any> }) {
  return (
    <>
      <Row label="Population"    value={p.population?.toLocaleString('en-IN') ?? '—'} />
      <Row label="Area"          value={p.areaHa ? `${p.areaHa} ha` : '—'} />
      {p.total_complaints !== undefined && <Row label="Total complaints" value={p.total_complaints} />}
      {p.open_complaints  !== undefined && <Row label="Open"             value={<span className="text-orange-600 font-semibold">{p.open_complaints}</span>} />}
      {p.resolution_rate  !== undefined && <Row label="Resolution rate"  value={`${p.resolution_rate}%`} />}
    </>
  );
}


