'use client';
import { Bell, Search, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Topbar({ title }: { title?: string }) {
  const { user } = useAuth();
  const [online, setOnline] = useState(true);
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const t = setInterval(tick, 30000);
    setOnline(navigator.onLine);
    window.addEventListener('online',  () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));
    return () => clearInterval(t);
  }, []);

  return (
    <header className="fixed top-0 left-64 right-0 z-20 h-15 bg-white border-b border-slate-200 flex items-center px-6 gap-4" style={{ height: 60 }}>
      {/* Title */}
      <div className="flex-1">
        {title && <h1 className="text-base font-semibold text-slate-800">{title}</h1>}
        {!title && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search complaints, wards..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Live time */}
        <span className="text-xs text-slate-500 font-mono hidden sm:block">{time} IST</span>

        {/* Connection status */}
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${online ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {online
            ? <><Wifi className="w-3 h-3" /><span className="hidden sm:inline">Live</span></>
            : <><WifiOff className="w-3 h-3" /><span className="hidden sm:inline">Offline</span></>}
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition">
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Municipality badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="w-5 h-5 rounded bg-gov-gradient flex-shrink-0" />
          <span className="text-xs font-medium text-slate-700">Jalpaiguri Municipality</span>
        </div>
      </div>
    </header>
  );
}
