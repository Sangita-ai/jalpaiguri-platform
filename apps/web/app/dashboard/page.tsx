'use client';
import DashboardShell from '@/components/layout/DashboardShell';
import MetricCard from '@/components/ui/MetricCard';
import { MetricCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, complaintsApi } from '@/lib/api';
import { fmt, CATEGORY_LABELS, CATEGORY_COLORS, STATUS_LABELS } from '@/lib/utils';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  FileText, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Users, Droplets, TreePine, Activity
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: summary, isLoading: sLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
    refetchInterval: 60_000,
  });

  const { data: trend } = useQuery({
    queryKey: ['category-trend'],
    queryFn: () => dashboardApi.categoryTrend(30),
  });

  const { data: wardStats } = useQuery({
    queryKey: ['ward-stats'],
    queryFn: dashboardApi.wardStats,
  });

  const { data: recentComplaints } = useQuery({
    queryKey: ['recent-complaints'],
    queryFn: () => complaintsApi.list({ limit: 8, sortBy: 'submittedAt', sortOrder: 'desc' }),
  });

  const { data: slaData } = useQuery({
    queryKey: ['sla-report'],
    queryFn: dashboardApi.slaReport,
  });

  const METRICS = summary ? [
    { title: 'Total Complaints',   value: summary.total,          icon: FileText,     iconBg: 'bg-blue-50',   iconColor: 'text-blue-600',   subtitle: 'Last 90 days', trend: { value: summary.growthPct ?? 0, label: 'vs last month' } },
    { title: 'Pending Resolution', value: summary.pending,        icon: Clock,        iconBg: 'bg-orange-50', iconColor: 'text-orange-600', subtitle: 'Needs attention' },
    { title: 'Resolved',           value: summary.resolved,       icon: CheckCircle2, iconBg: 'bg-green-50',  iconColor: 'text-green-600',  subtitle: `${summary.resolutionRate ?? 0}% resolution rate` },
    { title: 'SLA Breaches',       value: summary.slaBreaches ?? 0, icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-600',  subtitle: 'Overdue complaints' },
    { title: 'Active Workers',     value: summary.activeWorkers ?? 0, icon: Users,    iconBg: 'bg-purple-50', iconColor: 'text-purple-600', subtitle: 'Field staff online' },
    { title: 'Drain Alerts',       value: summary.drainAlerts ?? 0,  icon: Droplets,  iconBg: 'bg-cyan-50',   iconColor: 'text-cyan-600',   subtitle: 'Overflow risk' },
    { title: 'Trees Monitored',    value: '5,000+',               icon: TreePine,     iconBg: 'bg-emerald-50',iconColor: 'text-emerald-600',subtitle: 'Across 20 wards' },
    { title: 'Avg Resolution',     value: `${summary.avgResolutionHours ?? 0}h`, icon: Activity, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', subtitle: 'Mean time to resolve' },
  ] : [];

  const categoryPieData = summary?.byCategory
    ? Object.entries(summary.byCategory).map(([k, v]) => ({
        name: CATEGORY_LABELS[k] ?? k,
        value: v as number,
        color: CATEGORY_COLORS[k],
      }))
    : [];

  return (
    <DashboardShell>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Municipal Operations Dashboard</h1>
          <p className="page-subtitle">
            Jalpaiguri Municipality · Live overview · Last updated {fmt.relative(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-slow" />
            System Operational
          </span>
          <Link href="/report" className="btn-primary btn-sm">
            <FileText className="w-3.5 h-3.5" /> New Report
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {sLoading
          ? Array.from({ length: 8 }).map((_, i) => <MetricCardSkeleton key={i} />)
          : METRICS.map((m) => <MetricCard key={m.title} {...m} />)
        }
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Trend chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">Complaint Trend — Last 30 Days</h3>
            <span className="text-xs text-slate-500">Daily volume by status</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend ?? MOCK_TREND}>
                <defs>
                  <linearGradient id="gSubmitted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#3b82f6" strokeWidth={2} fill="url(#gSubmitted)" />
                <Area type="monotone" dataKey="resolved"  name="Resolved"  stroke="#16a34a" strokeWidth={2} fill="url(#gResolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category pie */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">By Category</h3>
          </div>
          <div className="card-body flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={categoryPieData.length ? categoryPieData : MOCK_PIE}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={2} dataKey="value">
                  {(categoryPieData.length ? categoryPieData : MOCK_PIE).map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} complaints`, '']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-1.5 mt-2">
              {(categoryPieData.length ? categoryPieData : MOCK_PIE).slice(0, 5).map((e) => (
                <div key={e.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
                    <span className="text-slate-600">{e.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ward performance + recent complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Ward bar chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">Ward Performance</h3>
            <Link href="/dashboard/analytics" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(wardStats ?? MOCK_WARD_STATS).slice(0, 10)} layout="vertical" barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="ward_name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={80} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="open_complaints"   name="Open"     fill="#ef4444" radius={[0, 4, 4, 0]} />
                <Bar dataKey="resolved_complaints" name="Resolved" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent complaints table */}
        <div className="card lg:col-span-3">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">Recent Complaints</h3>
            <Link href="/dashboard/complaints" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">ID</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Ward</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {(recentComplaints?.data ?? MOCK_COMPLAINTS).map((c: any) => (
                  <tr key={c.id ?? c.complaintNumber} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link href={`/dashboard/complaints/${c.id}`} className="text-brand-600 hover:underline font-mono text-xs">
                        {c.complaintNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5"><CategoryBadge category={c.category} /></td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{c.ward?.name ?? c.wardName}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-2.5"><PriorityBadge score={c.priorityScore} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SLA summary strip */}
      {slaData && (
        <div className="mt-5 card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">SLA Compliance by Category</h3>
          </div>
          <div className="card-body grid grid-cols-2 md:grid-cols-4 gap-4">
            {(slaData.categories ?? MOCK_SLA).map((s: any) => (
              <div key={s.category} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-medium">{CATEGORY_LABELS[s.category] ?? s.category}</span>
                  <span className={`font-semibold ${s.compliancePct >= 80 ? 'text-green-600' : s.compliancePct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {s.compliancePct}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.compliancePct >= 80 ? 'bg-green-500' : s.compliancePct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${s.compliancePct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

// ── Fallback mock data for demo without API ─────────────────
const MOCK_TREND = Array.from({ length: 30 }, (_, i) => ({
  date: fmt.short(new Date(Date.now() - (29 - i) * 86400000)),
  submitted: Math.floor(8 + Math.random() * 12),
  resolved:  Math.floor(6 + Math.random() * 10),
}));

const MOCK_PIE = [
  { name: 'Garbage',       value: 160, color: '#ef4444' },
  { name: 'Road Damage',   value: 90,  color: '#f97316' },
  { name: 'Water Leakage', value: 70,  color: '#3b82f6' },
  { name: 'Drainage',      value: 65,  color: '#8b5cf6' },
  { name: 'Other',         value: 115, color: '#6b7280' },
];

const MOCK_WARD_STATS = Array.from({ length: 10 }, (_, i) => ({
  ward_name: `Ward ${i + 1}`,
  open_complaints: Math.floor(5 + Math.random() * 20),
  resolved_complaints: Math.floor(10 + Math.random() * 30),
}));

const MOCK_COMPLAINTS = Array.from({ length: 8 }, (_, i) => ({
  id: `mock-${i}`,
  complaintNumber: `CJPL-20240601-${String(i + 1).padStart(4, '0')}`,
  category: ['GARBAGE','WATER_LEAKAGE','ROAD_DAMAGE','DRAINAGE','STREETLIGHT_FAILURE'][i % 5],
  ward: { name: `Ward ${(i % 10) + 1}` },
  status: ['SUBMITTED','ASSIGNED','IN_PROGRESS','RESOLVED'][i % 4],
  priorityScore: [85, 65, 45, 30, 90, 55, 70, 40][i],
}));

const MOCK_SLA = [
  { category: 'GARBAGE',       compliancePct: 78 },
  { category: 'WATER_LEAKAGE', compliancePct: 91 },
  { category: 'DRAINAGE',      compliancePct: 65 },
  { category: 'ROAD_DAMAGE',   compliancePct: 54 },
];
