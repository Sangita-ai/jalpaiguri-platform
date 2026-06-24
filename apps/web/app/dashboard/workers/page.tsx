'use client';
import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, usersApi } from '@/lib/api';
import { fmt, CATEGORY_LABELS } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import MetricCard from '@/components/ui/MetricCard';
import { Users, CheckCircle2, Clock, AlertTriangle, Plus, X, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WorkersPage() {
  const qc = useQueryClient();
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', phone:'', wardNumber:'' });

  const { data: workers, isLoading } = useQuery({ queryKey:['all-workers'], queryFn: usersApi.workers });
  const { data: stats } = useQuery({ queryKey:['worker-stats'], queryFn: dashboardApi.workers });

  const createMutation = useMutation({
    mutationFn: () => usersApi.create({ ...form, role:'FIELD_WORKER', password:'Demo@1234' }),
    onSuccess: () => { toast.success('Worker created'); qc.invalidateQueries({queryKey:['all-workers']}); setAddModal(false); setForm({name:'',email:'',phone:'',wardNumber:''}); },
    onError: () => toast.error('Failed to create worker'),
  });

  const workerList = workers?.data ?? [];

const totals = {
  total: workerList.length,
  active:
    stats?.active ??
    workerList.filter((w: any) => w.is_active).length,
  tasksOpen: stats?.openTasks ?? 0,
  tasksToday: stats?.completedToday ?? 0,
};

  return (
    <DashboardShell title="Field Workers">
      <div className="page-header">
        <div>
          <h1 className="page-title">Field Worker Management</h1>
          <p className="page-subtitle">{totals.total} workers across 20 wards</p>
        </div>
        <button onClick={() => setAddModal(true)} className="btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" /> Add Worker
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <MetricCard title="Total Workers"     value={totals.total}      icon={Users}         iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <MetricCard title="Active Today"      value={totals.active}     icon={CheckCircle2}  iconBg="bg-green-50"  iconColor="text-green-600" />
        <MetricCard title="Open Tasks"        value={totals.tasksOpen}  icon={Clock}         iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <MetricCard title="Completed Today"   value={totals.tasksToday} icon={AlertTriangle} iconBg="bg-purple-50" iconColor="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading && Array.from({length:8}).map((_,i)=>(
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-200" />
              <div className="flex-1"><div className="h-3.5 bg-slate-200 rounded w-3/4 mb-1.5"/><div className="h-3 bg-slate-100 rounded w-1/2"/></div>
            </div>
            <div className="h-3 bg-slate-100 rounded w-full mb-1.5"/>
            <div className="h-3 bg-slate-100 rounded w-2/3"/>
          </div>
        ))}
        {(workers ?? []).map((w: any) => (
          <div key={w.id} className="card p-4 hover:shadow-card-hover transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {w.full_name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{w.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{w.email}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              {w.phone && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Phone className="w-3 h-3 text-slate-400" />{w.phone}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3 h-3 text-slate-400" />{w.ward?.name ?? 'Unassigned'}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className={`text-2xs font-medium px-2 py-0.5 rounded-full ${w.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {w.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-2xs text-slate-400">
                {w._count?.assignedTasks ?? 0} tasks
              </span>
            </div>
          </div>
        ))}
      </div>

      {addModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <div className="card-header">
              <h3 className="font-semibold">Add Field Worker</h3>
              <button onClick={()=>setAddModal(false)} className="btn-ghost p-1"><X className="w-4 h-4"/></button>
            </div>
            <div className="card-body space-y-3">
              {[
                { label:'Full Name', key:'name', type:'text', placeholder:'Ratan Mandal' },
                { label:'Email',     key:'email',type:'email',placeholder:'worker@jalpaiguri.gov.in' },
                { label:'Phone',     key:'phone',type:'tel', placeholder:'9832XXXXXX' },
                { label:'Ward No.',  key:'wardNumber',type:'number',placeholder:'1–20' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className="form-group">
                  <label className="label">{label}</label>
                  <input type={type} className="input" placeholder={placeholder}
                    value={(form as any)[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} />
                </div>
              ))}
              <div className="alert-info text-xs">Default password: Demo@1234 (worker must change on first login)</div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary" onClick={()=>setAddModal(false)}>Cancel</button>
                <button className="btn-primary" disabled={!form.name||!form.email||createMutation.isPending}
                  onClick={()=>createMutation.mutate()}>
                  {createMutation.isPending?'Creating...':'Create Worker'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
