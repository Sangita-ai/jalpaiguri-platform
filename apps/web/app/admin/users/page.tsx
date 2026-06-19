'use client';
import { useState } from 'react';
import DashboardShell from '../../../components/layout/DashboardShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../../lib/api';
import { ROLE_LABELS, ROLE_COLORS } from '../../../lib/auth';
import { fmt } from '../../../lib/utils';
import { Users, Plus, Search, UserX, Edit2, X, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const ALL_ROLES = ['CITIZEN','FIELD_WORKER','DEPT_HEAD','MUNICIPAL_OFFICER','CHAIRMAN','SUPER_ADMIN'];

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', phone:'', role:'FIELD_WORKER', wardNumber:'' });

  const { data, isLoading } = useQuery({
    queryKey: ['all-users', search, role],
    queryFn: () => usersApi.list({ search, role }),
  });

  const createMutation = useMutation({
    mutationFn: () => usersApi.create({ ...form, password: 'Demo@1234' }),
    onSuccess: () => { toast.success('User created'); qc.invalidateQueries({queryKey:['all-users']}); setAddModal(false); },
    onError: () => toast.error('Failed to create user'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { toast.success('User deactivated'); qc.invalidateQueries({queryKey:['all-users']}); },
  });

  const users = data?.data ?? data ?? [];

  return (
    <DashboardShell title="User Management">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} users · All roles</p>
        </div>
        <button onClick={() => setAddModal(true)} className="btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-44" value={role} onChange={e => setRole(e.target.value)}>
          <option value="">All Roles</option>
          {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS]}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr>
            <th>User</th><th>Role</th><th>Ward</th><th>Phone</th><th>Status</th><th>Created</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading && Array.from({length:6}).map((_,i) => (
              <tr key={i}><td colSpan={7}><div className="h-4 bg-slate-100 rounded animate-pulse"/></td></tr>
            ))}
            {users.map((u: any) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
                      {u.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge text-xs ${ROLE_COLORS[u.role as keyof typeof ROLE_COLORS] ?? 'bg-slate-100 text-slate-600'}`}>
                    <Shield className="w-2.5 h-2.5" />
                    {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                  </span>
                </td>
                <td className="text-xs text-slate-600">{u.ward?.name ?? '—'}</td>
                <td className="text-xs text-slate-600">{u.phone ?? '—'}</td>
                <td>
                  <span className={`badge text-xs ${u.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="text-xs text-slate-500">{fmt.date(u.createdAt)}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {u.isActive && (
                      <button onClick={() => deactivateMutation.mutate(u.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition">
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <div className="card-header">
              <h3 className="font-semibold">Create User</h3>
              <button onClick={()=>setAddModal(false)} className="btn-ghost p-1"><X className="w-4 h-4"/></button>
            </div>
            <div className="card-body space-y-3">
              {[
                {label:'Full Name',key:'name',type:'text'},
                {label:'Email',key:'email',type:'email'},
                {label:'Phone',key:'phone',type:'tel'},
              ].map(({label,key,type}) => (
                <div key={key} className="form-group">
                  <label className="label">{label}</label>
                  <input type={type} className="input" value={(form as any)[key]}
                    onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} />
                </div>
              ))}
              <div className="form-group">
                <label className="label">Role</label>
                <select className="select" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  {ALL_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Ward Number</label>
                <input type="number" min="1" max="20" className="input" placeholder="1–20"
                  value={form.wardNumber} onChange={e=>setForm(f=>({...f,wardNumber:e.target.value}))} />
              </div>
              <div className="alert-info text-xs">Initial password: Demo@1234</div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={()=>setAddModal(false)}>Cancel</button>
                <button className="btn-primary" disabled={!form.name||!form.email||createMutation.isPending}
                  onClick={()=>createMutation.mutate()}>
                  {createMutation.isPending?'Creating...':'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
