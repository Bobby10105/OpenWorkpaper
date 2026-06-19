import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getSession } from '@/lib/auth';
import { Toaster } from 'sonner';
import Header from '@/components/Header';

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
        <Toaster position="top-right" richColors />
        {/* Subtle Light Background Accents */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/5 blur-[120px] rounded-full" />
        </div>

        <Header user={user} />

        <main className="flex-1 relative z-10 py-12">
          {children}
        </main>
      </body>
    </html>
  );
}
