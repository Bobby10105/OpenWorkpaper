import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Paperclip, Plus, File as FileIcon, Link as LinkIcon, RefreshCw, X, Check, Save } from 'lucide-react';
import type { Attachment } from '@prisma/client';
import { toast } from 'sonner';

export function ProcedureAttachments({
  procedureId,
  nomenclature,
  attachments,
  setAttachments,
  isLocked,
  formatDateForInput,
}: {
  procedureId: string;
  nomenclature: string;
  attachments: Attachment[];
  setAttachments: (att: Attachment[]) => void;
  isLocked: boolean;
  formatDateForInput: (date: Date | string | null) => string;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [savingAttachmentId, setSavingAttachmentId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentChange = (id: string, name: string, value: string) => {
    if (isLocked) return;
    setAttachments(attachments.map(att => {
      if (att.id === id) {
        return { ...att, [name]: value };
      }
      return att;
    }));
  };

  const handleSaveAttachmentMetadata = async (att: Attachment) => {
    if (isLocked) return;
    setSavingAttachmentId(att.id);
    try {
      const res = await fetch(`/api/attachments/${att.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preparedBy: att.preparedBy,
          preparedDate: att.preparedDate,
          reviewedBy: att.reviewedBy,
          reviewedDate: att.reviewedDate,
        }),
      });

      if (res.ok) {
        toast.success('Metadata saved');
        router.refresh();
      } else {
        toast.error('Failed to save attachment details');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error');
    } finally {
      setSavingAttachmentId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('procedureId', procedureId);

    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const newAttachment = await res.json();
        setAttachments([...attachments, newAttachment]);
        toast.success('File uploaded');
        router.refresh();
      } else {
        const errorData = await res.json();
        toast.error(`Upload failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred during upload.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleReplaceClick = (id: string) => {
    if (isLocked) return;
    setReplacingId(id);
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked || !e.target.files || e.target.files.length === 0 || !replacingId) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`/api/attachments/${replacingId}`, {
        method: 'PUT',
        body: formData,
      });
      if (res.ok) {
        const updatedAtt = await res.json();
        setAttachments(attachments.map(a => a.id === replacingId ? updatedAtt : a));
        toast.success('File replaced');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to replace attachment');
      }
    } finally {
      setUploading(false);
      setReplacingId(null);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (isLocked) return;
    if (!confirm('Delete this attachment?')) return;
    try {
      const res = await fetch(`/api/attachments/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAttachments(attachments.filter(a => a.id !== id));
        toast.success('Attachment deleted');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete attachment');
    }
  };

  const handleCopyReference = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className={`bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-2xl space-y-10 transition-all ${isLocked ? 'opacity-70 grayscale-[0.5] pointer-events-none select-none' : ''}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-gray-400 flex items-center tracking-[0.2em] uppercase">
          <div className="bg-blue-50 p-2 rounded-xl mr-4 shadow-sm">
            <Paperclip className="w-5 h-5 text-blue-600" />
          </div>
          Evidence & Attached Workpapers
        </h4>
        {!isLocked && (
          <label className="group/btn relative inline-flex items-center px-6 py-3 bg-blue-600 text-[10px] font-black rounded-xl text-white hover:bg-blue-700 transition-all cursor-pointer active:scale-95 shadow-xl shadow-blue-100 uppercase tracking-widest border border-blue-500 overflow-hidden">
            {uploading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
            )}
            <span>{uploading ? 'Uploading...' : 'Add Evidence'}</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/btn:animate-[shimmer_1.5s_infinite]" />
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt" aria-label="Upload Evidence" />
          </label>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {attachments.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400">
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
              <Paperclip className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest opacity-40">No evidence attached</p>
          </div>
        )}
        {attachments.map((att, index) => {
          const isAttReviewed = att.reviewedBy && att.reviewedDate;
          const isAttPrepared = att.preparedBy && att.preparedDate;
          const attNomenclature = `${nomenclature}.${index + 1}`;
          
          return (
            <div key={att.id} className={`flex flex-col bg-white border rounded-[2rem] shadow-sm transition-all duration-500 overflow-hidden group/att ${
              isAttReviewed ? 'border-blue-200' : isAttPrepared ? 'border-emerald-200' : 'border-gray-100'
            }`}>
              <div className={`px-6 py-5 border-b flex items-center justify-between transition-colors ${
                isAttReviewed ? 'bg-blue-50' : isAttPrepared ? 'bg-emerald-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center min-w-0 flex-1">
                  <span className="text-[10px] font-black text-blue-700 bg-white px-3 py-1.5 rounded-xl border border-blue-100 tracking-tight mr-4 flex-shrink-0 shadow-sm">
                    {attNomenclature}
                  </span>
                  <a href={`/api/attachments/${att.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors truncate">
                    <div className="bg-white p-2 rounded-xl mr-4 shadow-sm border border-gray-100">
                      <FileIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="truncate">{att.filename}</span>
                  </a>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button 
                    onClick={() => handleCopyReference(attNomenclature, att.id)}
                    className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90"
                    title="Copy Reference"
                    aria-label="Copy Reference"
                  >
                    {copiedId === att.id ? <Check className="w-5 h-5 text-emerald-600" /> : <LinkIcon className="w-5 h-5" />}
                  </button>
                  {!isLocked && (
                    <>
                      <button 
                        onClick={() => handleReplaceClick(att.id)}
                        className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90"
                        title="Upload New Version"
                        aria-label="Replace File"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteAttachment(att.id)} 
                        className="p-3 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90"
                        title="Remove Attachment"
                        aria-label="Remove Attachment"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-8 bg-white grid grid-cols-1 md:grid-cols-2 gap-8 items-end border-t border-gray-50">
                <div className="flex flex-col">
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-[0.15em]">Prepared By</label>
                  <input
                    value={att.preparedBy || ''}
                    onChange={(e) => handleAttachmentChange(att.id, 'preparedBy', e.target.value)}
                    disabled={isLocked}
                    className="text-xs font-bold px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-inner disabled:cursor-not-allowed"
                    placeholder="Initials"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-[0.15em]">Prepared Date</label>
                  <input
                    type="date"
                    value={formatDateForInput(att.preparedDate)}
                    onChange={(e) => handleAttachmentChange(att.id, 'preparedDate', e.target.value)}
                    disabled={isLocked}
                    className="text-xs font-bold px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-inner disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-[0.15em]">Reviewed By</label>
                  <input
                    value={att.reviewedBy || ''}
                    onChange={(e) => handleAttachmentChange(att.id, 'reviewedBy', e.target.value)}
                    disabled={isLocked}
                    className="text-xs font-bold px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-inner disabled:cursor-not-allowed"
                    placeholder="Initials"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-[0.15em]">Reviewed Date</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="date"
                      value={formatDateForInput(att.reviewedDate)}
                      onChange={(e) => handleAttachmentChange(att.id, 'reviewedDate', e.target.value)}
                      disabled={isLocked}
                      className="flex-1 text-xs font-bold px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-inner disabled:cursor-not-allowed"
                    />
                    {!isLocked && (
                      <button
                        onClick={() => handleSaveAttachmentMetadata(att)}
                        disabled={savingAttachmentId === att.id}
                        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg active:scale-95 border border-blue-500 flex-shrink-0"
                        title="Save Metadata"
                        aria-label="Save Attachment Metadata"
                      >
                        {savingAttachmentId === att.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <input type="file" ref={replaceInputRef} className="hidden" onChange={handleReplaceFile} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt" />
    </div>
  );
}
