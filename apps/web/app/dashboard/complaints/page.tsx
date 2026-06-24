'use client';
import { useState, useCallback } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi, usersApi } from '@/lib/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { fmt, CATEGORY_LABELS, STATUS_LABELS } from '@/lib/utils';
import { TableRowSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';
import {
  Search, Filter, ChevronLeft, ChevronRight, Eye,
  UserCheck, RefreshCw, Download, FileText, X, MapPin
} from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['GARBAGE','WATER_LEAKAGE','WATER_SUPPLY','DRAINAGE','ROAD_DAMAGE','STREETLIGHT_FAILURE','ILLEGAL_DUMPING','OTHER'];
const STATUSES   = ['SUBMITTED','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED'];

export default function ComplaintsPage() {
  const qc = useQueryClient();
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('');
  const [category, setCategory]   = useState('');
  const [priority, setPriority]   = useState('');
  const [selected, setSelected]   = useState<string[]>([]);
  const [assignModal, setAssign]  = useState<string | null>(null);
  const [workerId, setWorkerId]   = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', page, search, status, category, priority],
    queryFn: () => complaintsApi.list({ page, limit: 20, search, status, category, priority }),
    
  });

  const { data: workers } = useQuery({
    queryKey: ['workers'],
    queryFn: usersApi.workers,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, wId }: { id: string; wId: string }) => complaintsApi.assign(id, wId),
    onSuccess: () => {
      toast.success('Complaint assigned successfully');
      qc.invalidateQueries({ queryKey: ['complaints'] });
      setAssign(null);
      setWorkerId('');
    },
    onError: () => toast.error('Assignment failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) => complaintsApi.updateStatus(id, s),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const resetFilters = () => {
    setSearch(''); setStatus(''); setCategory(''); setPriority(''); setPage(1);
  };

  const complaints = data?.data ?? [];

// console.log("COMPLAINT DATA =", complaints);
  const pagination = data?.pagination;
  const hasFilters = !!(search || status || category || priority);

  return (
    <DashboardShell title="Complaints Management">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Complaints</h1>
          <p className="page-subtitle">
            {pagination ? `${pagination.total} total complaints · Page ${pagination.page} of ${pagination.pages}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <Link href="/report" className="btn-primary btn-sm">
            <FileText className="w-3.5 h-3.5" /> New Complaint
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9" placeholder="Search complaints, IDs, addresses..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="select w-40" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select className="select w-44" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <select className="select w-36" value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }}>
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
          </select>
          {hasFilters && (
            <button className="btn-ghost btn-sm" onClick={resetFilters}>
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
          <button className="btn-secondary btn-sm ml-auto" onClick={() => qc.invalidateQueries({ queryKey: ['complaints'] })}>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-brand-50 border border-brand-200 rounded-xl text-sm">
          <span className="text-brand-700 font-medium">{selected.length} selected</span>
          <button className="btn-secondary btn-sm" onClick={() => setAssign(selected[0])}>
            <UserCheck className="w-3.5 h-3.5" /> Assign
          </button>
          <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th className="w-10">
                <input type="checkbox"
                  checked={selected.length === complaints.length && complaints.length > 0}
                  onChange={e => setSelected(e.target.checked ? complaints.map((c: any) => c.id) : [])}
                  className="rounded border-slate-300"
                />
              </th>
              <th>Complaint ID</th>
              <th>Category</th>
              <th>Ward</th>
              <th>Description</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={9} />)}
            {!isLoading && complaints.length === 0 && (
              <tr><td colSpan={9}>
                <EmptyState icon={FileText} title="No complaints found"
                  description={hasFilters ? 'Try adjusting your filters.' : 'No complaints have been submitted yet.'} />
              </td></tr>
            )}
            {/* console.log("COMPLAINTS =", complaints); */}
            {complaints.map((c: any) => (
              <tr key={c.id}>
                <td>
                  <input type="checkbox" checked={selected.includes(c.id)}
                    onChange={() => toggleSelect(c.id)} className="rounded border-slate-300" />
                </td>
                <td>
                  <Link href={`/dashboard/complaints/${c.id}`} className="font-mono text-xs text-brand-600 hover:underline block">
                    {c.complaint_no}
                  </Link>
                  {c.latitude && (
                    <span className="flex items-center gap-1 text-2xs text-slate-400 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />{c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}
                    </span>
                  )}
                </td>
                <td><CategoryBadge category={c.category} /></td>
                <td className="text-xs text-slate-600">{c.ward?.name}</td>
                <td>
                  <p className="text-xs text-slate-700 max-w-[200px] truncate">{c.description}</p>
                </td>
                <td><StatusBadge status={c.status} /></td>
                <td><PriorityBadge score={c.priority_score} /></td>
                <td className="text-xs text-slate-500 whitespace-nowrap">{fmt.relative(c.submitted_at)}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <Link href={`/dashboard/complaints/${c.id}`}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition">
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    {c.status === 'SUBMITTED' && (
                      <button onClick={() => setAssign(c.id)}
                        className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-700 transition">
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {c.status === 'ASSIGNED' && (
                      <button onClick={() => statusMutation.mutate({ id: c.id, s: 'IN_PROGRESS' })}
                        className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-700 hover:bg-orange-100 transition">
                        Start
                      </button>
                    )}
                    {c.status === 'IN_PROGRESS' && (
                      <button onClick={() => statusMutation.mutate({ id: c.id, s: 'RESOLVED' })}
                        className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition">
                        Resolve
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-slate-500 text-xs">
            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="btn-secondary btn-sm disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition ${pg === page ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                  {pg}
                </button>
              );
            })}
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
              className="btn-secondary btn-sm disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <div className="card-header">
              <h3 className="font-semibold">Assign Complaint</h3>
              <button onClick={() => setAssign(null)} className="btn-ghost btn-sm p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="card-body space-y-4">
              <div className="form-group">
                <label className="label">Select Field Worker</label>
                <select className="select" value={workerId} onChange={e => setWorkerId(e.target.value)}>
                  <option value="">Choose a worker...</option>
                  {(workers ?? []).map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name} — {w.ward?.name ?? 'No ward'}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setAssign(null)}>Cancel</button>
                <button
                  className="btn-primary"
                  disabled={!workerId || assignMutation.isPending}
                  onClick={() => assignMutation.mutate({ id: assignModal, wId: workerId })}
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
