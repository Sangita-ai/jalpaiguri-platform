// 'use client';
// import { useState, useRef } from 'react';
// import { useSearchParams, useRouter } from 'next/navigation';
// import { useMutation } from '@tanstack/react-query';
// import { tasksApi } from '@/lib/api';
// import toast from 'react-hot-toast';
// import { Camera, Upload, CheckCircle2, ArrowLeft, X } from 'lucide-react';

// export default function CompleteTaskPage() {
//   const sp = useSearchParams();
//   const router = useRouter();
//   const assignmentId = sp.get('id') ?? '';
//   const [notes, setNotes] = useState('');
//   const [photos, setPhotos] = useState<File[]>([]);
//   const [previews, setPreviews] = useState<string[]>([]);
//   const fileRef = useRef<HTMLInputElement>(null);

//   const mutation = useMutation({
//     mutationFn: () => {
//       const fd = new FormData();
//       fd.append('notes', notes);
//       photos.forEach(p => fd.append('photos', p));
//       return tasksApi.complete(assignmentId, fd);
//     },
//     onSuccess: () => { toast.success('Task marked complete!'); router.push('/field/tasks'); },
//     onError: () => toast.error('Submission failed. Please try again.'),
//   });

//   function handleFiles(files: FileList | null) {
//     if (!files) return;
//     const arr = Array.from(files).slice(0, 3);
//     setPhotos(prev => [...prev, ...arr].slice(0, 3));
//     arr.forEach(f => {
//       const reader = new FileReader();
//       reader.onload = e => setPreviews(prev => [...prev, e.target!.result as string].slice(0, 3));
//       reader.readAsDataURL(f);
//     });
//   }

//   function removePhoto(i: number) {
//     setPhotos(p => p.filter((_,j)=>j!==i));
//     setPreviews(p => p.filter((_,j)=>j!==i));
//   }

//   return (
//     <div className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto">
//       <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 mb-5">
//         <ArrowLeft className="w-4 h-4" /> Back to tasks
//       </button>

//       <div className="card">
//         <div className="card-header">
//           <h2 className="font-semibold text-slate-800">Complete Task</h2>
//           <span className="text-xs text-slate-500 font-mono">{assignmentId.slice(0, 8)}...</span>
//         </div>
//         <div className="card-body space-y-5">

//           {/* Photo upload */}
//           <div>
//             <label className="label">Completion Photos (up to 3)</label>
//             <div
//               onClick={() => fileRef.current?.click()}
//               className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
//             >
//               <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
//               <p className="text-sm text-slate-600 font-medium">Tap to capture or upload</p>
//               <p className="text-xs text-slate-400 mt-0.5">JPG, PNG · max 5MB each</p>
//             </div>
//             <input ref={fileRef} type="file" accept="image/*" multiple capture="environment"
//               className="hidden" onChange={e => handleFiles(e.target.files)} />

//             {previews.length > 0 && (
//               <div className="grid grid-cols-3 gap-2 mt-3">
//                 {previews.map((src, i) => (
//                   <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
//                     <img src={src} alt="" className="w-full h-full object-cover" />
//                     <button onClick={() => removePhoto(i)}
//                       className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
//                       <X className="w-3 h-3 text-white" />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Notes */}
//           <div className="form-group">
//             <label className="label">Work Completion Notes</label>
//             <textarea className="textarea" rows={4}
//               placeholder="Describe the work done, materials used, current status..."
//               value={notes} onChange={e => setNotes(e.target.value)} />
//           </div>

//           <button
//             onClick={() => mutation.mutate()}
//             disabled={mutation.isPending || !notes}
//             className="btn-primary w-full justify-center py-3 text-base"
//           >
//             {mutation.isPending ? (
//               <span className="flex items-center gap-2">
//                 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
//                 Submitting...
//               </span>
//             ) : (
//               <span className="flex items-center gap-2">
//                 <CheckCircle2 className="w-5 h-5" /> Mark as Complete
//               </span>
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

'use client';

import { Suspense, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Camera, CheckCircle2, ArrowLeft, X } from 'lucide-react';

function CompleteTaskContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const assignmentId = sp.get('id') ?? '';

  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('notes', notes);
      photos.forEach(p => fd.append('photos', p));
      return tasksApi.complete(assignmentId, fd);
    },
    onSuccess: () => {
      toast.success('Task marked complete!');
      router.push('/field/tasks');
    },
    onError: () => toast.error('Submission failed. Please try again.'),
  });

  function handleFiles(files: FileList | null) {
    if (!files) return;

    const arr = Array.from(files).slice(0, 3);

    setPhotos(prev => [...prev, ...arr].slice(0, 3));

    arr.forEach(f => {
      const reader = new FileReader();

      reader.onload = e =>
        setPreviews(prev => [...prev, e.target!.result as string].slice(0, 3));

      reader.readAsDataURL(f);
    });
  }

  function removePhoto(i: number) {
    setPhotos(p => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto">
      {/* Keep your existing JSX exactly as it is */}
    </div>
  );
}

export default function CompleteTaskPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompleteTaskContent />
    </Suspense>
  );
}