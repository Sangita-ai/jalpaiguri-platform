'use client';
import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api';
import { fmt, CATEGORY_LABELS, STATUS_LABELS } from '@/lib/utils';
import { CategoryBadge } from '@/components/ui/StatusBadge';
import toast from 'react-hot-toast';
import {
  MapPin, CheckCircle2, Play, Clock, Camera, Navigation,
  AlertTriangle, Loader2, Upload, X, FileText
} from 'lucide-react';

export default function FieldTasksPage() {
  const qc = useQueryClient();
  const [completeModal, setComplete] = useState<any>(null);
  const [notes, setNotes]     = useState('');
  const [photo, setPhoto]     = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [submitting, setSub]  = useState(false);
  const [filter, setFilter]   = useState<'all'|'pending'|'done'>('pending');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: tasksApi.myTasks,
    refetchInterval: 60_000,
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => tasksApi.start(id),
    onSuccess: () => {
      toast.success('Task started');
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!completeModal) return;
    setSub(true);
    try {
      const form = new FormData();
      form.append('notes', notes);
      if (photo) form.append('photo', photo);
      await tasksApi.complete(completeModal.id, form);
      toast.success('Task completed!');
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      setComplete(null);
      setNotes('');
      setPhoto(null);
      setPreview('');
    } catch {
      toast.error('Failed to complete task');
    }
    setSub(false);
  }

  const taskList: any[] = tasks ?? MOCK_TASKS;
  const filtered = taskList.filter(t => {
    if (filter === 'pending') return !t.completedAt;
    if (filter === 'done')    return !!t.completedAt;
    return true;
  });

  const counts = {
    total:   taskList.length,
    pending: taskList.filter(t => !t.completedAt).length,
    done:    taskList.filter(t => !!t.completedAt).length,
    overdue: taskList.filter(t => !t.completedAt && t.dueAt && new Date(t.dueAt) < new Date()).length,
  };

  return (
    <DashboardShell title="My Tasks">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Assigned Tasks</h1>
          <p className="page-subtitle">{counts.pending} pending · {counts.done} completed today</p>
        </div>
        {counts.overdue > 0 && (
          <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {counts.overdue} overdue
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-5">
        {[
          { key: 'pending', label: `Pending (${counts.pending})` },
          { key: 'done',    label: `Completed (${counts.done})`  },
          { key: 'all',     label: `All (${counts.total})`       },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key as any)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Task cards */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-full mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No {filter === 'pending' ? 'pending' : ''} tasks</p>
          <p className="text-sm text-slate-400 mt-1">
            {filter === 'pending' ? 'All caught up! Check back later.' : 'No tasks in this category.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((task: any) => {
          const isOverdue = !task.completedAt && task.dueAt && new Date(task.dueAt) < new Date();
          const isDone    = !!task.completedAt;
          return (
            <div key={task.id}
              className={`card p-5 transition-all ${isDone ? 'opacity-75' : ''} ${isOverdue ? 'border-red-200' : ''}`}>
              <div className="flex items-start gap-4">
                {/* Status icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isDone ? 'bg-green-100' : isOverdue ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  {isDone
                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                    : isOverdue
                    ? <AlertTriangle className="w-5 h-5 text-red-600" />
                    : <Clock className="w-5 h-5 text-blue-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {task.complaint?.complaintNumber ?? task.complaintNumber ?? 'CJPL-XXXX'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CategoryBadge category={task.complaint?.category ?? task.category ?? 'OTHER'} />
                        {isOverdue && <span className="badge badge-critical text-xs">Overdue</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {task.dueAt && (
                        <p className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                          Due: {fmt.datetime(task.dueAt)}
                        </p>
                      )}
                      <p className="text-2xs text-slate-400 mt-0.5">
                        Assigned {fmt.relative(task.assignedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                    {task.complaint?.description ?? task.description ?? 'No description provided'}
                  </p>

                  {/* Location */}
                  {(task.complaint?.address ?? task.address) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{task.complaint?.address ?? task.address}</span>
                    </div>
                  )}

                  {/* Actions */}
                  {!isDone && (
                    <div className="flex items-center gap-2 mt-3">
                      {(task.complaint?.locationLat ?? task.lat) && (
                        <a
                          href={`https://maps.google.com/?q=${task.complaint?.locationLat ?? task.lat},${task.complaint?.locationLng ?? task.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="btn-secondary btn-sm">
                          <Navigation className="w-3.5 h-3.5" /> Navigate
                        </a>
                      )}
                      {!task.startedAt && (
                        <button
                          onClick={() => startMutation.mutate(task.id)}
                          disabled={startMutation.isPending}
                          className="btn-secondary btn-sm text-blue-700 border-blue-200 hover:bg-blue-50">
                          <Play className="w-3.5 h-3.5" /> Start Work
                        </button>
                      )}
                      <button
                        onClick={() => setComplete(task)}
                        className="btn-primary btn-sm ml-auto">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                      </button>
                    </div>
                  )}

                  {isDone && (
                    <div className="mt-2 text-xs text-green-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed {fmt.relative(task.completedAt)}
                      {task.completionNotes && <span className="text-slate-400 ml-1">· {task.completionNotes}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete modal */}
      {completeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="card w-full max-w-md rounded-2xl">
            <div className="card-header">
              <h3 className="font-semibold text-slate-800">Complete Task</h3>
              <button onClick={() => setComplete(null)} className="btn-ghost p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleComplete}>
              <div className="card-body space-y-4">
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
                  <p className="font-medium">{completeModal.complaint?.complaintNumber ?? 'Task'}</p>
                  <p className="text-slate-400 mt-0.5">{completeModal.complaint?.description ?? ''}</p>
                </div>

                <div className="form-group">
                  <label className="label">Completion Notes *</label>
                  <textarea
                    className="textarea min-h-[90px]"
                    placeholder="Describe the work done, materials used, current condition..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Completion Photo</label>
                  {preview ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => { setPhoto(null); setPreview(''); }}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-brand-400 transition">
                      <Camera className="w-6 h-6 text-slate-400" />
                      <span className="text-sm text-slate-500">Take or upload a photo</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setPhoto(f);
                          const r = new FileReader();
                          r.onload = ev => setPreview(ev.target!.result as string);
                          r.readAsDataURL(f);
                        }} />
                    </label>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setComplete(null)} className="btn-secondary flex-1 justify-center">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting || !notes.trim()} className="btn-primary flex-1 justify-center">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {submitting ? 'Saving...' : 'Complete'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

const MOCK_TASKS = Array.from({ length: 8 }, (_, i) => ({
  id: `task-${i}`,
  complaintNumber: `CJPL-20240601-${String(i+1).padStart(4,'0')}`,
  category: ['GARBAGE','WATER_LEAKAGE','DRAINAGE','ROAD_DAMAGE','STREETLIGHT_FAILURE'][i % 5],
  description: ['Overflowing dustbin near market area needs immediate clearing.',
    'Water pipe burst causing road flooding near Ward 4 junction.',
    'Drain blocked at Rajbari Road — water backing up.',
    'Large pothole on Station Road causing vehicle damage.',
    'Three streetlights out on Netaji Sarani — safety concern.'][i % 5],
  address: `Ward ${(i % 10) + 1}, Jalpaiguri`,
  lat: 26.54 + (Math.random()-0.5)*0.04,
  lng: 88.71 + (Math.random()-0.5)*0.04,
  assignedAt: new Date(Date.now() - (i+1)*3600000).toISOString(),
  dueAt: i < 3 ? new Date(Date.now() - 1800000).toISOString() : new Date(Date.now() + (24-i)*3600000).toISOString(),
  startedAt: i > 4 ? new Date(Date.now() - 1800000).toISOString() : null,
  completedAt: i >= 6 ? new Date(Date.now() - 600000).toISOString() : null,
  completionNotes: i >= 6 ? 'Work completed successfully. Site inspected.' : null,
  complaint: {
    complaintNumber: `CJPL-20240601-${String(i+1).padStart(4,'0')}`,
    category: ['GARBAGE','WATER_LEAKAGE','DRAINAGE','ROAD_DAMAGE','STREETLIGHT_FAILURE'][i % 5],
    description: ['Overflowing dustbin near market area needs immediate clearing.',
      'Water pipe burst causing road flooding near Ward 4 junction.',
      'Drain blocked at Rajbari Road — water backing up.',
      'Large pothole on Station Road causing vehicle damage.',
      'Three streetlights out on Netaji Sarani.'][i % 5],
    address: `Ward ${(i % 10) + 1}, Jalpaiguri`,
    locationLat: 26.54 + (Math.random()-0.5)*0.04,
    locationLng: 88.71 + (Math.random()-0.5)*0.04,
  },
}));
