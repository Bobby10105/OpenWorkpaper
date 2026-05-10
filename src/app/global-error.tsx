'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 flex items-center justify-center min-h-screen">
        <div className="text-center p-10 bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full">
          <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">System Critical Error</h2>
          <p className="text-slate-500 mb-8 font-medium">{error.message || "A terminal application error has occurred."}</p>
          <button
            onClick={() => reset()}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs"
          >
            Attempt System Reset
          </button>
          {error.digest && (
            <p className="mt-6 text-[9px] font-mono text-slate-300 uppercase tracking-tighter">Diagnostic ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
