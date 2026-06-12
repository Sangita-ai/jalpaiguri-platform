import { cn, STATUS_LABELS, STATUS_BADGE_CLASS } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('badge', STATUS_BADGE_CLASS[status] ?? 'badge-closed')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PriorityBadge({ score }: { score: number }) {
  const { label, cls } = score >= 80
    ? { label: 'Critical', cls: 'badge-critical' }
    : score >= 60
    ? { label: 'High',     cls: 'badge-high'     }
    : score >= 40
    ? { label: 'Medium',   cls: 'badge-medium'   }
    : { label: 'Low',      cls: 'badge-low'       };
  return <span className={cn('badge', cls)}>{label}</span>;
}

export function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string,string> = {
    GARBAGE:'Garbage', WATER_LEAKAGE:'Water Leakage', WATER_SUPPLY:'Water Supply',
    DRAINAGE:'Drainage', ROAD_DAMAGE:'Road Damage', STREETLIGHT_FAILURE:'Streetlight',
    ILLEGAL_DUMPING:'Illegal Dumping', OTHER:'Other',
  };
  return (
    <span className="badge bg-slate-100 text-slate-700 border border-slate-200">
      {labels[category] ?? category}
    </span>
  );
}
