'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi, usersApi } from '@/lib/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { fmt, CATEGORY_LABELS, STATUS_LABELS } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  ArrowLeft, MapPin, Clock, User, Phone, Paperclip,
  UserCheck, CheckCircle2, X, AlertTriangle, Calendar, Activity
} from 'lucide-react';
import Link from 'next/link';

const STATUS_FLOW: Record<string, string> = {
  SUBMITTED: 'ASSIGNED', ASSIGNED: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED', RESOLVED: 'CLOSED',
};
const STATUS_ACTION: Record<string, string> = {
  SUBMITTED: 'Assign', ASSIGNED: 'Start Work',
  IN_PROGRESS: 'Mark Resolved', RESOLVED: 'Close',
};

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const [assignModal, setAssignModal] = useState(false);
  const [workerId, setWorkerId]       = useState('');
  const [notes, setNotes]             = useState('');

  const { data: complaint, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => complaintsApi.get(id),
  });
  const { data: workers } = useQuery({
    queryKey: ['workers'],
    queryFn: usersApi.workers,
    enabled: assignModal,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => complaintsApi.updateStatus(id, status, notes),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['complaint', id] }); },
    onError: () => toast.error('Update failed'),
  });

  const assignMutation = useMutation({
    mutationFn: () => complaintsApi.assign(id, workerId),
    onSuccess: () => {
      toast.success('Assigned successfully');
      qc.invalidateQueries({ queryKey: ['complaint', id] });
      setAssignModal(false);
    },
  });

  if (isLoading) return (
    <DashboardShell title="Complaint Detail">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    </DashboardShell>
  );

  if (!complaint) return (
    <DashboardShell title="Not Found">
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Complaint not found</p>
        <Link href="/dashboard/complaints" className="btn-primary mt-4 inline-flex">Back to list</Link>
      </div>
    </DashboardShell>
  );

  const nextStatus  = STATUS_FLOW[complaint.status];
  const actionLabel = STATUS_ACTION[complaint.status];
  const activeAssignment = complaint.assignments?.[0];

  const timeline = [
    { label: 'Submitted',    time: complaint.submittedAt,    done: true },
    { label: 'Acknowledged', time: complaint.acknowledgedAt, done: !!complaint.acknowledgedAt },
    { label: 'Assigned',     time: activeAssignment?.assignedAt, done: !!activeAssignment },
    { label: 'In Progress',  time: activeAssignment?.startedAt,  done: ['IN_PROGRESS','RESOLVED','CLOSED'].includes(complaint.status) },
    { label: 'Resolved',     time: complaint.resolvedAt,    done: !!complaint.resolvedAt },
    { label: 'Closed',       time: complaint.closedAt,      done: !!complaint.closedAt },
  ];

  return (
    <DashboardShell title={`Complaint ${complaint.complaintNumber}`}>
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition">
        <ArrowLeft className="w-4 h-4" /> Back to complaints
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-900 font-mono">{complaint.complaintNumber}</h1>
            <StatusBadge status={complaint.status} />
            <PriorityBadge score={complaint.priorityScore} />
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmt.datetime(complaint.submittedAt)}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{complaint.address ?? `${complaint.locationLat?.toFixed(4)}, ${complaint.locationLng?.toFixed(4)}`}</span>
            <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" />AI confidence: {complaint.aiConfidence ? `${(complaint.aiConfidence * 100).toFixed(0)}%` : '—'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {complaint.status === 'SUBMITTED' && (
            <button onClick={() => setAssignModal(true)} className="btn-primary">
              <UserCheck className="w-4 h-4" /> Assign to Worker
            </button>
          )}
          {nextStatus && complaint.status !== 'SUBMITTED' && (
            <button onClick={() => statusMutation.mutate(nextStatus)} disabled={statusMutation.isPending}
              className="btn-primary">
              <CheckCircle2 className="w-4 h-4" />
              {statusMutation.isPending ? 'Updating...' : actionLabel}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description card */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Complaint Details</h3>
              <CategoryBadge category={complaint.category} />
            </div>
            <div className="card-body space-y-4">
              <div>
                <p className="label">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3">{complaint.description}</p>
              </div>
              {complaint.aiNotes && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-indigo-700 mb-1">AI Analysis</p>
                  <p className="text-xs text-indigo-600">{complaint.aiNotes}</p>
                </div>
              )}
              {complaint.isDuplicate && (
                <div className="alert-warning">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs">Flagged as potential duplicate of another complaint in this area.</span>
                </div>
              )}
              {complaint.locationLat && (
                <div>
                  <p className="label">Location</p>
                  <div className="bg-slate-100 rounded-xl overflow-hidden h-36 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-6 h-6 text-brand-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-600 font-mono">{complaint.locationLat.toFixed(6)}, {complaint.locationLng.toFixed(6)}</p>
                      <p className="text-xs text-slate-500">{complaint.ward?.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {complaint.attachments?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Attachments</h3>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />{complaint.attachments.length} file{complaint.attachments.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {complaint.attachments.map((att: any) => (
                    <a key={att.id} href={att.s3Url} target="_blank" rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border border-slate-200 hover:border-brand-300 transition group">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={att.s3Url} alt="attachment" className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200" />
                      ) : (
                        <div className="h-32 flex items-center justify-center bg-slate-50">
                          <Paperclip className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Resolution notes */}
          {['IN_PROGRESS', 'RESOLVED'].includes(complaint.status) && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">Resolution Notes</h3></div>
              <div className="card-body">
                <textarea className="textarea" rows={3} placeholder="Add notes about the resolution..."
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Reporter */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Reporter</h3></div>
            <div className="card-body space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
                  {complaint.reporter?.name?.[0] ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{complaint.reporter?.name ?? 'Anonymous'}</p>
                  <p className="text-xs text-slate-500">{complaint.reporter?.email}</p>
                </div>
              </div>
              {complaint.reporter?.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />{complaint.reporter.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />{complaint.ward?.name} (Ward {complaint.ward?.wardNumber})
              </div>
            </div>
          </div>

          {/* Assignment */}
          {activeAssignment && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">Assigned Worker</h3></div>
              <div className="card-body space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                    {activeAssignment.worker?.name?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activeAssignment.worker?.name}</p>
                    <p className="text-xs text-slate-500">Field Worker</p>
                  </div>
                </div>
                {[
                  { l: 'Assigned', v: fmt.datetime(activeAssignment.assignedAt) },
                  { l: 'Due by',   v: activeAssignment.dueAt ? fmt.datetime(activeAssignment.dueAt) : '—' },
                  { l: 'Completed',v: activeAssignment.completedAt ? fmt.datetime(activeAssignment.completedAt) : 'Pending' },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between text-xs">
                    <span className="text-slate-500">{l}</span>
                    <span className="font-medium text-slate-800">{v}</span>
                  </div>
                ))}
                {activeAssignment.completionNotes && (
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">{activeAssignment.completionNotes}</p>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Timeline</h3></div>
            <div className="card-body">
              <div className="space-y-3">
                {timeline.map((step, i) => (
                  <div key={step.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-green-500' : 'bg-slate-200'}`}>
                        {step.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      {i < timeline.length - 1 && (
                        <div className={`w-0.5 flex-1 mt-1 ${step.done ? 'bg-green-200' : 'bg-slate-100'}`} style={{ minHeight: 16 }} />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className={`text-xs font-medium ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                      {step.time && <p className="text-2xs text-slate-400">{fmt.datetime(step.time)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <div className="card-header">
              <h3 className="font-semibold">Assign to Field Worker</h3>
              <button onClick={() => setAssignModal(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="card-body space-y-4">
              <div className="form-group">
                <label className="label">Select Worker</label>
                <select className="select" value={workerId} onChange={e => setWorkerId(e.target.value)}>
                  <option value="">Choose a field worker...</option>
                  {(workers ?? []).map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name} — Ward {w.ward?.wardNumber ?? 'Any'}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setAssignModal(false)}>Cancel</button>
                <button className="btn-primary" disabled={!workerId || assignMutation.isPending}
                  onClick={() => assignMutation.mutate()}>
                  {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
