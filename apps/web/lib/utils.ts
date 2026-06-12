import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting
export const fmt = {
  date: (d: string | Date) => format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy'),
  datetime: (d: string | Date) => format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy, HH:mm'),
  time: (d: string | Date) => format(typeof d === 'string' ? parseISO(d) : d, 'HH:mm'),
  relative: (d: string | Date) => formatDistanceToNow(typeof d === 'string' ? parseISO(d) : d, { addSuffix: true }),
  short: (d: string | Date) => format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM'),
};

// Complaint helpers
export const CATEGORY_LABELS: Record<string, string> = {
  GARBAGE:             'Garbage',
  WATER_LEAKAGE:       'Water Leakage',
  WATER_SUPPLY:        'Water Supply',
  DRAINAGE:            'Drainage',
  ROAD_DAMAGE:         'Road Damage',
  STREETLIGHT_FAILURE: 'Streetlight Failure',
  ILLEGAL_DUMPING:     'Illegal Dumping',
  OTHER:               'Other',
};

export const CATEGORY_ICONS: Record<string, string> = {
  GARBAGE:             '🗑️',
  WATER_LEAKAGE:       '💧',
  WATER_SUPPLY:        '🚿',
  DRAINAGE:            '🌊',
  ROAD_DAMAGE:         '🛣️',
  STREETLIGHT_FAILURE: '💡',
  ILLEGAL_DUMPING:     '⚠️',
  OTHER:               '📋',
};

export const CATEGORY_COLORS: Record<string, string> = {
  GARBAGE:             '#ef4444',
  WATER_LEAKAGE:       '#3b82f6',
  WATER_SUPPLY:        '#06b6d4',
  DRAINAGE:            '#8b5cf6',
  ROAD_DAMAGE:         '#f97316',
  STREETLIGHT_FAILURE: '#eab308',
  ILLEGAL_DUMPING:     '#ec4899',
  OTHER:               '#6b7280',
};

export const STATUS_LABELS: Record<string, string> = {
  SUBMITTED:   'Submitted',
  ASSIGNED:    'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED:    'Resolved',
  CLOSED:      'Closed',
};

export const STATUS_BADGE_CLASS: Record<string, string> = {
  SUBMITTED:   'badge-submitted',
  ASSIGNED:    'badge-assigned',
  IN_PROGRESS: 'badge-progress',
  RESOLVED:    'badge-resolved',
  CLOSED:      'badge-closed',
};

export function priorityLabel(score: number): { label: string; cls: string } {
  if (score >= 80) return { label: 'Critical', cls: 'badge-critical' };
  if (score >= 60) return { label: 'High',     cls: 'badge-high'     };
  if (score >= 40) return { label: 'Medium',   cls: 'badge-medium'   };
  return              { label: 'Low',      cls: 'badge-low'      };
}

export function drainStatusLabel(status: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    NORMAL:        { label: 'Normal',        color: '#16a34a', bg: '#f0fdf4' },
    ELEVATED:      { label: 'Elevated',      color: '#ca8a04', bg: '#fefce8' },
    HIGH:          { label: 'High',          color: '#ea580c', bg: '#fff7ed' },
    OVERFLOW_RISK: { label: 'Overflow Risk', color: '#dc2626', bg: '#fef2f2' },
    OVERFLOW:      { label: 'Overflow!',     color: '#991b1b', bg: '#fef2f2' },
    OFFLINE:       { label: 'Offline',       color: '#6b7280', bg: '#f9fafb' },
  };
  return map[status] ?? map['OFFLINE'];
}

export function waterStatusColor(prob: number): string {
  if (prob > 0.75) return '#dc2626';
  if (prob > 0.50) return '#ea580c';
  if (prob > 0.25) return '#ca8a04';
  return '#16a34a';
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function pct(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

// Generate GeoJSON point feature
export function makePoint(lat: number, lng: number, props: Record<string, any> = {}) {
  return {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [lng, lat] },
    properties: props,
  };
}
