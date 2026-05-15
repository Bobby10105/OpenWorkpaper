import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-black text-slate-900 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-slate-600 mb-8 uppercase tracking-widest">Page Not Found</h2>
      <p className="text-slate-500 mb-10 max-w-md mx-auto">
        The audit workpaper or resource you are looking for does not exist or has been archived.
      </p>
      <Link 
        href="/" 
        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
