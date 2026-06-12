'use client';
import DashboardShell from '@/components/layout/DashboardShell';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { fmt, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils';
import MetricCard from '@/components/ui/MetricCard';
import { TrendingUp, Clock, Target, Users, Award, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, ComposedChart, Scatter
} from 'recharts';

export default function AnalyticsPage() {
  const { data: wardStats } = useQuery({ queryKey: ['ward-stats'], queryFn: dashboardApi.wardStats });
  const { data: sla }       = useQuery({ queryKey: ['sla-report'], queryFn: dashboardApi.slaReport });
  const { data: workers }   = useQuery({ queryKey: ['workers'],    queryFn: dashboardApi.workers });

  const ws  = wardStats ?? MOCK_WARD_STATS;
  const slaD = sla?.categories ?? MOCK_SLA;

  return (
    <DashboardShell title="Analytics & Reports">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Performance Reports</h1>
          <p className="page-subtitle">90-day operational intelligence · SLA compliance · Ward benchmarking</p>
        </div>
        <button className="btn-secondary btn-sm">
          <BarChart3 className="w-3.5 h-3.5" /> Export Report
        </button>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Avg Resolution Time" value="18.4h" icon={Clock}     iconBg="bg-blue-50"   iconColor="text-blue-600"   subtitle="Target: 24h" />
        <MetricCard title="SLA Compliance"       value="79%"  icon={Target}    iconBg="bg-green-50"  iconColor="text-green-600"  subtitle="↑ 4% vs last month" />
        <MetricCard title="Worker Efficiency"    value="87%"  icon={Users}     iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="Tasks completed on time" />
        <MetricCard title="Citizen Satisfaction" value="4.1★" icon={Award}     iconBg="bg-amber-50"  iconColor="text-amber-600"  subtitle="Based on resolved cases" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Monthly trend */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">Monthly Complaint Volume (12 months)</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={MOCK_MONTHLY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="submitted" name="Submitted" fill="#93c5fd" radius={[3,3,0,0]} barSize={14} />
                <Bar dataKey="resolved"  name="Resolved"  fill="#4ade80" radius={[3,3,0,0]} barSize={14} />
                <Line dataKey="resolutionRate" name="Resolution %" yAxisId={1}
                  type="monotone" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">Complaint Category Analysis</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={MOCK_CAT_BREAKDOWN} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 9 }} width={90} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="submitted" name="Submitted" radius={[0, 2, 2, 0]}>
                  {MOCK_CAT_BREAKDOWN.map((e, i) => <Cell key={i} fill={Object.values(CATEGORY_COLORS)[i % 8]} />)}
                </Bar>
                <Bar dataKey="resolved" name="Resolved" fill="#4ade80" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SLA compliance heatmap */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">SLA Compliance by Category</h3>
          </div>
          <div className="card-body space-y-3">
            {slaD.map((s: any) => (
              <div key={s.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">{CATEGORY_LABELS[s.category] ?? s.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Target: {s.targetHours}h</span>
                    <span className={`font-bold ${s.compliancePct >= 80 ? 'text-green-600' : s.compliancePct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {s.compliancePct}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${s.compliancePct}%`,
                      background: s.compliancePct >= 80 ? '#16a34a' : s.compliancePct >= 60 ? '#ca8a04' : '#dc2626',
                    }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ward resolution rate */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">Ward Resolution Rate Ranking</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ws.slice(0, 15).sort((a: any, b: any) => (b.resolution_rate ?? 0) - (a.resolution_rate ?? 0))} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="ward_name" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={40} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Resolution Rate']} />
                <Bar dataKey="resolution_rate" name="Resolution Rate" radius={[3, 3, 0, 0]}>
                  {ws.map((_: any, i: number) => (
                    <Cell key={i} fill={i < 5 ? '#16a34a' : i < 10 ? '#ca8a04' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Resolution time heatmap table */}
      <div className="card mb-5">
        <div className="card-header">
          <h3 className="font-semibold text-slate-800">Ward Performance Scorecard</h3>
          <span className="text-xs text-slate-500">Last 90 days</span>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Ward</th>
                <th>Total</th>
                <th>Open</th>
                <th>Resolved</th>
                <th>Resolution Rate</th>
                <th>Avg Resolution</th>
                <th>Trees</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {ws.map((w: any) => {
                const rate = w.resolution_rate ?? Math.floor(40 + Math.random() * 55);
                const score = rate >= 80 ? 'A' : rate >= 65 ? 'B' : rate >= 50 ? 'C' : 'D';
                const scoreColor = score === 'A' ? 'text-green-700 bg-green-50' : score === 'B' ? 'text-blue-700 bg-blue-50' : score === 'C' ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';
                return (
                  <tr key={w.ward_id ?? w.wardId}>
                    <td className="font-medium text-slate-800 text-xs">{w.ward_name ?? w.wardName}</td>
                    <td className="text-xs">{w.total_complaints ?? '—'}</td>
                    <td className="text-xs text-orange-600 font-medium">{w.open_complaints ?? '—'}</td>
                    <td className="text-xs text-green-600 font-medium">{w.resolved_complaints ?? '—'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-medium">{rate}%</span>
                      </div>
                    </td>
                    <td className="text-xs">{w.avg_resolution_hours ? `${Number(w.avg_resolution_hours).toFixed(1)}h` : '—'}</td>
                    <td className="text-xs">{w.total_trees ?? Math.floor(150 + Math.random() * 350)}</td>
                    <td>
                      <span className={`badge border-0 font-bold text-xs ${scoreColor}`}>{score}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution time distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-800">Resolution Time Distribution</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MOCK_RESOLUTION_DIST}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" name="Complaints" radius={[4, 4, 0, 0]}>
                  {MOCK_RESOLUTION_DIST.map((e, i) => (
                    <Cell key={i} fill={i === 0 ? '#16a34a' : i === 1 ? '#4ade80' : i === 2 ? '#ca8a04' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-800">Weekly Pattern (Hour of Submission)</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MOCK_HOURLY}>
                <defs>
                  <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="count" name="Complaints" stroke="#3b82f6" strokeWidth={2} fill="url(#hourGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

// ── Mock data ──────────────────────────────────────────────────
const MOCK_MONTHLY = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'].map(m => ({
  month: m,
  submitted: Math.floor(120 + Math.random() * 80),
  resolved:  Math.floor(100 + Math.random() * 80),
  resolutionRate: Math.floor(65 + Math.random() * 30),
}));

const MOCK_CAT_BREAKDOWN = Object.entries(CATEGORY_LABELS).map(([k, v]) => ({
  category: v,
  submitted: Math.floor(20 + Math.random() * 150),
  resolved:  Math.floor(15 + Math.random() * 130),
}));

const MOCK_WARD_STATS = Array.from({ length: 20 }, (_, i) => ({
  ward_id: `w-${i}`, ward_name: `Ward ${i+1}`,
  total_complaints: Math.floor(20 + Math.random() * 60),
  open_complaints:  Math.floor(5  + Math.random() * 25),
  resolved_complaints: Math.floor(15 + Math.random() * 40),
  resolution_rate: Math.floor(40 + Math.random() * 55),
  avg_resolution_hours: (8 + Math.random() * 60).toFixed(1),
  total_trees: Math.floor(150 + Math.random() * 350),
}));

const MOCK_SLA = Object.keys(CATEGORY_LABELS).map(k => ({
  category: k, compliancePct: Math.floor(50 + Math.random() * 48),
  targetHours: [24, 8, 12, 24, 72, 48, 48, 72][Object.keys(CATEGORY_LABELS).indexOf(k)],
}));

const MOCK_RESOLUTION_DIST = [
  { range: '< 8h',    count: 89  },
  { range: '8–24h',   count: 156 },
  { range: '24–72h',  count: 134 },
  { range: '72h+',    count: 62  },
];

const MOCK_HOURLY = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h}:00`,
  count: h >= 7 && h <= 21 ? Math.floor(8 + Math.random() * 18) : Math.floor(1 + Math.random() * 5),
}));
