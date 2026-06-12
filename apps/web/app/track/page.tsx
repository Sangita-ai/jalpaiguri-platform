'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { complaintsApi } from '@/lib/api';
import { fmt, CATEGORY_LABELS, STATUS_LABELS } from '@/lib/utils';
import { Search, Building2, CheckCircle2, Clock, UserCheck, Loader2, MapPin, Calendar, Tag } from 'lucide-react';
import Link from 'next/link';

const TIMELINE_STEPS = [
  { status: 'SUBMITTED',   label: 'Complaint Submitted',    icon: Tag        },
  { status: 'ASSIGNED',    label: 'Assigned to Worker',     icon: UserCheck  },
  { status: 'IN_PROGRESS', label: 'Work In Progress',       icon: Clock      },
  { status: 'RESOLVED',    label: 'Issue Resolved',         icon: CheckCircle2 },
];

const STATUS_ORDER = ['SUBMITTED','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED'];

function TrackContent() {
  const params = useSearchParams();
  const [id, setId]       = useState(params.get('id') ?? '');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function search() {
    if (!id.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await complaintsApi.track(id.trim().toUpperCase());
      setResult(data);
    } catch {
      setError('Complaint not found. Please check the ID and try again.');
    }
    setLoading(false);
  }

  const currentIdx = result ? STATUS_ORDER.indexOf(result.status) : -1;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gov-gradient text-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6" />
            <div>
              <p className="text-sm font-semibold">Jalpaiguri Municipality</p>
              <p className="text-xs text-blue-200">Complaint Tracker</p>
            </div>
          </div>
          <Link href="/report" className="text-xs text-blue-200 hover:text-white">
            Report new issue
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">Track Your Complaint</h1>
        <p className="text-center text-slate-500 text-sm mb-8">Enter your complaint ID to check its current status</p>

        <div className="flex gap-2 mb-8">
          <input
            className="input flex-1 font-mono uppercase tracking-wide"
            placeholder="CJPL-20240601-0001"
            value={id}
            onChange={e => setId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button onClick={search} disabled={loading} className="btn-primary px-5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div className="alert-danger mb-6 text-sm">{error}</div>
        )}

        {result && (
          <div className="space-y-5 animate-fade-in">
            {/* Header card */}
            <div className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-mono text-lg font-bold text-brand-600">{result.complaintNumber}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{CATEGORY_LABELS[result.category] ?? result.category}</p>
                </div>
                <span className={`badge text-sm px-3 py-1 ${
                  result.status === 'RESOLVED' || result.status === 'CLOSED' ? 'badge-resolved'
                  : result.status === 'IN_PROGRESS' ? 'badge-progress'
                  : result.status === 'ASSIGNED' ? 'badge-assigned'
                  : 'badge-submitted'
                }`}>
                  {STATUS_LABELS[result.status] ?? result.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { icon: Calendar, label: 'Submitted',    value: result.submittedAt ? fmt.datetime(result.submittedAt) : '—' },
                  { icon: MapPin,   label: 'Ward',         value: result.wardName ?? '—' },
                  { icon: Clock,    label: 'Resolved',     value: result.resolvedAt ? fmt.datetime(result.resolvedAt) : 'Pending' },
                  { icon: Tag,      label: 'Address',      value: result.address ?? '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="font-medium text-slate-800 text-xs">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-5">Progress Timeline</h3>
              <div className="space-y-0">
                {TIMELINE_STEPS.map((step, i) => {
                  const done    = currentIdx >= i;
                  const current = currentIdx === i;
                  const Icon    = step.icon;
                  return (
                    <div key={step.status} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          done ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'
                        } ${current ? 'ring-4 ring-brand-100' : ''}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`w-0.5 flex-1 my-1 min-h-[32px] ${done ? 'bg-brand-300' : 'bg-slate-200'}`} />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <p className={`text-sm font-semibold ${done ? 'text-slate-800' : 'text-slate-400'}`}>
                          {step.label}
                          {current && <span className="ml-2 text-xs text-brand-600 font-normal">← Current</span>}
                        </p>
                        {done && result.timeline?.[i] && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {fmt.datetime(result.timeline[i].assignedAt ?? result.submittedAt)}
                          </p>
                        )}
                        {!done && (
                          <p className="text-xs text-slate-400 mt-0.5">Pending</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Photos */}
            {result.attachments?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-3">Complaint Photos</h3>
                <div className="grid grid-cols-3 gap-2">
                  {result.attachments.map((a: any) => (
                    <img key={a.s3Url} src={a.s3Url} alt="Complaint photo"
                      className="w-full aspect-square object-cover rounded-xl border border-slate-200" />
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-xs text-slate-400">
                For urgent issues, call the Municipal Control Room:{' '}
                <a href="tel:03561-222222" className="text-brand-600 font-medium">03561-222222</a>
              </p>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm">Enter a complaint ID above to track its status</p>
            <p className="text-xs text-slate-400 mt-2">Complaint IDs look like: CJPL-20240601-0001</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>}>
    <TrackContent />
  </Suspense>;
}
