'use client';
import { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { complaintsApi, aiApi } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  MapPin, Camera, Upload, X, CheckCircle2, Loader2,
  Building2, ChevronRight, AlertCircle, Sparkles
} from 'lucide-react';
import Link from 'next/link';

const schema = z.object({
  category:    z.string().min(1, 'Please select a category'),
  description: z.string().min(20, 'Please describe the issue in at least 20 characters'),
  address:     z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const CATEGORIES = Object.entries(CATEGORY_LABELS);
const CAT_ICONS: Record<string, string> = {
  GARBAGE:'🗑️', WATER_LEAKAGE:'💧', WATER_SUPPLY:'🚿', DRAINAGE:'🌊',
  ROAD_DAMAGE:'🛣️', STREETLIGHT_FAILURE:'💡', ILLEGAL_DUMPING:'⚠️', OTHER:'📋',
};

export default function ReportPage() {
  const [step, setStep]               = useState<1|2|3>(1);
  const [photos, setPhotos]           = useState<File[]>([]);
  const [previews, setPreviews]       = useState<string[]>([]);
  const [location, setLocation]       = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState<{ complaintNumber: string } | null>(null);
  const [aiSuggestion, setAiSug]      = useState<{ category: string; confidence: number; notes: string } | null>(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, setValue, trigger,
    formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const description = watch('description') ?? '';
  const category    = watch('category')    ?? '';

  // AI triage on description blur
  async function runAiTriage() {
    if (description.length < 20) return;
    setAiLoading(true);
    try {
      const result = await aiApi.triage(description, category || undefined);
      setAiSug(result);
      if (!category && result.category) setValue('category', result.category.toUpperCase().replace(/ /g,'_'));
    } catch { /* silent */ }
    setAiLoading(false);
  }

  // GPS capture
  function captureLocation() {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
      },
      () => {
        // Fallback to Jalpaiguri center for demo
        setLocation({ lat: 26.5428, lng: 88.7179 });
        setLocLoading(false);
        toast('Using approximate location for demo', { icon: 'ℹ️' });
      },
      { timeout: 8000 }
    );
  }

  // Photo handling
  const onFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 4 - photos.length);
    setPhotos(p => [...p, ...arr]);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(p => [...p, e.target!.result as string]);
      reader.readAsDataURL(f);
    });
  }, [photos]);

  function removePhoto(i: number) {
    setPhotos(p => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  }

  // Submit
  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('category', data.category);
      form.append('description', data.description);
      if (data.address) form.append('address', data.address);
      if (location) {
        form.append('locationLat', location.lat.toString());
        form.append('locationLng', location.lng.toString());
      }
      photos.forEach(p => form.append('photos', p));

      const result = await complaintsApi.create(form);
      setSubmitted({ complaintNumber: result.complaintNumber });
      setStep(3);
    } catch {
      toast.error('Submission failed. Please try again.');
    }
    setSubmitting(false);
  }

  // Step 1 next
  async function goToStep2() {
    const ok = await trigger(['category', 'description']);
    if (ok) setStep(2);
  }

  if (step === 3 && submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Complaint Submitted!</h2>
          <p className="text-slate-500 text-sm mb-5">
            Your complaint has been registered and will be assigned to a field worker shortly.
          </p>
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-brand-600 font-medium mb-1">Your Complaint ID</p>
            <p className="text-2xl font-bold text-brand-700 font-mono">{submitted.complaintNumber}</p>
            <p className="text-xs text-brand-500 mt-1">Save this number to track your complaint</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href={`/track?id=${submitted.complaintNumber}`} className="btn-primary justify-center">
              Track my complaint
            </Link>
            <button onClick={() => { setStep(1); setSubmitted(null); setPhotos([]); setPreviews([]); setLocation(null); setAiSug(null); }}
              className="btn-secondary justify-center">
              Submit another complaint
            </button>
            <Link href="/login" className="btn-ghost justify-center text-sm">
              Go to officer portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gov-gradient text-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6" />
            <div>
              <p className="text-sm font-semibold">Jalpaiguri Municipality</p>
              <p className="text-xs text-blue-200">Civic Complaint Portal</p>
            </div>
          </div>
          <Link href="/track" className="text-xs text-blue-200 hover:text-white flex items-center gap-1">
            Track complaint <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${step >= s ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{s}</div>
              <div className="flex-1 h-0.5 bg-slate-200 rounded">
                <div className={`h-full bg-brand-600 rounded transition-all ${step > s ? 'w-full' : 'w-0'}`} />
              </div>
            </div>
          ))}
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step >= 2 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* STEP 1: Issue details */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">Report a Civic Issue</h1>
                <p className="text-sm text-slate-500">Fill in the details below. Your complaint will be registered immediately.</p>
              </div>

              {/* Category grid */}
              <div className="form-group">
                <label className="label">Issue Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map(([k, v]) => (
                    <label key={k} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${category === k ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-300 bg-white'}`}>
                      <input type="radio" value={k} {...register('category')} className="sr-only" />
                      <span className="text-xl">{CAT_ICONS[k]}</span>
                      <span className="text-xs font-medium text-slate-700 leading-tight">{v}</span>
                    </label>
                  ))}
                </div>
                {errors.category && <p className="form-error">{errors.category.message}</p>}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="label">Description *</label>
                <textarea
                  className="textarea min-h-[120px]"
                  placeholder="Describe the issue in detail — location, severity, how long it has been present..."
                  {...register('description')}
                  onBlur={runAiTriage}
                />
                <div className="flex justify-between mt-1">
                  {errors.description
                    ? <p className="form-error">{errors.description.message}</p>
                    : <span />}
                  <span className="text-2xs text-slate-400">{description.length} chars</span>
                </div>
              </div>

              {/* AI suggestion */}
              {aiLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                  AI is analysing your description...
                </div>
              )}
              {aiSuggestion && !aiLoading && (
                <div className="alert-info text-xs">
                  <Sparkles className="w-4 h-4 flex-shrink-0 text-brand-500" />
                  <div>
                    <p className="font-semibold">AI Suggestion</p>
                    <p>{aiSuggestion.notes ?? `Category detected: ${aiSuggestion.category} (${(aiSuggestion.confidence * 100).toFixed(0)}% confidence)`}</p>
                  </div>
                </div>
              )}

              <button type="button" onClick={goToStep2} className="btn-primary w-full justify-center py-3">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: Location + photos */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Location & Photos</h2>
                <p className="text-sm text-slate-500">Help field workers find the issue quickly.</p>
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="label">Location</label>
                {location ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50">
                    <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-700">Location captured</p>
                      <p className="text-xs text-green-600 font-mono">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
                    </div>
                    <button type="button" onClick={() => setLocation(null)} className="text-green-500 hover:text-green-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={captureLocation} disabled={locLoading}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-400 bg-white hover:bg-brand-50 transition-all">
                    {locLoading
                      ? <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                      : <MapPin className="w-5 h-5 text-slate-400" />}
                    <span className="text-sm text-slate-600">{locLoading ? 'Detecting location...' : 'Capture my GPS location'}</span>
                  </button>
                )}

                <div className="mt-2">
                  <input className="input" placeholder="Or type address / landmark (optional)"
                    {...register('address')} />
                </div>
              </div>

              {/* Photos */}
              <div className="form-group">
                <label className="label">Photos (optional — up to 4)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-brand-400 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-brand-50">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Click to upload or drag & drop</p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 10MB each</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => onFiles(e.target.files)} />

                {previews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {previews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Complaint summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-sm">
                <p className="font-semibold text-slate-700">Complaint Summary</p>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category</span>
                  <span className="font-medium">{CATEGORY_LABELS[category] ?? category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location</span>
                  <span className="font-medium">{location ? 'GPS captured' : 'Not captured'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Photos</span>
                  <span className="font-medium">{photos.length} attached</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">
                  Back
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    : 'Submit Complaint'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
