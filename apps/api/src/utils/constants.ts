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

export const DRAIN_STATUS_ORDER = ['NORMAL','ELEVATED','HIGH','OVERFLOW_RISK','OVERFLOW','OFFLINE'];
export const WATER_STATUS_ORDER = ['NORMAL','ANOMALY','LEAK_SUSPECTED','LEAK_CONFIRMED','OFFLINE'];
