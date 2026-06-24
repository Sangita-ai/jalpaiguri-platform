'use client';

import DashboardShell from '@/components/layout/DashboardShell';
import { Save, Building2, Bell, Shield, Clock } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);

  const saveSettings = async () => {
    setLoading(true);

    setTimeout(() => {
      toast.success('Settings saved successfully');
      setLoading(false);
    }, 1000);
  };

  return (
    <DashboardShell title="Settings">
      <div className="space-y-6">

        {/* Municipality Profile */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Municipality Profile
            </h2>
          </div>

          <div className="card-body grid md:grid-cols-2 gap-4">
            <input
              className="input"
              defaultValue="Jalpaiguri Municipality"
              placeholder="Municipality Name"
            />

            <input
              className="input"
              defaultValue="West Bengal"
              placeholder="State"
            />

            <input
              className="input"
              defaultValue="support@jalpaiguri.gov.in"
              placeholder="Email"
            />

            <input
              className="input"
              defaultValue="+91 XXXXX XXXXX"
              placeholder="Phone"
            />
          </div>
        </div>

        {/* Complaint Settings */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Complaint Configuration
            </h2>
          </div>

          <div className="card-body space-y-4">
            {[
              'Auto Assignment',
              'AI Categorization',
              'Duplicate Detection',
              'Auto Escalation',
            ].map((item) => (
              <label
                key={item}
                className="flex justify-between items-center border rounded-lg px-4 py-3"
              >
                <span>{item}</span>
                <input type="checkbox" defaultChecked />
              </label>
            ))}
          </div>
        </div>

        {/* SLA Settings */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              SLA Configuration
            </h2>
          </div>

          <div className="card-body">
            <div className="grid md:grid-cols-2 gap-4">

              <input
                className="input"
                defaultValue="24"
                placeholder="Garbage (Hours)"
              />

              <input
                className="input"
                defaultValue="48"
                placeholder="Water Leakage (Hours)"
              />

              <input
                className="input"
                defaultValue="72"
                placeholder="Road Damage (Hours)"
              />

              <input
                className="input"
                defaultValue="24"
                placeholder="Streetlight (Hours)"
              />

            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security
            </h2>
          </div>

          <div className="card-body grid md:grid-cols-2 gap-4">
            <input
              className="input"
              defaultValue="24"
              placeholder="JWT Expiry (Hours)"
            />

            <input
              className="input"
              defaultValue="30"
              placeholder="Session Timeout (Minutes)"
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </div>
    </DashboardShell>
  );
}