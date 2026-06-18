import { prisma } from '../utils/prisma';

// =====================================================
// Shared Prisma Include
// =====================================================

export const COMPLAINT_INCLUDE = {
  citizen: {
    select: {
      id: true,
      full_name: true,
      email: true,
      phone: true,
    },
  },

  ward: {
    select: {
      id: true,
      name: true,
      name_bn: true,
    },
  },

  attachments: {
    orderBy: {
      uploaded_at: 'desc' as const,
    },
  },

  assignment: {
    include: {
      worker: {
        select: {
          id: true,
          full_name: true,
          phone: true,
          email: true,
        },
      },

      assigned_by_user: {
        select: {
          id: true,
          full_name: true,
          role: true,
        },
      },
    },
  },
};

// =====================================================
// Resolve Ward from GPS
// =====================================================

export async function resolveWardFromGPS(
  latitude: number,
  longitude: number
): Promise<number | null> {
  try {
    const wards = await prisma.ward.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    if (!wards.length) {
      return null;
    }

    return wards[0].id;
  } catch (error) {
    console.error('resolveWardFromGPS error:', error);
    return null;
  }
}

// =====================================================
// Complaint Number Generator
// =====================================================

export async function generateComplaintNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const count = await prisma.complaint.count();

  const serial = String(count + 1).padStart(6, '0');

  return `JAL-${year}-${serial}`;
}

// =====================================================
// Priority Helper
// =====================================================

export function getPriorityFromScore(score: number) {
  if (score >= 90) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

// =====================================================
// SLA Helper
// =====================================================

export async function getSLAHours(category: any) {
  const config = await prisma.slaConfig.findUnique({
    where: {
      category,
    },
  });

  return config?.target_hours ?? 48;
}

// =====================================================
// Dashboard - Summary Stats
// =====================================================

export async function getSummaryStats() {
  const [
    totalComplaints,
    submitted,
    assigned,
    inProgress,
    resolved,
    closed,
    totalUsers,
    totalWorkers,
  ] = await Promise.all([
    prisma.complaint.count(),

    prisma.complaint.count({
      where: { status: 'SUBMITTED' },
    }),

    prisma.complaint.count({
      where: { status: 'ASSIGNED' },
    }),

    prisma.complaint.count({
      where: { status: 'IN_PROGRESS' },
    }),

    prisma.complaint.count({
      where: { status: 'RESOLVED' },
    }),

    prisma.complaint.count({
      where: { status: 'CLOSED' },
    }),

    prisma.user.count(),

    prisma.user.count({
      where: {
        role: 'FIELD_WORKER',
        is_active: true,
      },
    }),
  ]);

  return {
    totalComplaints,
    submitted,
    assigned,
    inProgress,
    resolved,
    closed,
    totalUsers,
    totalWorkers,
  };
}

// =====================================================
// Dashboard - Ward Stats
// =====================================================

export async function getWardStats() {
  const wards = await prisma.ward.findMany({
    select: {
      id: true,
      name: true,
      complaints: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  return wards.map((ward) => ({
    id: ward.id,
    name: ward.name,
    complaintCount: ward.complaints.length,
    resolvedCount: ward.complaints.filter(
      (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
    ).length,
  }));
}

// =====================================================
// Dashboard - Category Trend
// =====================================================

export async function getCategoryTrend(days = 30) {
  const startDate = new Date();

  startDate.setDate(startDate.getDate() - days);

  const complaints = await prisma.complaint.findMany({
    where: {
      submitted_at: {
        gte: startDate,
      },
    },
    select: {
      category: true,
      submitted_at: true,
    },
  });

  const grouped: Record<string, number> = {};

  complaints.forEach((c) => {
    grouped[c.category] = (grouped[c.category] || 0) + 1;
  });

  return Object.entries(grouped).map(([category, count]) => ({
    category,
    count,
  }));
}

// =====================================================
// Dashboard - SLA Report
// =====================================================

export async function getSLAReport() {
  const configs = await prisma.slaConfig.findMany({
    orderBy: {
      target_hours: 'asc',
    },
  });

  return configs.map((c) => ({
    category: c.category,
    targetHours: c.target_hours,
    escalationHours: c.escalation_hours,
    priority: c.priority,
  }));
}