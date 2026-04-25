'use client';

import { useState, useRef } from 'react';
import { RotateCcw, Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RestoreAuditButton() {
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Restore audit from this backup file? A new audit will be created with "RESTORED:" prefix.')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setRestoring(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/audits/restore', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newAudit = await res.json();
        router.push(`/audits/${newAudit.id}`);
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Restore failed: ${err.details || err.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred during restoration.');
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={restoring}
        className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 font-bold rounded-lg hover:bg-gray-50 border border-gray-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
      >
        {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
        <span>{restoring ? 'Restoring...' : 'Restore Backup'}</span>
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".zip"
      />
    </>
  );
}
