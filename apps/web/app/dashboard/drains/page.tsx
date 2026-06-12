'use client';
import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useQuery } from '@tanstack/react-query';
import { drainsApi } from '@/lib/api';
import { drainStatusLabel, fmt } from '@/lib/utils';
import { Waves, AlertTriangle, Activity, CheckCircle2, WifiOff } from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

function DrainGauge({ level, capacity, status }: { level: number; capacity: number; status: string }) {
  const pct = Math.min(100, (level / capacity) * 100);
  const { color } = drainStatusLabel(status);
  return (
    <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xs font-bold text-white drop-shadow">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function DrainsPage() {
  const [selectedSensor, setSelected] = useState<string | null>(null);
  const [wardFilter, setWardFilter] = useState('');

  const { data: sensors, isLoading } = useQuery({
    queryKey: ['drains'],
    queryFn: drainsApi.list,
    refetchInterval: 30_000,
  });

  const { data: history } = useQuery({
    queryKey: ['drain-history', selectedSensor],
    queryFn: () => drainsApi.history(selectedSensor!, 72),
    enabled: !!selectedSensor,
  });

  const selected = sensors?.find((s: any) => s.id === selectedSensor);

  const counts = sensors ? {
    total: sensors.length,
    normal: sensors.filter((s: any) => s.status === 'NORMAL').length,
    elevated: sensors.filter((s: any) => ['ELEVATED','HIGH'].includes(s.status)).length,
    critical: sensors.filter((s: any) => ['OVERFLOW_RISK','OVERFLOW'].includes(s.status)).length,
    offline: sensors.filter((s: any) => s.status === 'OFFLINE').length,
  } : { total: 0, normal: 0, elevated: 0, critical: 0, offline: 0 };

  const filtered = (sensors ?? []).filter((s: any) =>
    !wardFilter || s.ward?.name?.toLowerCase().includes(wardFilter.toLowerCase())
  );

  return (
    <DashboardShell title="Smart Drain Monitor">
      <div className="page-header">
        <div>
          <h1 className="page-title">Smart Drain Monitoring</h1>
          <p className="page-subtitle">60 IoT sensors across 20 wards · Simulated live data · Updates every 30s</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Live feed active
          </span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <MetricCard title="Total Sensors"  value={counts.total}    icon={Waves}         iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <MetricCard title="Normal"         value={counts.normal}   icon={CheckCircle2}  iconBg="bg-green-50"  iconColor="text-green-600" />
        <MetricCard title="Elevated/High"  value={counts.elevated} icon={Activity}      iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <MetricCard title="Overflow Risk"  value={counts.critical} icon={AlertTriangle} iconBg="bg-red-50"    iconColor="text-red-600" />
        <MetricCard title="Offline"        value={counts.offline}  icon={WifiOff}       iconBg="bg-slate-100" iconColor="text-slate-500" />
      </div>

      {counts.critical > 0 && (
        <div className="alert-danger mb-5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{counts.critical} sensor{counts.critical > 1 ? 's' : ''} at overflow risk</p>
            <p className="text-xs mt-0.5">Immediate inspection required. Click a sensor below for details.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sensor grid */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-3">
            <input className="input flex-1 max-w-xs" placeholder="Filter by ward..."
              value={wardFilter} onChange={e => setWardFilter(e.target.value)} />
            <span className="text-xs text-slate-500">{filtered.length} sensors</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            ))}
            {filtered.map((sensor: any) => {
              const { label, color, bg } = drainStatusLabel(sensor.status);
              const pct = Math.min(100, (sensor.currentLevelCm / sensor.capacityCm) * 100);
              const isSelected = selectedSensor === sensor.id;
              return (
                <div key={sensor.id}
                  onClick={() => setSelected(isSelected ? null : sensor.id)}
                  className={`card p-4 cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-brand-500 shadow-card-hover' : 'hover:shadow-card-hover'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{sensor.drainName}</p>
                      <p className="text-2xs text-slate-400 mt-0.5">{sensor.sensorCode} · {sensor.ward?.name}</p>
                    </div>
                    <span className="badge text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: bg, color }}>
                      {label}
                    </span>
                  </div>
                  <DrainGauge level={sensor.currentLevelCm} capacity={sensor.capacityCm} status={sensor.status} />
                  <div className="flex justify-between text-2xs text-slate-400 mt-1.5">
                    <span>{sensor.currentLevelCm}cm / {sensor.capacityCm}cm</span>
                    <span>{pct.toFixed(1)}% full</span>
                  </div>
                  {sensor.lastReading && (
                    <p className="text-2xs text-slate-400 mt-1.5">Updated {fmt.relative(sensor.lastReading)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="font-semibold text-slate-800">{selected.drainName}</h3>
                    <p className="text-xs text-slate-500">{selected.sensorCode}</p>
                  </div>
                  <span className="badge" style={{ background: drainStatusLabel(selected.status).bg, color: drainStatusLabel(selected.status).color }}>
                    {drainStatusLabel(selected.status).label}
                  </span>
                </div>
                <div className="card-body space-y-3">
                  {[
                    { l: 'Ward',           v: selected.ward?.name },
                    { l: 'Capacity',       v: `${selected.capacityCm} cm` },
                    { l: 'Current Level',  v: `${selected.currentLevelCm} cm` },
                    { l: 'Fill Level',     v: `${((selected.currentLevelCm/selected.capacityCm)*100).toFixed(1)}%` },
                    { l: 'Alert at',       v: `${selected.alertThreshold} cm` },
                    { l: 'Critical at',    v: `${selected.criticalThreshold} cm` },
                    { l: 'Last Reading',   v: selected.lastReading ? fmt.datetime(selected.lastReading) : '—' },
                    { l: 'Installed',      v: selected.installedAt ? fmt.date(selected.installedAt) : '—' },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between text-xs">
                      <span className="text-slate-500">{l}</span>
                      <span className="font-medium text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 72h history chart */}
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-slate-800">72-hour History</h3>
                  <span className="text-2xs text-slate-400">Level (cm)</span>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={history ?? MOCK_HISTORY}>
                      <defs>
                        <linearGradient id="drainGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, selected.capacityCm]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v) => [`${v} cm`, 'Level']} />
                      <ReferenceLine y={selected.alertThreshold}    stroke="#ca8a04" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'Alert', position: 'right', fontSize: 9, fill: '#ca8a04' }} />
                      <ReferenceLine y={selected.criticalThreshold} stroke="#dc2626" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'Critical', position: 'right', fontSize: 9, fill: '#dc2626' }} />
                      <Area type="monotone" dataKey="levelCm" name="Level (cm)" stroke="#06b6d4" strokeWidth={2} fill="url(#drainGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-8 text-center">
              <Waves className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Select a sensor to view detailed history and readings</p>
            </div>
          )}

          {/* Overall distribution chart */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-slate-800">Status Distribution</h3></div>
            <div className="card-body space-y-2.5">
              {[
                { label: 'Normal',        count: counts.normal,   color: '#16a34a' },
                { label: 'Elevated',      count: counts.elevated, color: '#ca8a04' },
                { label: 'Overflow Risk', count: counts.critical, color: '#dc2626' },
                { label: 'Offline',       count: counts.offline,  color: '#94a3b8' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-medium text-slate-800">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${counts.total ? (count/counts.total)*100 : 0}%`, background: color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

const MOCK_HISTORY = Array.from({ length: 48 }, (_, i) => ({
  hour: `${i}h`,
  levelCm: Math.max(10, 40 + Math.sin(i / 4) * 20 + Math.random() * 8),
}));
