'use client';
import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useQuery } from '@tanstack/react-query';
import { waterApi } from '@/lib/api';
import { waterStatusColor, fmt } from '@/lib/utils';
import MetricCard from '@/components/ui/MetricCard';
import { Droplets, AlertTriangle, Activity, CheckCircle2, Gauge, TrendingUp } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, BarChart, Bar, Legend
} from 'recharts';

function LeakProbBar({ prob }: { prob: number }) {
  const color = waterStatusColor(prob);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${prob * 100}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right" style={{ color }}>{(prob * 100).toFixed(0)}%</span>
    </div>
  );
}

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  NORMAL:         { label: 'Normal',         bg: 'bg-green-50',  text: 'text-green-700'  },
  ANOMALY:        { label: 'Anomaly',        bg: 'bg-yellow-50', text: 'text-yellow-700' },
  LEAK_SUSPECTED: { label: 'Leak Suspected', bg: 'bg-orange-50', text: 'text-orange-700' },
  LEAK_CONFIRMED: { label: 'Leak Confirmed', bg: 'bg-red-50',    text: 'text-red-700'    },
  OFFLINE:        { label: 'Offline',        bg: 'bg-slate-100', text: 'text-slate-500'  },
};

export default function WaterPage() {
  const [tab, setTab] = useState<'sensors' | 'pipes' | 'analytics'>('sensors');

  const { data: sensors, isLoading: sLoad } = useQuery({
    queryKey: ['water-sensors'],
    queryFn: waterApi.sensors,
    refetchInterval: 45_000,
  });
  const { data: leaks } = useQuery({ queryKey: ['water-leaks'], queryFn: waterApi.leaks, refetchInterval: 45_000 });
  const { data: pipes } = useQuery({ queryKey: ['water-pipes'], queryFn: waterApi.pipes });
  const { data: summary } = useQuery({ queryKey: ['water-summary'], queryFn: waterApi.summary });

  const sensorList: any[] = sensors ?? MOCK_SENSORS;
  const leakList: any[]   = leaks   ?? MOCK_LEAKS;
  const pipeList: any[]   = pipes   ?? MOCK_PIPES;

  const counts = {
    total:         sensorList.length,
    normal:        sensorList.filter(s => s.status === 'NORMAL').length,
    anomaly:       sensorList.filter(s => s.status === 'ANOMALY').length,
    leakSuspected: sensorList.filter(s => s.status === 'LEAK_SUSPECTED').length,
    leakConfirmed: sensorList.filter(s => s.status === 'LEAK_CONFIRMED').length,
  };

  const totalLossLph = leakList.reduce((a, s) => a + (s.estimatedLossLph ?? 0), 0);

  return (
    <DashboardShell title="Water Network Monitor">
      <div className="page-header">
        <div>
          <h1 className="page-title">Water Leakage Monitoring</h1>
          <p className="page-subtitle">Pipeline network · IoT pressure sensors · Simulated live data</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          Monitoring active
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <MetricCard title="Active Sensors"   value={counts.total}         icon={Gauge}         iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <MetricCard title="Leak Confirmed"   value={counts.leakConfirmed} icon={AlertTriangle} iconBg="bg-red-50"    iconColor="text-red-600"
          subtitle={counts.leakConfirmed > 0 ? 'Immediate action required' : 'None detected'} />
        <MetricCard title="Leak Suspected"   value={counts.leakSuspected} icon={Activity}      iconBg="bg-orange-50" iconColor="text-orange-600" />
        <MetricCard title="Est. Water Loss"  value={`${totalLossLph.toFixed(0)} L/h`} icon={Droplets}
          iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="Across all active leaks" />
      </div>

      {/* High-probability alert strip */}
      {leakList.filter(s => s.leakProbability > 0.7).length > 0 && (
        <div className="alert-danger mb-5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {leakList.filter(s => s.leakProbability > 0.7).length} high-probability leaks detected
            </p>
            <p className="text-xs mt-0.5">
              Estimated combined water loss: {leakList.filter(s => s.leakProbability > 0.7).reduce((a, s) => a + (s.estimatedLossLph ?? 0), 0).toFixed(0)} L/h.
              Dispatch field team for inspection.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-5">
        {(['sensors', 'pipes', 'analytics'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* SENSORS TAB */}
      {tab === 'sensors' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* All sensors table */}
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h3 className="font-semibold text-slate-800">All Water Sensors</h3>
              <span className="text-xs text-slate-500">{sensorList.length} sensors</span>
            </div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Sensor</th>
                    <th>Pipe</th>
                    <th>Pressure (bar)</th>
                    <th>Flow (L/min)</th>
                    <th>Leak Probability</th>
                    <th>Est. Loss (L/h)</th>
                    <th>Status</th>
                    <th>Last Reading</th>
                  </tr>
                </thead>
                <tbody>
                  {sensorList.slice(0, 40).map((s: any) => {
                    const meta = STATUS_META[s.status] ?? STATUS_META.OFFLINE;
                    return (
                      <tr key={s.id}>
                        <td className="font-mono text-xs">{s.sensorCode}</td>
                        <td className="text-xs text-slate-500">{s.pipe?.pipeCode ?? s.pipeCode ?? '—'}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Gauge className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-medium">{s.pressureBar?.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="text-xs">{s.flowLpm?.toFixed(1)}</td>
                        <td className="min-w-[140px]"><LeakProbBar prob={s.leakProbability ?? 0} /></td>
                        <td className="text-xs font-medium text-red-600">
                          {s.estimatedLossLph ? `${s.estimatedLossLph.toFixed(0)}` : '—'}
                        </td>
                        <td>
                          <span className={`badge ${meta.bg} ${meta.text} border-0`}>{meta.label}</span>
                        </td>
                        <td className="text-xs text-slate-400">{s.lastReading ? fmt.relative(s.lastReading) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PIPES TAB */}
      {tab === 'pipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h3 className="font-semibold text-slate-800">Pipeline Inventory</h3>
              <span className="text-xs text-slate-500">{pipeList.length} pipes</span>
            </div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Pipe Code</th>
                    <th>Ward</th>
                    <th>Material</th>
                    <th>Diameter</th>
                    <th>Installed</th>
                    <th>Length</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {pipeList.map((p: any) => {
                    const condColor = p.condition === 'GOOD' ? 'text-green-700 bg-green-50'
                      : p.condition === 'FAIR' ? 'text-yellow-700 bg-yellow-50'
                      : p.condition === 'POOR' ? 'text-orange-700 bg-orange-50'
                      : 'text-red-700 bg-red-50';
                    return (
                      <tr key={p.id}>
                        <td className="font-mono text-xs">{p.pipeCode}</td>
                        <td className="text-xs">{p.ward?.name ?? '—'}</td>
                        <td className="text-xs">{p.material}</td>
                        <td className="text-xs">{p.diameterMm} mm</td>
                        <td className="text-xs">{p.installationYear ?? '—'}</td>
                        <td className="text-xs">{p.lengthM ? `${p.lengthM.toFixed(0)} m` : '—'}</td>
                        <td><span className={`badge ${condColor} border-0`}>{p.condition}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Condition breakdown */}
          <div className="space-y-4">
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-slate-800">Pipe Condition</h3></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={PIPE_CONDITION_DATA(pipeList)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="condition" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Pipes" radius={[4, 4, 0, 0]}>
                      {PIPE_CONDITION_DATA(pipeList).map((e, i) => (
                        <Cell key={i} fill={['#16a34a','#ca8a04','#ea580c','#dc2626'][i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-slate-800">Aging Analysis</h3></div>
              <div className="card-body space-y-3 text-sm">
                {[
                  { range: '< 10 years', count: pipeList.filter((p: any) => p.installationYear && (2024 - p.installationYear) < 10).length, color: 'bg-green-500' },
                  { range: '10–20 years', count: pipeList.filter((p: any) => p.installationYear && (2024 - p.installationYear) >= 10 && (2024 - p.installationYear) < 20).length, color: 'bg-yellow-500' },
                  { range: '20–30 years', count: pipeList.filter((p: any) => p.installationYear && (2024 - p.installationYear) >= 20 && (2024 - p.installationYear) < 30).length, color: 'bg-orange-500' },
                  { range: '30+ years',   count: pipeList.filter((p: any) => p.installationYear && (2024 - p.installationYear) >= 30).length, color: 'bg-red-500' },
                ].map(({ range, count, color }) => (
                  <div key={range}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{range}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pipeList.length ? (count / pipeList.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-slate-800">Pressure vs Leak Probability</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="pressure" name="Pressure (bar)" tick={{ fontSize: 10 }} label={{ value: 'Pressure (bar)', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                  <YAxis dataKey="leak" name="Leak Prob" tick={{ fontSize: 10 }} label={{ value: 'Leak Prob', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: 8, fontSize: 11 }}
                    formatter={(v: any, n: any) => [typeof v === 'number' ? v.toFixed(3) : v, n]} />
                  <Scatter data={sensorList.map((s: any) => ({ pressure: s.pressureBar, leak: s.leakProbability, status: s.status }))}>
                    {sensorList.map((_: any, i: number) => (
                      <Cell key={i} fill={waterStatusColor(sensorList[i]?.leakProbability ?? 0)} opacity={0.75} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-slate-800">Leak Probability Distribution</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={PROB_BUCKETS(sensorList)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" name="Sensors" radius={[4, 4, 0, 0]}>
                    {PROB_BUCKETS(sensorList).map((e, i) => (
                      <Cell key={i} fill={['#16a34a', '#16a34a', '#ca8a04', '#ea580c', '#dc2626'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card lg:col-span-2">
            <div className="card-header">
              <h3 className="font-semibold text-slate-800">Confirmed & Suspected Leaks — Priority List</h3>
              <span className="text-xs text-red-600 font-medium">{leakList.length} active leaks</span>
            </div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Sensor</th><th>Pipe</th><th>Ward</th>
                    <th>Leak Probability</th><th>Est. Loss (L/h)</th><th>Status</th><th>Coordinates</th>
                  </tr>
                </thead>
                <tbody>
                  {leakList.sort((a: any, b: any) => b.leakProbability - a.leakProbability).map((s: any) => {
                    const meta = STATUS_META[s.status] ?? STATUS_META.OFFLINE;
                    return (
                      <tr key={s.id}>
                        <td className="font-mono text-xs">{s.sensorCode}</td>
                        <td className="text-xs">{s.pipeCode ?? '—'}</td>
                        <td className="text-xs">{s.ward_name ?? s.wardName ?? '—'}</td>
                        <td className="min-w-[160px]"><LeakProbBar prob={s.leakProbability} /></td>
                        <td className="text-xs font-semibold text-red-600">{s.estimatedLossLph?.toFixed(0) ?? '—'}</td>
                        <td><span className={`badge ${meta.bg} ${meta.text} border-0`}>{meta.label}</span></td>
                        <td className="text-xs text-slate-400 font-mono">
                          {s.locationLat?.toFixed(4)}, {s.locationLng?.toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function PIPE_CONDITION_DATA(pipes: any[]) {
  const conds = ['GOOD', 'FAIR', 'POOR', 'CRITICAL'];
  return conds.map(c => ({ condition: c, count: pipes.filter(p => p.condition === c).length }));
}

function PROB_BUCKETS(sensors: any[]) {
  return [
    { bucket: '0–20%',  count: sensors.filter(s => s.leakProbability < 0.2).length },
    { bucket: '20–40%', count: sensors.filter(s => s.leakProbability >= 0.2 && s.leakProbability < 0.4).length },
    { bucket: '40–60%', count: sensors.filter(s => s.leakProbability >= 0.4 && s.leakProbability < 0.6).length },
    { bucket: '60–80%', count: sensors.filter(s => s.leakProbability >= 0.6 && s.leakProbability < 0.8).length },
    { bucket: '80–100%',count: sensors.filter(s => s.leakProbability >= 0.8).length },
  ];
}

const MOCK_SENSORS = Array.from({ length: 40 }, (_, i) => {
  const prob = Math.random();
  return {
    id: `ws-${i}`, sensorCode: `WS-W${String(Math.floor(i/2)+1).padStart(2,'0')}-P1-${(i%2)+1}`,
    pipeCode: `WP-W${String(Math.floor(i/2)+1).padStart(2,'0')}-01`,
    pressureBar: +(2 + Math.random() * 3).toFixed(2),
    flowLpm: +(20 + Math.random() * 100).toFixed(1),
    leakProbability: +prob.toFixed(3),
    estimatedLossLph: prob > 0.5 ? +(50 + Math.random() * 750).toFixed(0) : null,
    status: prob > 0.75 ? 'LEAK_CONFIRMED' : prob > 0.5 ? 'LEAK_SUSPECTED' : prob > 0.25 ? 'ANOMALY' : 'NORMAL',
    lastReading: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    locationLat: 26.54 + (Math.random() - 0.5) * 0.06,
    locationLng: 88.71 + (Math.random() - 0.5) * 0.06,
  };
});
const MOCK_LEAKS = MOCK_SENSORS.filter(s => s.leakProbability > 0.5);
const MOCK_PIPES = Array.from({ length: 40 }, (_, i) => ({
  id: `wp-${i}`, pipeCode: `WP-W${String(Math.floor(i/2)+1).padStart(2,'0')}-0${(i%2)+1}`,
  ward: { name: `Ward ${Math.floor(i/2)+1}` },
  material: ['Cast Iron','PVC','Ductile Iron','GI','HDPE'][i % 5],
  diameterMm: [100,150,200,250,300][i % 5],
  installationYear: 1985 + Math.floor(Math.random() * 35),
  lengthM: +(150 + Math.random() * 650).toFixed(0),
  condition: ['GOOD','FAIR','POOR','CRITICAL'][Math.floor(Math.random() * 4)],
}));
