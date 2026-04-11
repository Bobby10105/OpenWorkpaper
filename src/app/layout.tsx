import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { FileText, ClipboardList, Users, BookOpen, Home } from 'lucide-react';
import { getSession } from '@/lib/auth';
import UserMenu from '@/components/UserMenu';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AMSOS - Audit Management',
  description: 'Audit Management Software Open Source',
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
      <body className={`${inter.className} bg-gray-50 min-h-screen flex flex-col`}>
        <header className="bg-blue-900 text-white shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="bg-blue-800 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
                  <FileText className="h-6 w-6 text-blue-300" />
                </div>
                <span className="text-xl font-bold tracking-wider">AMSOS</span>
              </Link>

              {user && (
                <nav className="hidden lg:flex items-center space-x-4">
                  <Link
                    href="/"
                    className="flex items-center space-x-2 text-blue-100 hover:text-white transition-colors text-sm font-medium bg-blue-800/40 hover:bg-blue-800/60 px-3 py-2 rounded-lg"
                  >
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  {(user.role === 'IT Administrator' || user.role === 'Business Operations') && (
                    <Link
                      href="/audit-logs"
                      className="flex items-center space-x-2 text-blue-100 hover:text-white transition-colors text-sm font-medium bg-blue-800/40 hover:bg-blue-800/60 px-3 py-2 rounded-lg"
                    >
                      <ClipboardList className="h-4 w-4" />
                      <span>Logs</span>
                    </Link>
                  )}
                  {user.role === 'IT Administrator' && (
                    <Link 
                      href="/admin/users" 
                      className="flex items-center space-x-2 text-blue-100 hover:text-white transition-colors text-sm font-medium bg-blue-800/40 hover:bg-blue-800/60 px-3 py-2 rounded-lg"
                    >
                      <Users className="h-4 w-4" />
                      <span>User Directory</span>
                    </Link>
                  )}
                  {user.role === 'Business Operations' && (
                    <Link 
                      href="/admin/templates" 
                      className="flex items-center space-x-2 text-blue-100 hover:text-white transition-colors text-sm font-medium bg-blue-800/40 hover:bg-blue-800/60 px-3 py-2 rounded-lg"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Templates</span>
                    </Link>
                  )}
                </nav>
              )}
            </div>
            
            {user ? (
              <UserMenu user={user} />
            ) : (
              <nav>
                <Link href="/login" className="hover:text-blue-200 font-medium">Sign In</Link>
              </nav>
            )}
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
