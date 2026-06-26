'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import type { AuditWithRelations } from '@/lib/types';
import { generateAuditDocx } from '@/lib/export-docx';

type ExportAuditButtonProps = {
  audit: AuditWithRelations;
  className?: string;
};

export default function ExportAuditButton({ audit, className = '' }: ExportAuditButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await generateAuditDocx(audit);
      saveAs(blob, `Audit_Program_${audit.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.docx`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export the audit documentation.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`flex items-center space-x-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors disabled:opacity-50 shadow-sm ${className}`}
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      <span>{isExporting ? 'Generating...' : 'Export Word (.docx)'}</span>
    </button>
  );
}
