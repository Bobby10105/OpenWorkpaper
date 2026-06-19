'use client';

import { useState, useRef } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

async function uploadRestoreFile(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/audits/restore', {
    method: 'POST',
    body: formData, // Send as multipart/form-data
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Failed to restore audit: ${errData.error || 'Unknown error'}`);
  }
}

export default function RestoreAuditButton() {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      await uploadRestoreFile(file);
      router.refresh();
      alert('Audit restored successfully. Refresh your dashboard to see the new entry.');
    } catch (err: unknown) {
      console.error('Restore error:', err);
      const message = err instanceof Error ? err.message : 'Connection error during restore';
      alert(message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json,.zip"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-70 font-bold text-sm uppercase tracking-widest border border-slate-200"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
        <span>Restore</span>
      </button>
    </>
  );
}
