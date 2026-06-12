'use client';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  title?: string;
  requireMinRole?: string;
}

export default function DashboardShell({ children, title, requireMinRole }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) { router.replace('/login'); }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-64">
        <Topbar title={title} />
        <main className="pt-[60px] min-h-screen">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
