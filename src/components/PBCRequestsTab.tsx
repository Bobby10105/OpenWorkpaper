'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, Trash2, Loader2, RefreshCw, HelpCircle } from 'lucide-react';
import type { Audit } from '@prisma/client';

export default function PBCRequestsTab({ audit }: { audit: Audit }) {
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(audit.pbcAttachmentUrl);
  const [attachmentName, setAttachmentName] = useState<string | null>(audit.pbcAttachmentName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setAttachmentUrl(audit.pbcAttachmentUrl);
    setAttachmentName(audit.pbcAttachmentName);
  }, [audit]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audit.id) {
      alert("Error: Cannot upload, Audit ID is missing.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      alert("Invalid file type. Please upload a .xlsx, .xls, or .csv file.");
      return;
    }

    console.log('[PBC] Starting upload for audit:', audit.id);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auditId', audit.id);
    formData.append('type', 'pbc');

    try {
      console.log('[PBC] Fetching /api/upload...');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('[PBC] Response status:', res.status);
      const responseData = await res.json().catch(() => ({}));
      console.log('[PBC] Response data:', responseData);

      if (res.ok) {
        console.log('[PBC] Upload success');
        setAttachmentUrl(responseData.pbcAttachmentUrl);
        setAttachmentName(responseData.pbcAttachmentName);
        router.refresh();
      } else {
        const errorMsg = responseData.message || responseData.error || responseData.details || 'Upload failed';
        console.error('[PBC] Upload failed:', errorMsg);
        alert(`Upload failed: ${errorMsg}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`An error occurred during upload: ${errorMessage}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async () => {
    if (!audit.id) return;
    if (!confirm('Are you sure you want to remove this PBC spreadsheet?')) return;

    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pbcAttachmentUrl: null }),
      });

      if (res.ok) {
        setAttachmentUrl(null);
        setAttachmentName(null);
        router.refresh();
      } else {
        alert("Failed to remove attachment.");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">PBC (Provided by Client) Requests</h3>
          <p className="text-gray-500 text-sm mt-1">Manage and track information requests sent to the client.</p>
        </div>
        
        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 p-12 flex flex-col items-center justify-center space-y-8 shadow-inner transition-all hover:bg-gray-50 hover:border-gray-300">
          {attachmentUrl ? (
            <div className="w-full max-w-lg space-y-6">
              <div className="flex items-center p-8 bg-white rounded-3xl border border-gray-100 shadow-xl">
                <div className="p-5 bg-green-50 rounded-2xl mr-6 shadow-inner border border-green-100">
                  <FileSpreadsheet className="w-10 h-10 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-gray-900 truncate mb-1">
                    {attachmentName || 'PBC Spreadsheet'}
                  </p>
                  <a
                    href={`/api/audits/${audit.id}/pbc`}
                    download={attachmentName || 'pbc_requests.xlsx'}
                    className="inline-flex items-center text-xs text-green-600 hover:text-green-700 font-bold transition-colors uppercase tracking-widest"
                  >
                    <Upload className="w-3 h-3 mr-1.5 rotate-180" />
                    Download PBC Tracker
                  </a>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAttachment}
                  className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
                  title="Remove PBC spreadsheet"
                  aria-label="Remove PBC spreadsheet"
                >
                  <Trash2 className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-[11px] text-gray-400 hover:text-green-600 font-bold flex items-center space-x-2 transition-all uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 ${uploading ? 'animate-spin' : ''}`} />
                  <span>Replace Spreadsheet</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-8 bg-green-50 rounded-full border border-green-100 shadow-sm">
                <FileSpreadsheet className="w-16 h-16 text-green-400" />
              </div>
              <div className="text-center space-y-3">
                <p className="text-lg font-bold text-gray-900 tracking-tight">No PBC Spreadsheet Uploaded</p>
                <p className="text-sm text-gray-500 max-w-md leading-relaxed">
                  Upload your master PBC Request List to centralize tracking of all client-provided documentation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center space-x-3 px-10 py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg shadow-green-100 active:scale-95 text-sm uppercase tracking-wider"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <span>{uploading ? 'Uploading...' : 'Upload PBC Spreadsheet'}</span>
              </button>
            </>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".xlsx,.xls,.csv"
          />
        </div>

        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-start space-x-4 shadow-sm">
          <div className="bg-blue-100 p-2 rounded-xl shrink-0">
            <HelpCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-blue-900">About PBC Requests</p>
            <p className="text-xs text-blue-700/80 leading-relaxed">
              The PBC (Provided by Client) spreadsheet is a critical tool for coordinating information gathering. 
              Uploading it here ensures that all team members have access to the latest request statuses and 
              helps maintain a single source of truth for client communications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
