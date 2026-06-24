'use client';

import DashboardShell from '@/components/layout/DashboardShell';
import MetricCard from '@/components/ui/MetricCard';
import {
  Activity,
  Shield,
  Users,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Database,
  Bell,
  Map,
  TreePine,
} from 'lucide-react';

export default function SystemPage() {
  const modules = [
    { name: 'Complaint Management', status: 'Online' },
    { name: 'Field Operations', status: 'Online' },
    { name: 'GIS Intelligence', status: 'Online' },
    { name: 'Drain Monitoring', status: 'Online' },
    { name: 'Water Leakage Monitoring', status: 'Online' },
    { name: 'Urban Tree Registry', status: 'Online' },
    { name: 'AI Triage Engine', status: 'Online' },
    { name: 'Notification Service', status: 'Online' },
  ];

  return (
    <DashboardShell title="System Overview">
      <div className="space-y-6">

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <MetricCard
            title="Platform Status"
            value="Operational"
            icon={Activity}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />

          <MetricCard
            title="Municipal Wards"
            value="20"
            icon={Building2}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />

          <MetricCard
            title="Registered Users"
            value="12,458"
            icon={Users}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />

          <MetricCard
            title="Security Status"
            value="Healthy"
            icon={Shield}
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
          />

        </div>

        {/* Municipality Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-lg">
              Municipality Information
            </h2>
          </div>

          <div className="card-body">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

              <div>
                <p className="text-sm text-slate-500">
                  Municipality
                </p>
                <p className="font-semibold">
                  Jalpaiguri Municipality
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Platform Version
                </p>
                <p className="font-semibold">
                  v1.0.0
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Environment
                </p>
                <p className="font-semibold text-green-600">
                  Production
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Coverage Area
                </p>
                <p className="font-semibold">
                  20 Municipal Wards
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Last Sync
                </p>
                <p className="font-semibold">
                  Just Now
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Operational Status
                </p>
                <p className="font-semibold text-green-600">
                  Active
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Operational Statistics */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-lg">
              Operational Statistics
            </h2>
          </div>

          <div className="card-body">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">

              <div className="p-4 rounded-xl bg-slate-50">
                <Database className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-slate-500">Complaints</p>
                <p className="text-2xl font-bold">5,421</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50">
                <CheckCircle2 className="w-5 h-5 text-green-600 mb-2" />
                <p className="text-sm text-slate-500">Resolved</p>
                <p className="text-2xl font-bold">4,812</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50">
                <TreePine className="w-5 h-5 text-emerald-600 mb-2" />
                <p className="text-sm text-slate-500">Trees Monitored</p>
                <p className="text-2xl font-bold">5,000+</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50">
                <Map className="w-5 h-5 text-purple-600 mb-2" />
                <p className="text-sm text-slate-500">GIS Layers</p>
                <p className="text-2xl font-bold">5</p>
              </div>

            </div>
          </div>
        </div>

        {/* Module Health */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-lg">
              Module Health
            </h2>
          </div>

          <div className="card-body">
            <div className="grid md:grid-cols-2 gap-3">

              {modules.map((module) => (
                <div
                  key={module.name}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-xl"
                >
                  <span className="font-medium text-slate-700">
                    {module.name}
                  </span>

                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    {module.status}
                  </span>
                </div>
              ))}

            </div>
          </div>
        </div>

        {/* Security & Activity */}
        <div className="grid lg:grid-cols-2 gap-5">

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">
                Security Overview
              </h2>
            </div>

            <div className="card-body space-y-3">

              <div className="flex justify-between">
                <span>Failed Login Attempts</span>
                <span className="font-semibold">2</span>
              </div>

              <div className="flex justify-between">
                <span>Last Backup</span>
                <span className="font-semibold">02:00 AM</span>
              </div>

              <div className="flex justify-between">
                <span>Audit Logging</span>
                <span className="text-green-600 font-semibold">
                  Enabled
                </span>
              </div>

            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">
                Recent Activity
              </h2>
            </div>

            <div className="card-body space-y-3">

              <div>✅ Complaint assigned to field worker</div>
              <div>✅ Water leakage alert generated</div>
              <div>✅ New citizen complaint submitted</div>
              <div>✅ GIS monitoring active</div>
              <div>✅ Notification service running</div>

            </div>
          </div>

        </div>

      </div>
    </DashboardShell>
  );
}