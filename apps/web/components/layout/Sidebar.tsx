'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth, hasMinRole, ROLE_LABELS } from '@/lib/auth';
import {
  LayoutDashboard, FileText, Map, Droplets, Waves,
  TreePine, BarChart3, Settings, Users, LogOut,
  AlertTriangle, Wifi, Building2, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  {
    section: 'Operations',
    items: [
      { label: 'Dashboard',    href: '/dashboard',              icon: LayoutDashboard, minRole: 'DEPT_HEAD'       },
      { label: 'Complaints',   href: '/dashboard/complaints',   icon: FileText,        minRole: 'DEPT_HEAD'       },
      { label: 'Field Workers',href: '/dashboard/workers',      icon: Users,           minRole: 'DEPT_HEAD'       },
      { label: 'Analytics',    href: '/dashboard/analytics',    icon: BarChart3,       minRole: 'DEPT_HEAD'       },
    ],
  },
  {
    section: 'City Intelligence',
    items: [
      { label: 'GIS Map',      href: '/dashboard/gis',          icon: Map,             minRole: 'FIELD_WORKER'    },
      { label: 'Drain Monitor',href: '/dashboard/drains',        icon: Waves,           minRole: 'DEPT_HEAD'       },
      { label: 'Water Network',href: '/dashboard/water',         icon: Droplets,        minRole: 'DEPT_HEAD'       },
      { label: 'Tree Cover',   href: '/dashboard/trees',         icon: TreePine,        minRole: 'DEPT_HEAD'       },
    ],
  },
  {
    section: 'Administration',
    items: [
      { label: 'Users',        href: '/admin/users',             icon: Users,           minRole: 'SUPER_ADMIN'     },
      { label: 'System',       href: '/admin/system',            icon: Settings,        minRole: 'SUPER_ADMIN'     },
      { label: 'Settings',     href: '/dashboard/settings',      icon: Settings,        minRole: 'DEPT_HEAD'       },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-gov-gradient text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">Jalpaiguri</p>
          <p className="text-2xs text-blue-200 truncate">Smart City Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-3">
        {NAV_ITEMS.map((section) => {
          const visible = section.items.filter(
            (item) => hasMinRole(user, item.minRole as any)
          );
          if (!visible.length) return null;
          return (
            <div key={section.section}>
              <p className="nav-section">{section.section}</p>
              {visible.map((item) => {
                const active = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn('nav-item', active && 'active')}>
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="w-3 h-3 opacity-50" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}

        {/* Field worker quick links */}
        {user?.role === 'FIELD_WORKER' && (
          <div>
            <p className="nav-section">Field</p>
            <Link href="/field/tasks">
              <div className={cn('nav-item', pathname.startsWith('/field') && 'active')}>
                <FileText className="w-4 h-4" />
                <span>My Tasks</span>
              </div>
            </Link>
            <Link href="/dashboard/gis">
              <div className={cn('nav-item', pathname === '/dashboard/gis' && 'active')}>
                <Map className="w-4 h-4" />
                <span>Map</span>
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* User area */}
      <div className="border-t border-white/10 p-3">
        {/* Citizen quick report */}
        <Link href="/report">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition mb-2 cursor-pointer">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-medium">Report an Issue</span>
          </div>
        </Link>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name ?? 'Guest'}</p>
            <p className="text-2xs text-blue-200 truncate">
              {user ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-blue-200" />
          </button>
        </div>
      </div>
    </aside>
  );
}
