'use client';
/** OpenWorkpaper ProcedureDetail - Full Page Editor with Auto-Save **/
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Trash2, Save, Paperclip, File as FileIcon, X, MessageSquare, RefreshCw, Send, User, CheckCircle, Clock, Link as LinkIcon, Check, AlertCircle, ArrowLeft, Plus, ChevronDown, Lock, Unlock } from 'lucide-react';
import type { Attachment, ProcedureMessage } from '@prisma/client';
import type { ProcedureWithRelations } from '@/lib/types';
import DOMPurify from 'isomorphic-dompurify';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(async () => {
  const mod = await import('react-quill-new');
  return mod.default || mod;
}, { 
  ssr: false,
  loading: () => <div className="w-full h-[300px] bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />
});

export default function ProcedureDetail({ 
  procedure, 
  nomenclature, 
  user,
  teamMembers = [],
  auditId
}: { 
  procedure: ProcedureWithRelations, 
  nomenclature: string, 
  user?: { username: string; role: string; id: string },
  teamMembers?: any[],
  auditId: string
}) {
  const router = useRouter();

  const RICH_TEXT_FIELDS = useMemo(() => ['purpose', 'source', 'scope', 'methodology', 'results', 'conclusions'], []);

  const formatDateForInput = (date: any) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Helper to get only the fields we care about for comparison
  const normalizeData = useCallback((p: any) => {
    const d: any = {
      title: (p.title || '').trim(),
      purpose: p.purpose || '',
      source: p.source || '',
      scope: p.scope || '',
      methodology: p.methodology || '',
      results: p.results || '',
      conclusions: p.conclusions || '',
      preparedBy: (p.preparedBy || '').trim(),
      preparedDate: formatDateForInput(p.preparedDate),
      reviewedBy: (p.reviewedBy || '').trim(),
      reviewedDate: formatDateForInput(p.reviewedDate),
      assignedToId: p.assignedToId || '',
    };

    // Sanitize rich text fields so comparison is against what actually gets saved
    RICH_TEXT_FIELDS.forEach(field => {
      if (typeof d[field] === 'string') {
        d[field] = DOMPurify.sanitize(d[field]).trim();
      }
    });

    return JSON.stringify(d);
  }, [RICH_TEXT_FIELDS]);

  const [data, setData] = useState(procedure);
  const [saving, setSaving] = useState(false);
  const [lastSavedData, setLastSavedData] = useState(normalizeData(procedure));
  const [attachments, setAttachments] = useState<Attachment[]>(procedure.attachments || []);
  const [messages, setMessages] = useState<ProcedureMessage[]>(procedure.messages || []);
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [savingAttachmentId, setSavingAttachmentId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // CRITICAL: Stability Ref pattern to break dependency cycles
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  
  const lastSavedDataRef = useRef(lastSavedData);
  useEffect(() => { lastSavedDataRef.current = lastSavedData; }, [lastSavedData]);

  const isLocked = !!(procedure.reviewedBy && procedure.reviewedDate);
  const isReviewed = data.reviewedBy && data.reviewedDate;
  const isPrepared = data.preparedBy && data.preparedDate;

  // Load draft message from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(`draft-note-${procedure.id}`);
    if (draft) setNewMessage(draft);
  }, [procedure.id]);

  // Save draft message to localStorage
  useEffect(() => {
    if (newMessage) {
      localStorage.setItem(`draft-note-${procedure.id}`, newMessage);
    } else {
      localStorage.removeItem(`draft-note-${procedure.id}`);
    }
  }, [newMessage, procedure.id]);

  // Sync state when props change (e.g. after a refresh or navigation)
  useEffect(() => {
    const normalizedProp = normalizeData(procedure);
    const normalizedState = normalizeData(dataRef.current);
    
    // Only sync if the prop is actually different from our current state
    // and different from what we last thought was saved.
    if (normalizedProp !== lastSavedDataRef.current || normalizedProp !== normalizedState) {
      setData(procedure);
      setAttachments(procedure.attachments || []);
      setMessages(procedure.messages || []);
      setLastSavedData(normalizedProp);
      setHasUnsavedChanges(false);
    }
  }, [procedure, normalizeData]);

  const handleSave = useCallback(async (updatedData?: any) => {
    if (isLocked) return;

    // Use passed data or the latest ref data
    const rawData = updatedData || dataRef.current;
    
    // Create a normalized version of the data we are about to save
    const currentDataStr = normalizeData(rawData);

    // If identical to last saved, bail
    if (currentDataStr === lastSavedDataRef.current) {
      setHasUnsavedChanges(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/procedures/${procedure.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: currentDataStr,
      });
      
      if (res.ok) {
        const savedProcedure = await res.json();
        const savedNormalized = normalizeData(savedProcedure);
        setLastSavedData(savedNormalized);
        
        // Update local state with the sanitized values from savedNormalized 
        // to ensure the next comparison in the Auto-Save useEffect matches exactly.
        const parsedSaved = JSON.parse(savedNormalized);
        setData(prev => ({ ...prev, ...parsedSaved }));
        setHasUnsavedChanges(false);
        
        router.refresh();
      } else if (res.status === 423) {
        alert("This procedure is locked for review and cannot be saved.");
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [procedure.id, router, normalizeData, isLocked]);

  // Debounced Auto-Save Logic - Depends only on data/lastSavedData changes
  useEffect(() => {
    if (isLocked) return;

    const currentDataStr = normalizeData(data);
    const isDirty = currentDataStr !== lastSavedData;

    if (isDirty) {
      if (!hasUnsavedChanges) setHasUnsavedChanges(true);
      
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave();
      }, 3000);
    } else {
      if (hasUnsavedChanges) setHasUnsavedChanges(false);
    }

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [data, lastSavedData, handleSave, isLocked, hasUnsavedChanges]);

  const handleUnlock = async () => {
    if (!confirm("Unlocking this procedure will clear the existing sign-offs and require re-preparation and re-review. Continue?")) return;
    
    setIsUnlocking(true);
    try {
      const res = await fetch(`/api/procedures/${procedure.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock' }),
      });
      
      if (res.ok) {
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to unlock procedure");
      }
    } catch (e) {
      console.error(e);
      alert("Network error unlocking procedure");
    } finally {
      setIsUnlocking(false);
    }
  };

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      const container = chatEndRef.current.parentElement;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  const adjustTextAreaHeight = (el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (isLocked) return;
    setData({ ...data, [e.target.name]: e.target.value });
    
    if (e.target instanceof HTMLTextAreaElement) {
      adjustTextAreaHeight(e.target);
    }
  };

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
        router.refresh();
      } else {
        alert('Failed to save attachment details');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSavingAttachmentId(null);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/procedures/${procedure.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages([...messages, message]);
        setNewMessage('');
        localStorage.removeItem(`draft-note-${procedure.id}`);
        setTimeout(scrollToBottom, 100);
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('procedureId', procedure.id);

    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const newAttachment = await res.json();
        setAttachments([...attachments, newAttachment]);
        router.refresh();
      } else {
        const errorData = await res.json();
        alert(`Upload failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred during upload.');
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
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to replace attachment');
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this procedure?')) return;
    
    try {
      const res = await fetch(`/api/procedures/${procedure.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push(`/audits/${auditId}`);
      } else {
        alert('Failed to delete procedure');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting procedure');
    }
  };

  const handleCopyReference = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const fields = [
    { name: 'purpose', label: 'Purpose' },
    { name: 'source', label: 'Source' },
    { name: 'scope', label: 'Scope' },
    { name: 'methodology', label: 'Methodology' },
    { name: 'results', label: 'Results' },
    { name: 'conclusions', label: 'Conclusions' },
  ];

  let statusBadge = null;
  if (isReviewed) {
    statusBadge = (
      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider flex items-center shadow-lg shadow-blue-100 border border-blue-400 animate-fade-in">
        <CheckCircle className="w-3 h-3 mr-1.5" />
        Reviewed
      </span>
    );
  } else if (isPrepared) {
    statusBadge = (
      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider flex items-center shadow-lg shadow-emerald-100 border border-emerald-400 animate-fade-in">
        <Clock className="w-3 h-3 mr-1.5" />
        Prepared
      </span>
    );
  }

  const canDelete = user?.role !== 'Specialist' && !isLocked;
  const allowedUnlockRoles = ['Auditor', 'Audit Manager', 'Audit Director', 'Audit Partner', 'Business Operations', 'Engagement Manager'];
  const canUnlock = user && allowedUnlockRoles.includes(user.role);

  const isFieldDirty = (fieldName: string) => {
    return data[fieldName as keyof ProcedureWithRelations] !== procedure[fieldName as keyof ProcedureWithRelations];
  };

  const handleRichTextChange = (fieldName: string, content: string) => {
    if (isLocked) return;
    setData(prev => ({ ...prev, [fieldName]: content }));
  };

  const modules = {
    toolbar: isLocked ? false : [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex items-center justify-between shadow-sm animate-slide-up">
           <div className="flex items-center space-x-4">
             <div className="bg-amber-100 p-2 rounded-xl">
               <Lock className="w-5 h-5 text-amber-600" />
             </div>
             <div>
               <p className="text-sm font-bold text-amber-900 tracking-tight">Procedure is Locked</p>
               <p className="text-[11px] text-amber-700 font-medium uppercase tracking-widest opacity-80">This workpaper has been reviewed and is now read-only.</p>
             </div>
           </div>
           {canUnlock && (
             <button
               onClick={handleUnlock}
               disabled={isUnlocking}
               className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-amber-200 text-amber-700 text-[10px] font-black rounded-xl hover:bg-amber-100 transition-all active:scale-95 shadow-sm uppercase tracking-widest"
             >
               {isUnlocking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
               <span>Unlock for Editing</span>
             </button>
           )}
        </div>
      )}

      {/* Header / Navigation */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-2xl transition-all duration-500 ${isLocked ? 'opacity-80 grayscale-[0.3]' : ''}`}>
        <div className="flex items-center space-x-6">
          <Link 
            href={`/audits/${auditId}?phase=${procedure.phase}`}
            className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all shadow-sm active:scale-95 border border-gray-100"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 tracking-[0.1em] uppercase">{nomenclature}</span>
              {statusBadge}
            </div>
            <input
              name="title"
              value={data.title || ''}
              onChange={handleChange}
              disabled={isLocked}
              className="bg-transparent border-none focus:ring-0 text-3xl font-black text-gray-900 placeholder:text-gray-200 p-0 w-full disabled:cursor-not-allowed"
              placeholder="Untitled Procedure"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {!isLocked && (
            <>
              {saving ? (
                <div className="flex items-center space-x-2 mr-4">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Auto-Saving...</span>
                </div>
              ) : hasUnsavedChanges ? (
                <div className="flex items-center space-x-2 mr-4">
                  <Clock className="w-4 h-4 text-orange-400 animate-pulse" />
                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Unsaved Changes</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mr-4 opacity-50">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Saved</span>
                </div>
              )}
              
              <button 
                onClick={() => handleSave()} 
                disabled={saving || !hasUnsavedChanges}
                className={`flex items-center space-x-3 px-8 py-4 text-sm font-black rounded-2xl transition-all active:scale-95 border uppercase tracking-widest ${
                  hasUnsavedChanges 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-200 hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                }`}
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Manual'}</span>
              </button>
            </>
          )}
          
          {isLocked && (
             <div className="flex items-center space-x-3 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400">
               <Lock className="w-5 h-5" />
               <span className="text-xs font-black uppercase tracking-widest">Locked</span>
             </div>
          )}
          
          {canDelete && (
            <button 
              onClick={handleDelete} 
              className="p-4 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-red-100"
              title="Delete Procedure"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className={`xl:col-span-2 space-y-8 ${isLocked ? 'pointer-events-none select-none' : ''}`}>
          {/* Assignment & Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-xl flex items-center space-x-5">
              <div className="bg-blue-50 p-4 rounded-2xl">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Owner Assignment</label>
                <div className="flex flex-col space-y-3">
                  <div className="relative group">
                    <select
                      value={data.assignedToId || ''}
                      onChange={(e) => {
                        const newAssignedId = e.target.value || null;
                        const newData = { ...data, assignedToId: newAssignedId };
                        setData(newData);
                        handleSave(newData);
                      }}
                      disabled={isLocked}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all appearance-none cursor-pointer shadow-inner disabled:cursor-not-allowed"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  
                  {/* Quick Assign to Me shortcut */}
                  {user && !isLocked && !teamMembers.find(m => m.id === data.assignedToId && m.userId === user.id) && (
                    <button
                      onClick={() => {
                        const myMember = teamMembers.find(m => m.userId === user.id || m.email === user.username);
                        if (myMember) {
                          const newData = { ...data, assignedToId: myMember.id };
                          setData(newData);
                          handleSave(newData);
                        } else {
                          alert("You must be added as a Team Member to this audit before you can take ownership.");
                        }
                      }}
                      className="w-fit px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest active:scale-95"
                    >
                      Take Ownership
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-xl flex items-center space-x-5">
              <div className="bg-emerald-50 p-4 rounded-2xl">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Overview</label>
                <div className="text-lg font-bold text-gray-900">
                  {isReviewed ? 'Review Complete' : isPrepared ? 'Ready for Review' : 'Work in Progress'}
                </div>
              </div>
            </div>
          </div>

          {/* Rich Text Fields */}
          <div className="space-y-12">
            {fields.map(field => {
              const isFocused = focusedField === field.name;
              const isDirty = isFieldDirty(field.name);
              
              return (
                <div 
                  key={field.name} 
                  className={`group relative flex flex-col rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${
                    isFocused 
                      ? 'border-blue-500 bg-white shadow-[0_20px_80px_rgba(59,130,246,0.12)] scale-[1.02]' 
                      : 'border-gray-100 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)]'
                  } ${isLocked ? 'bg-gray-50/50' : ''}`}
                >
                  {/* Left Accent Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-500 ${
                    isFocused ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />

                  <div className="flex justify-between items-center py-6 px-10 border-b border-gray-50 bg-gray-50/30">
                    <div className="flex items-center space-x-4">
                      <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isFocused ? 'bg-blue-600 scale-150 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-300'}`} />
                      <label className={`text-xs font-black tracking-[0.25em] uppercase transition-all duration-300 ${
                        isFocused ? 'text-blue-700' : 'text-gray-400'
                      }`}>
                        {field.label}
                      </label>
                    </div>
                    {isDirty && !isLocked && (
                      <span className="flex items-center text-[10px] font-black text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-full border border-blue-100 animate-pulse shadow-sm">
                        <Save className="w-3.5 h-3.5 mr-2" /> Syncing...
                      </span>
                    )}
                    {isLocked && (
                      <Lock className="w-3.5 h-3.5 text-gray-300" />
                    )}
                  </div>

                  <div className="rich-text-wrapper px-4 pb-4">
                    <ReactQuill
                      theme="snow"
                      readOnly={isLocked}
                      value={String(data[field.name as keyof ProcedureWithRelations] || '')}
                      onChange={(content) => handleRichTextChange(field.name, content)}
                      modules={modules}
                      onFocus={() => setFocusedField(field.name)}
                      onBlur={() => {
                        setFocusedField(null);
                        handleSave(); // Immediate save on blur for better feel
                      }}
                      placeholder={isLocked ? "No content provided." : `Provide comprehensive details for ${field.label.toLowerCase()}...`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Attachments Section */}
          <div className={`bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-2xl space-y-10 transition-all ${isLocked ? 'opacity-70 grayscale-[0.5] pointer-events-none select-none' : ''}`}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-gray-400 flex items-center tracking-[0.2em] uppercase">
                <div className="bg-blue-50 p-2 rounded-xl mr-4 shadow-sm">
                  <Paperclip className="w-5 h-5 text-blue-600" />
                </div>
                Evidence & Attached Workpapers
              </h4>
              {!isLocked && (
                <label className="group/btn relative inline-flex items-center px-6 py-3 bg-blue-600 text-[10px] font-black rounded-xl text-white hover:bg-blue-700 transition-all cursor-pointer active:scale-95 shadow-xl shadow-blue-100 uppercase tracking-widest border border-blue-500">
                  <Plus className="w-4 h-4 mr-2" />
                  <span>{uploading ? 'Uploading...' : 'Add Evidence'}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt" />
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
                    {/* Attachment Header */}
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
                        >
                          {copiedId === att.id ? <Check className="w-5 h-5 text-emerald-600" /> : <LinkIcon className="w-5 h-5" />}
                        </button>
                        {!isLocked && (
                          <>
                            <button 
                              onClick={() => handleReplaceClick(att.id)}
                              className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90"
                              title="Upload New Version"
                            >
                              <RefreshCw className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteAttachment(att.id)} 
                              className="p-3 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90"
                              title="Remove Attachment"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Attachment Metadata Grid */}
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
        </div>

        {/* Sidebar: Chat & Auth Details */}
        <div className="space-y-8">
          {/* Chat / Discussion */}
          <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl flex flex-col h-[700px] overflow-hidden">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50">
              <h4 className="text-xs font-black text-gray-900 flex items-center tracking-[0.2em] uppercase">
                <div className="bg-blue-600 p-2 rounded-xl mr-4 shadow-lg shadow-blue-100">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                Review Notes
              </h4>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <MessageSquare className="w-16 h-16 text-gray-400 mb-6" />
                  <p className="text-sm font-bold uppercase tracking-widest text-gray-500">No discussion yet</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.author === user?.username ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center space-x-3 mb-2 px-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{msg.author}</span>
                    <span suppressHydrationWarning className="text-[9px] text-gray-300 font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`px-6 py-4 rounded-2xl max-w-[90%] text-sm shadow-sm leading-relaxed border ${
                    msg.author === user?.username 
                      ? 'bg-blue-600 text-white rounded-tr-none border-blue-500 shadow-blue-50' 
                      : 'bg-gray-50 text-gray-800 border-gray-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} className="p-6 bg-gray-50/50 border-t border-gray-100 flex space-x-3">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Add a review note..."
                className="flex-1 px-6 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sendingMessage}
                className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 active:scale-90 border border-blue-500"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Sign-offs Card */}
          <div className={`bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-2xl space-y-10 transition-all ${isLocked ? 'opacity-80' : ''}`}>
            <h4 className="text-xs font-black text-gray-400 tracking-[0.2em] uppercase">Sign-offs & Dates</h4>
            
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-400 mb-3 tracking-widest uppercase px-1">Prepared By</label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-100 p-2 rounded-xl group-focus-within/input:bg-blue-50 transition-all">
                      <User className="w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600" />
                    </div>
                    <input
                      name="preparedBy"
                      value={String(data.preparedBy || '')}
                      onChange={handleChange}
                      disabled={isLocked}
                      className="w-full pl-16 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm font-bold text-gray-900 outline-none shadow-inner disabled:cursor-not-allowed"
                      placeholder="Auditor Name"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-400 mb-3 tracking-widest uppercase px-1">Prepared Date</label>
                  <input
                    name="preparedDate"
                    type="date"
                    value={formatDateForInput(data.preparedDate)}
                    onChange={handleChange}
                    disabled={isLocked}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm font-bold text-gray-900 outline-none shadow-inner disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              
              <div className="h-px bg-gray-100" />
              
              <div className="space-y-6">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-400 mb-3 tracking-widest uppercase px-1">Reviewed By</label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-100 p-2 rounded-xl group-focus-within/input:bg-blue-50 transition-all">
                      <CheckCircle className="w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600" />
                    </div>
                    <input
                      name="reviewedBy"
                      value={String(data.reviewedBy || '')}
                      onChange={handleChange}
                      disabled={isLocked}
                      className="w-full pl-16 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm font-bold text-gray-900 outline-none shadow-inner disabled:cursor-not-allowed"
                      placeholder="Reviewer Name"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-400 mb-3 tracking-widest uppercase px-1">Reviewed Date</label>
                  <input
                    name="reviewedDate"
                    type="date"
                    value={formatDateForInput(data.reviewedDate)}
                    onChange={handleChange}
                    disabled={isLocked}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm font-bold text-gray-900 outline-none shadow-inner disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e2e8f0;
        }
        .rich-text-wrapper :global(.ql-toolbar.ql-snow) {
          border: 1px solid #e2e8f0;
          border-bottom: none;
          padding: 1rem;
          background-color: #f8fafc;
          border-top-left-radius: 1.5rem;
          border-top-right-radius: 1.5rem;
        }
        .rich-text-wrapper :global(.ql-container.ql-snow) {
          border: 1px solid #e2e8f0;
          min-height: 250px;
          font-family: inherit;
          border-bottom-left-radius: 1.5rem;
          border-bottom-right-radius: 1.5rem;
          background-color: white;
        }
        .rich-text-wrapper :global(.ql-editor) {
          min-height: 250px;
          font-size: 1rem;
          line-height: 1.8;
          padding: 2rem;
          color: #1e293b;
        }
        .rich-text-wrapper :global(.ql-editor.ql-blank::before) {
          left: 2rem;
          color: #cbd5e1;
          font-style: normal;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
