import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Component as LogoIcon, ClipboardList, Users, BookOpen, Home } from 'lucide-react';
import { getSession } from '@/lib/auth';
import UserMenu from '@/components/UserMenu';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'OpenWorkpaper - Audit Management',
  description: 'Open Source Audit Management System',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const user = session?.user;

  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen flex flex-col relative`}>
        {/* Subtle Light Background Accents */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/5 blur-[120px] rounded-full" />
        </div>

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

        <main className="flex-1 relative z-10 py-12">
          {children}
        </main>
      </body>
    </html>
  );
}
