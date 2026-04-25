'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Calendar, Upload, FileSpreadsheet, Trash2, Loader2, RefreshCw } from 'lucide-react';
import type { Audit } from '@prisma/client';

const formatDateForInput = (date: Date | null | undefined) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const getInitialState = (a: Audit) => ({
  fieldworkStartDate: formatDateForInput(a.fieldworkStartDate),
  fieldworkEndDate: formatDateForInput(a.fieldworkEndDate),
  reportIssuedDate: formatDateForInput(a.reportIssuedDate),
});

export default function MilestonesTab({ audit }: { audit: Audit }) {
  const [data, setData] = useState(getInitialState(audit));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(audit.milestoneAttachmentUrl);
  const [attachmentName, setAttachmentName] = useState<string | null>(audit.milestoneAttachmentName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setData(getInitialState(audit));
    setAttachmentUrl(audit.milestoneAttachmentUrl);
    setAttachmentName(audit.milestoneAttachmentName);
  }, [audit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!audit.id) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.refresh();
      } else {
        let errorMsg = 'Server error';
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch {
          errorMsg = await res.text() || errorMsg;
        }
        alert(`Failed to save milestones: ${errorMsg}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`An error occurred: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

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

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auditId', audit.id);
    formData.append('type', 'milestone');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const updatedAudit = await res.json();
        setAttachmentUrl(updatedAudit.milestoneAttachmentUrl);
        setAttachmentName(updatedAudit.milestoneAttachmentName);
        router.refresh();
      } else {
        let errorMsg = 'Upload failed';
        try {
          const responseData = await res.json();
          errorMsg = responseData.error || errorMsg;
        } catch {
          errorMsg = await res.text() || errorMsg;
        }
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
    if (!confirm('Are you sure you want to remove this attachment?')) return;

    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneAttachmentUrl: null }),
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

  const milestones = [
    { name: 'fieldworkStartDate', label: 'Fieldwork Start Date' },
    { name: 'fieldworkEndDate', label: 'Fieldwork End Date' },
    { name: 'reportIssuedDate', label: 'Report Issued Date' },
  ];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Timeline Management</h3>
            <p className="text-gray-500 text-sm mt-1">Define key operational dates for this engagement.</p>
          </div>
          
          <div className="space-y-8">
            {milestones.map((milestone) => (
              <div key={milestone.name} className="flex flex-col group">
                <label className="text-[10px] font-bold text-gray-400 mb-3 tracking-[0.15em] uppercase flex items-center group-hover:text-blue-600 transition-colors">
                  <Calendar className="w-4 h-4 mr-2.5 text-blue-600" />
                  {milestone.label}
                </label>
                <input
                  name={milestone.name}
                  type="date"
                  value={data[milestone.name as keyof typeof data]}
                  onChange={handleChange}
                  className="max-w-md w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent hover:bg-white transition-all text-sm font-semibold text-gray-900 outline-none shadow-inner"
                />
              </div>
            ))}
          </div>
          
          <div className="flex pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-10 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 active:scale-95 border border-blue-500 tracking-wider uppercase text-xs"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>{saving ? 'Syncing...' : 'Update Timeline'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Detailed Milestone Data</h3>
            <p className="text-gray-500 text-sm mt-1">Supplementary tracking via project spreadsheet.</p>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 p-10 flex flex-col items-center justify-center space-y-6 shadow-inner transition-all hover:bg-gray-50 hover:border-gray-300">
            {attachmentUrl ? (
              <div className="w-full space-y-6">
                <div className="flex items-center p-6 bg-white rounded-3xl border border-gray-100 shadow-xl">
                  <div className="p-4 bg-blue-50 rounded-2xl mr-5 shadow-inner border border-blue-100">
                    <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate mb-1">
                      {attachmentName || 'Milestone Details'}
                    </p>
                    <a
                      href={`/api/audits/${audit.id}/milestone`}
                      download={attachmentName || 'milestones.xlsx'}
                      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors uppercase tracking-widest"
                    >
                      <Upload className="w-3 h-3 mr-1.5 rotate-180" />
                      Download Data
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAttachment}
                    className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-[11px] text-gray-400 hover:text-blue-600 font-bold flex items-center space-x-2 transition-all uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-gray-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${uploading ? 'animate-spin' : ''}`} />
                    <span>Replace Master File</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 bg-blue-50 rounded-full border border-blue-100 shadow-sm">
                  <FileSpreadsheet className="w-12 h-12 text-blue-400" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-base font-bold text-gray-900 tracking-tight">No Master File Attached</p>
                  <p className="text-sm text-gray-500 max-w-[200px] leading-relaxed">Upload a .xlsx or .csv for granular task tracking.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center space-x-3 px-8 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50 shadow-lg active:scale-95 text-xs uppercase tracking-wider"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-blue-600" />}
                  <span>{uploading ? 'Processing...' : 'Upload Spreadsheet'}</span>
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
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start space-x-3 shadow-inner">
            <div className="bg-blue-100 p-1 rounded-md shrink-0">
              <Calendar className="w-3 h-3 text-blue-600" />
            </div>
            <p className="text-[11px] text-gray-500 italic leading-relaxed">
              Recommended: Use a structured spreadsheet to track individual task assignments, percent complete, and resource allocation across the audit lifecycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
