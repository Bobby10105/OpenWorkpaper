import Link from 'next/link';
import { Component as LogoIcon, ClipboardList, Users, BookOpen, Home } from 'lucide-react';
import UserMenu from '@/components/UserMenu';

export default function Header({ user }: { user?: { username: string; role: string; mustChangePassword?: boolean } }) {
  return (
    <header className="bg-blue-600 border-b border-blue-700 sticky top-0 z-50 transition-all duration-300 shadow-lg shadow-blue-900/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-12">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="bg-white p-1.5 rounded-lg group-hover:bg-blue-50 transition-all duration-300 shadow-md group-active:scale-95">
              <LogoIcon className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-blue-100 transition-colors">OpenWorkpaper</span>
          </Link>

          {user && (
            <nav className="hidden lg:flex items-center space-x-1">
              {user.role !== 'IT Administrator' && (
                <Link
                  href="/"
                  className="flex items-center space-x-2 text-blue-100 hover:text-white transition-all text-sm font-medium hover:bg-white/10 px-4 py-2 rounded-xl active:scale-95"
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              )}
              {(user.role === 'IT Administrator' || user.role === 'Business Operations') && (
                <Link
                  href="/audit-logs"
                  className="flex items-center space-x-2 text-blue-100 hover:text-white transition-all text-sm font-medium hover:bg-white/10 px-4 py-2 rounded-xl active:scale-95"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Logs</span>
                </Link>
              )}
              {user.role === 'IT Administrator' && (
                <Link
                  href="/admin/users"
                  className="flex items-center space-x-2 text-blue-100 hover:text-white transition-all text-sm font-medium hover:bg-white/10 px-4 py-2 rounded-xl active:scale-95"
                >
                  <Users className="h-4 w-4" />
                  <span>User Directory</span>
                </Link>
              )}
              {user.role === 'Business Operations' && (
                <Link
                  href="/admin/templates"
                  className="flex items-center space-x-2 text-blue-100 hover:text-white transition-all text-sm font-medium hover:bg-white/10 px-4 py-2 rounded-xl active:scale-95"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Templates</span>
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <nav>
              <Link href="/login" className="text-blue-100 hover:text-white font-medium transition-colors">Sign In</Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
