'use client';
import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useQuery } from '@tanstack/react-query';
import { treesApi } from '@/lib/api';
import { fmt } from '@/lib/utils';
import MetricCard from '@/components/ui/MetricCard';
import { TreePine, Wind, BarChart3, Leaf, Sun, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const HEALTH_COLORS: Record<string, string> = {
  EXCELLENT: '#14532d', GOOD: '#16a34a', FAIR: '#ca8a04', POOR: '#dc2626', DEAD: '#6b7280',
};
const HEALTH_LABELS: Record<string, string> = {
  EXCELLENT: 'Excellent', GOOD: 'Good', FAIR: 'Fair', POOR: 'Poor', DEAD: 'Dead',
};

export default function TreesPage() {
  const [wardFilter, setWard] = useState('');
  const [healthFilter, setHealth] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'inventory' | 'analytics' | 'carbon'>('inventory');

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['trees', page, wardFilter, healthFilter],
    queryFn: () => treesApi.list({ page, limit: 25, wardId: wardFilter || undefined, healthStatus: healthFilter || undefined }),
  });
  const { data: stats }  = useQuery({ queryKey: ['tree-stats'],  queryFn: treesApi.stats  });
  const { data: carbon } = useQuery({ queryKey: ['tree-carbon'], queryFn: treesApi.carbon });

  const trees    = treeData?.data ?? MOCK_TREES;
  const tStats   = stats ?? MOCK_STATS;
  const cData    = carbon ?? MOCK_CARBON;
  const pagination = treeData?.pagination;

  const healthDist = MOCK_HEALTH_DIST;
  const speciesDist = MOCK_SPECIES_DIST;

  return (
    <DashboardShell title="Tree & Green Cover Intelligence">
      <div className="page-header">
        <div>
          <h1 className="page-title">Urban Tree & Green Cover Intelligence</h1>
          <p className="page-subtitle">5,000 trees across 20 wards · Species inventory · Carbon sequestration</p>
        </div>
        <button className="btn-primary btn-sm">
          <TreePine className="w-3.5 h-3.5" /> Add Tree Record
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <MetricCard title="Total Trees"      value={(tStats.total ?? 5000).toLocaleString()}  icon={TreePine} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <MetricCard title="Healthy Trees"    value={`${tStats.healthyPct ?? 76}%`}            icon={Leaf}     iconBg="bg-green-50"   iconColor="text-green-600"   subtitle="Excellent + Good" />
        <MetricCard title="CO₂ Sequestered" value={`${((cData.totalCarbonKg ?? 450000) / 1000).toFixed(0)} T`} icon={Wind}
          iconBg="bg-sky-50" iconColor="text-sky-600" subtitle="Tonnes per year" />
        <MetricCard title="Species Count"    value={tStats.species ?? 15}                     icon={BarChart3} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="Unique species" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-5">
        {(['inventory', 'analytics', 'carbon'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* INVENTORY TAB */}
      {tab === 'inventory' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <select className="select w-44" value={healthFilter} onChange={e => { setHealth(e.target.value); setPage(1); }}>
              <option value="">All Health Status</option>
              {Object.entries(HEALTH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <span className="text-sm text-slate-500 self-center">
              {pagination ? `${pagination.total.toLocaleString()} trees` : `${trees.length} trees shown`}
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tree Code</th>
                  <th>Species</th>
                  <th>Scientific Name</th>
                  <th>Ward</th>
                  <th>Height</th>
                  <th>Crown Dia.</th>
                  <th>Health</th>
                  <th>Carbon (kg)</th>
                  <th>Last Survey</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j}><div className="h-3 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))}
                {trees.map((t: any) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs text-brand-600">{t.treeCode}</td>
                    <td className="text-xs font-medium">{t.speciesCommon}</td>
                    <td className="text-xs text-slate-400 italic">{t.speciesScientific ?? '—'}</td>
                    <td className="text-xs">{t.ward?.name ?? `Ward ${t.wardId?.slice(-2)}`}</td>
                    <td className="text-xs">{t.heightM ? `${t.heightM} m` : '—'}</td>
                    <td className="text-xs">{t.crownDiaM ? `${t.crownDiaM} m` : '—'}</td>
                    <td>
                      <span className="badge border-0 text-white text-xs"
                        style={{ background: HEALTH_COLORS[t.healthStatus] ?? '#6b7280' }}>
                        {HEALTH_LABELS[t.healthStatus] ?? t.healthStatus}
                      </span>
                    </td>
                    <td className="text-xs font-medium text-emerald-700">{t.carbonKg ? t.carbonKg.toFixed(1) : '—'}</td>
                    <td className="text-xs text-slate-400">{t.lastSurveyed ? fmt.date(t.lastSurveyed) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center gap-2 mt-4 justify-end">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="btn-secondary btn-sm disabled:opacity-40">Prev</button>
              <span className="text-xs text-slate-500">Page {page} of {pagination.pages}</span>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
                className="btn-secondary btn-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Health distribution */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Health Distribution</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={healthDist} cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2} dataKey="value">
                    {healthDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} trees`, '']} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {healthDist.map(e => (
                  <div key={e.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                      <span className="text-slate-600">{e.name}</span>
                    </div>
                    <span className="font-semibold">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top species */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Top Species</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={speciesDist.slice(0, 8)} layout="vertical" barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={70} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" name="Trees" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ward-wise green cover radar */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Ward Green Cover</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={MOCK_WARD_RADAR}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="ward" tick={{ fontSize: 9 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 400]} tick={{ fontSize: 8 }} />
                  <Radar name="Trees" dataKey="trees" stroke="#16a34a" fill="#16a34a" fillOpacity={0.25} strokeWidth={1.5} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ward bar chart */}
          <div className="card lg:col-span-3">
            <div className="card-header">
              <h3 className="font-semibold">Ward-wise Tree Count & Health</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={MOCK_WARD_BARS} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="ward" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="healthy" name="Healthy"  fill="#16a34a" stackId="a" radius={[0,0,0,0]} />
                  <Bar dataKey="fair"    name="Fair"     fill="#ca8a04" stackId="a" />
                  <Bar dataKey="poor"    name="Poor/Dead" fill="#dc2626" stackId="a" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* CARBON TAB */}
      {tab === 'carbon' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
            {[
              { label: 'Total Carbon Stored',   value: `${((cData.totalCarbonKg ?? 450000)/1000).toFixed(1)} tonnes`,  icon: Wind,     bg: 'bg-sky-50',     color: 'text-sky-700'    },
              { label: 'Annual Sequestration',  value: `${((cData.annualKg ?? 45000)/1000).toFixed(1)} T CO₂/yr`,       icon: Leaf,     bg: 'bg-green-50',   color: 'text-green-700'  },
              { label: 'Equiv. Cars Offset',    value: `${cData.carsEquivalent ?? 9800}`,                               icon: Sun,      bg: 'bg-amber-50',   color: 'text-amber-700'  },
            ].map(({ label, value, icon: Icon, bg, color }) => (
              <div key={label} className={`card p-5 ${bg}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">{label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card lg:col-span-2">
            <div className="card-header"><h3 className="font-semibold">Carbon Sequestration by Ward</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={MOCK_CARBON_WARD} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="ward" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}T`} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }}
                    formatter={(v: any) => [`${(Number(v)/1000).toFixed(2)} tonnes`, 'Carbon']} />
                  <Bar dataKey="carbon" name="Carbon (kg)" fill="#16a34a" radius={[4, 4, 0, 0]}>
                    {MOCK_CARBON_WARD.map((e, i) => (
                      <Cell key={i} fill={e.carbon > 25000 ? '#14532d' : e.carbon > 20000 ? '#16a34a' : '#4ade80'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Carbon by Species</h3></div>
            <div className="card-body space-y-3">
              {MOCK_CARBON_SPECIES.map(({ name, total }) => (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">{name}</span>
                    <span className="text-emerald-700 font-semibold">{(total/1000).toFixed(1)} T</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(total / 90000) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

// ── Mock data ──────────────────────────────────────────────────
const MOCK_TREES = Array.from({ length: 25 }, (_, i) => ({
  id: `t-${i}`, treeCode: `JLP-T-${String(i+1).padStart(5,'0')}`,
  speciesCommon: ['Mango','Neem','Banyan','Gulmohar','Peepal','Rain Tree','Arjun'][i % 7],
  speciesScientific: ['Mangifera indica','Azadirachta indica','Ficus benghalensis','Delonix regia','Ficus religiosa','Samanea saman','Terminalia arjuna'][i % 7],
  ward: { name: `Ward ${(i % 20) + 1}` },
  heightM: +(5 + Math.random() * 18).toFixed(1),
  crownDiaM: +(2 + Math.random() * 10).toFixed(1),
  healthStatus: ['EXCELLENT','GOOD','GOOD','FAIR','POOR'][Math.floor(Math.random() * 5)],
  carbonKg: +(50 + Math.random() * 400).toFixed(1),
  lastSurveyed: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
}));

const MOCK_STATS  = { total: 5000, healthyPct: 76, species: 15 };
const MOCK_CARBON = { totalCarbonKg: 487000, annualKg: 48700, carsEquivalent: 10580 };

const MOCK_HEALTH_DIST = [
  { name: 'Excellent', value: 1200, color: '#14532d' },
  { name: 'Good',      value: 2600, color: '#16a34a' },
  { name: 'Fair',      value: 750,  color: '#ca8a04' },
  { name: 'Poor',      value: 320,  color: '#dc2626' },
  { name: 'Dead',      value: 130,  color: '#6b7280' },
];

const MOCK_SPECIES_DIST = [
  { name: 'Mango',     count: 900 }, { name: 'Neem',       count: 500 },
  { name: 'Banyan',    count: 400 }, { name: 'Gulmohar',   count: 450 },
  { name: 'Peepal',    count: 350 }, { name: 'Rain Tree',  count: 200 },
  { name: 'Arjun',     count: 180 }, { name: 'Bamboo',     count: 250 },
];

const MOCK_WARD_RADAR = Array.from({ length: 8 }, (_, i) => ({
  ward: `W${i+1}`, trees: Math.floor(150 + Math.random() * 300),
}));

const MOCK_WARD_BARS = Array.from({ length: 20 }, (_, i) => ({
  ward: `W${i+1}`,
  healthy: Math.floor(100 + Math.random() * 250),
  fair:    Math.floor(10  + Math.random() * 60),
  poor:    Math.floor(5   + Math.random() * 30),
}));

const MOCK_CARBON_WARD = Array.from({ length: 20 }, (_, i) => ({
  ward: `W${i+1}`, carbon: Math.floor(15000 + Math.random() * 20000),
}));

const MOCK_CARBON_SPECIES = [
  { name: 'Banyan',     total: 88000 }, { name: 'Rain Tree', total: 75000 },
  { name: 'Mango',      total: 62000 }, { name: 'Arjun',     total: 48000 },
  { name: 'Neem',       total: 40000 }, { name: 'Peepal',    total: 35000 },
];
