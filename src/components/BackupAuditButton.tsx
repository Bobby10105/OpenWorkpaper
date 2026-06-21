'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface BackupAuditButtonProps {
  auditId: string;
  auditTitle: string;
}

export default function BackupAuditButton({ auditId, auditTitle }: BackupAuditButtonProps) {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch(`/api/audits/${auditId}/backup`);
      if (!response.ok) throw new Error('Backup failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const safeTitle = auditTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `backup_${safeTitle}_${dateStr}.zip`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Backup error:', error);
      alert('Failed to generate audit backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <button
      onClick={handleBackup}
      disabled={isBackingUp}
      className="flex items-center space-x-2 px-4 py-2 bg-indigo-900 text-white rounded-md hover:bg-indigo-800 transition-colors disabled:opacity-50 shadow-sm"
      title="Download full audit data and attachments as ZIP"
    >
      {isBackingUp ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="w-4 h-4" aria-hidden="true" />
      )}
      <span>{isBackingUp ? 'Preparing...' : 'Backup (.zip)'}</span>
    </button>
  );
}
