'use client';

import { LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UserMenu({ user }: { user: { username: string; role: string } }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex items-center space-x-6">
      <div className="flex items-center space-x-3 text-slate-700 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="bg-blue-50 p-2 rounded-xl border border-blue-100 shadow-sm">
          <UserIcon className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight text-slate-900">{user.username}</span>
          <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold leading-tight mt-0.5">{user.role}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Link
          href="/settings/password"
          className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 text-xs font-bold transition-all bg-slate-50 hover:bg-blue-50 border border-slate-200 px-4 py-2.5 rounded-xl active:scale-95 uppercase tracking-wider"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Secure</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-slate-500 hover:text-red-600 text-xs font-bold transition-all bg-slate-50 hover:bg-red-50 border border-slate-200 px-4 py-2.5 rounded-xl active:scale-95 uppercase tracking-wider"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>
    </div>
  );
}
