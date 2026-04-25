'use client';
/** AMSOS ProcedureItem - Rich Text Sync v2 **/
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Trash2, Save, Paperclip, File as FileIcon, X, ChevronDown, ChevronRight, MessageSquare, RefreshCw, Send, User, CheckCircle, Clock, Link as LinkIcon, Check, AlertCircle } from 'lucide-react';
import type { Attachment, ProcedureMessage } from '@prisma/client';
import type { ProcedureWithRelations } from '@/lib/types';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(async () => {
  const mod = await import('react-quill-new');
  return mod.default || mod;
}, { 
  ssr: false,
  loading: () => <div className="w-full h-[180px] bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />
});

export default function ProcedureItem({ 
  procedure, 
  nomenclature, 
  onDelete,
  user,
  teamMembers = []
}: { 
  procedure: ProcedureWithRelations, 
  nomenclature: string, 
  onDelete: () => void,
  user?: { username: string; role: string; id: string },
  teamMembers?: any[]
}) {
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

  const [data, setData] = useState(procedure);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>(procedure.attachments || []);
  const [messages, setMessages] = useState<ProcedureMessage[]>(procedure.messages || []);
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [savingAttachmentId, setSavingAttachmentId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    setData(procedure);
    setAttachments(procedure.attachments || []);
    setMessages(procedure.messages || []);
  }, [procedure]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const adjustTextAreaHeight = (el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
    
    if (e.target instanceof HTMLTextAreaElement) {
      adjustTextAreaHeight(e.target);
    }
  };

  const handleSave = async (updatedData?: any) => {
    setSaving(true);
    
    const saveData = updatedData || data;
    const payload = {
      title: saveData.title,
      purpose: saveData.purpose,
      source: saveData.source,
      scope: saveData.scope,
      methodology: saveData.methodology,
      results: saveData.results,
      conclusions: saveData.conclusions,
      preparedBy: saveData.preparedBy,
      preparedDate: saveData.preparedDate,
      reviewedBy: saveData.reviewedBy,
      reviewedDate: saveData.reviewedDate,
      assignedToId: saveData.assignedToId,
    };

    try {
      const res = await fetch(`/api/procedures/${procedure.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const err = await res.json();
        alert('Failed to save procedure: ' + (err.details || err.error || 'Unknown error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAttachmentChange = (id: string, name: string, value: string) => {
    setAttachments(attachments.map(att => {
      if (att.id === id) {
        return { ...att, [name]: value };
      }
      return att;
    }));
  };

  const handleSaveAttachmentMetadata = async (att: Attachment) => {
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
    setReplacingId(id);
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !replacingId) return;
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this procedure?')) {
      onDelete();
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

  const isReviewed = data.reviewedBy && data.reviewedDate;
  const isPrepared = data.preparedBy && data.preparedDate;

  let containerStyle = 'bg-white border-gray-200';
  let headerStyle = 'bg-gray-50 border-gray-100 hover:bg-gray-100';
  let statusBadge = null;

  if (isReviewed) {
    containerStyle = 'bg-white border-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.08)]';
    headerStyle = 'bg-blue-50/50 border-blue-100 hover:bg-blue-50';
    statusBadge = (
      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider flex items-center shadow-lg shadow-blue-100 border border-blue-400">
        <CheckCircle className="w-3 h-3 mr-1.5" />
        Reviewed
      </span>
    );
  } else if (isPrepared) {
    containerStyle = 'bg-white border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.08)]';
    headerStyle = 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50';
    statusBadge = (
      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider flex items-center shadow-lg shadow-emerald-100 border border-emerald-400">
        <Clock className="w-3 h-3 mr-1.5" />
        Prepared
      </span>
    );
  }

  const canDelete = user?.role !== 'Specialist';

  const isFieldDirty = (fieldName: string) => {
    return data[fieldName as keyof ProcedureWithRelations] !== procedure[fieldName as keyof ProcedureWithRelations];
  };

  const handleRichTextChange = (fieldName: string, content: string) => {
    setData(prev => ({ ...prev, [fieldName]: content }));
  };

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  const assignedMember = teamMembers.find(m => m.id === data.assignedToId) || procedure.assignedTo;

  return (
    <div id={`proc-${nomenclature}`} className={`border rounded-2xl overflow-hidden transition-all duration-500 group/procedure shadow-xl ${containerStyle}`}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-6 py-5 border-b flex justify-between items-center cursor-pointer transition-all duration-300 ${headerStyle}`}
      >
        <div className="flex items-center space-x-5 flex-1">
          <div className="p-1.5 rounded-xl bg-white text-gray-400 group-hover/procedure:text-gray-900 group-hover/procedure:shadow-sm transition-all border border-gray-100">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
          <div className="flex items-center space-x-4 flex-1">
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 tracking-tight uppercase shadow-sm">{nomenclature}</span>
            <div className="flex-1 flex items-center space-x-3">
              <input
                name="title"
                value={data.title || ''}
                onChange={handleChange}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white border border-gray-100 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-gray-900 font-bold placeholder:text-gray-400 text-lg tracking-tight px-4 py-2 rounded-xl transition-all shadow-sm"
                placeholder="Untitled Procedure"
              />
              {!isExpanded && assignedMember && (
                <div className="flex items-center px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg shadow-sm" title={`Assigned to: ${assignedMember.name}`}>
                  <User className="w-3 h-3 text-blue-600 mr-1.5" />
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight truncate max-w-[80px]">
                    {assignedMember.name.split(' ').map((n: any) => n[0]).join('')}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="hidden sm:block">
            {statusBadge}
          </div>
        </div>
        <div className="flex items-center space-x-4 ml-4">
          {saving && <span className="text-[10px] text-blue-600 animate-pulse font-bold tracking-widest">SAVING</span>}
          <button 
            onClick={(e) => { e.stopPropagation(); handleSave(); }} 
            disabled={saving}
            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-100 transition-all active:scale-95 border border-blue-500"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline uppercase tracking-wider">Save</span>
          </button>
          {canDelete && (
            <button 
              onClick={handleDelete} 
              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
              title="Delete Procedure"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-8 space-y-12 animate-in fade-in zoom-in-95 duration-300 bg-gray-50/50">
          {/* Assignment Dropdown */}
          <div className="flex items-center space-x-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm max-w-sm">
            <div className="bg-blue-50 p-2 rounded-xl">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Owner Assignment</label>
              <select
                value={data.assignedToId || ''}
                onChange={(e) => {
                  const newAssignedId = e.target.value || null;
                  const newData = { ...data, assignedToId: newAssignedId };
                  setData(newData);
                  handleSave(newData);
                }}
                className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12">
            {fields.map(field => {
              const isFocused = focusedField === field.name;
              const isDirty = isFieldDirty(field.name);
              
              return (
                <div 
                  key={field.name} 
                  className={`group relative flex flex-col p-8 rounded-[2rem] border transition-all duration-500 ${
                    isFocused 
                      ? 'border-blue-400 bg-white shadow-[0_0_40px_rgba(59,130,246,0.1)]' 
                      : 'border-gray-200 bg-gray-100 hover:bg-gray-200/60 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-5 px-1">
                    <label className={`text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-300 ${
                      isFocused ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {field.label}
                    </label>
                    <div className="flex items-center space-x-3">
                      {isDirty && (
                        <span className="flex items-center text-[9px] font-bold text-orange-700 uppercase tracking-widest bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200 animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Unsaved Changes
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rich-text-wrapper">
                    <ReactQuill
                      theme="snow"
                      value={String(data[field.name as keyof ProcedureWithRelations] || '')}
                      onChange={(content) => handleRichTextChange(field.name, content)}
                      modules={modules}
                      onFocus={() => setFocusedField(field.name)}
                      onBlur={() => setFocusedField(null)}
                      placeholder={`Type ${field.label.toLowerCase()} here...`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Section */}
          <div className="pt-10 mt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-8 px-2">
              <h4 className="text-[11px] font-bold text-gray-400 flex items-center tracking-[0.15em] uppercase">
                <div className="bg-blue-50 p-1.5 rounded-lg mr-3 shadow-sm">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
                Review Points & Discussion
              </h4>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden flex flex-col max-h-[500px] shadow-inner">
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 opacity-30">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                      <MessageSquare className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">Secure discussion for this procedure.</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.author === user?.username ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center space-x-3 mb-2 px-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{msg.author}</span>
                      <span className="text-[9px] text-gray-400 font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`px-5 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm leading-relaxed border ${
                      msg.author === user?.username 
                        ? 'bg-blue-600 text-white rounded-tr-none border-blue-500 shadow-blue-100' 
                        : 'bg-gray-50 text-gray-800 border-gray-200 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              
              <form onSubmit={handleSendMessage} className="p-6 bg-gray-50/50 border-t border-gray-200 flex space-x-4">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Add a review note..."
                  className="flex-1 px-6 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:bg-white outline-none transition-all shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 active:scale-90 border border-blue-500"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>

          {/* Auth Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-gray-200">
            <div className="space-y-8">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 mb-3 tracking-[0.15em] uppercase">Prepared By</label>
                <div className="relative group/input">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-100 p-1 rounded-lg group-focus-within/input:bg-blue-50 transition-all">
                    <User className="w-4 h-4 text-gray-400 group-focus-within/input:text-blue-600" />
                  </div>
                  <input
                    name="preparedBy"
                    value={String(data.preparedBy || '')}
                    onChange={handleChange}
                    className="w-full pl-14 pr-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent hover:bg-white transition-all text-sm font-semibold text-gray-900 outline-none shadow-inner"
                    placeholder="Auditor Name"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 mb-3 tracking-[0.15em] uppercase">Prepared Date</label>
                <input
                  name="preparedDate"
                  type="date"
                  value={formatDateForInput(data.preparedDate)}
                  onChange={handleChange}
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent hover:bg-white transition-all text-sm font-semibold text-gray-900 outline-none shadow-inner"
                />
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 mb-3 tracking-[0.15em] uppercase">Reviewed By</label>
                <div className="relative group/input">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-100 p-1 rounded-lg group-focus-within/input:bg-blue-50 transition-all">
                    <CheckCircle className="w-4 h-4 text-gray-400 group-focus-within/input:text-blue-600" />
                  </div>
                  <input
                    name="reviewedBy"
                    value={String(data.reviewedBy || '')}
                    onChange={handleChange}
                    className="w-full pl-14 pr-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent hover:bg-white transition-all text-sm font-semibold text-gray-900 outline-none shadow-inner"
                    placeholder="Reviewer Name"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 mb-3 tracking-[0.15em] uppercase">Reviewed Date</label>
                <input
                  name="reviewedDate"
                  type="date"
                  value={formatDateForInput(data.reviewedDate)}
                  onChange={handleChange}
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent hover:bg-white transition-all text-sm font-semibold text-gray-900 outline-none shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="pt-10 border-t border-gray-200">
            <h4 className="text-[11px] font-bold text-gray-400 mb-8 flex items-center tracking-[0.15em] uppercase">
              <div className="bg-blue-50 p-1.5 rounded-lg mr-3 shadow-sm">
                <Paperclip className="w-4 h-4 text-blue-600" />
              </div>
              Evidence & Attached Workpapers
            </h4>
            
            <div className="grid grid-cols-1 gap-5 mb-8">
              {attachments.length === 0 && (
                <div className="text-center py-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400">
                  <p className="text-sm font-medium opacity-50">No evidence attached to this procedure.</p>
                </div>
              )}
              {attachments.map((att, index) => {
                const isAttReviewed = att.reviewedBy && att.reviewedDate;
                const isAttPrepared = att.preparedBy && att.preparedDate;
                const attNomenclature = `${nomenclature}.${index + 1}`;
                
                return (
                  <div key={att.id} className={`flex flex-col bg-white border rounded-[2rem] shadow-sm transition-all duration-500 overflow-hidden group/att ${
                    isAttReviewed ? 'border-blue-200' : isAttPrepared ? 'border-green-200' : 'border-gray-100'
                  }`}>
                    {/* Attachment Header */}
                    <div className={`px-6 py-5 border-b flex items-center justify-between transition-colors ${
                      isAttReviewed ? 'bg-blue-50' : isAttPrepared ? 'bg-green-50' : 'bg-gray-100/50'
                    }`}>
                      <div className="flex items-center min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 tracking-tight mr-4 flex-shrink-0 shadow-inner">
                          {attNomenclature}
                        </span>
                        <a href={`/api/attachments/${att.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors truncate">
                          <div className="bg-white p-1.5 rounded-lg mr-3 shadow-sm">
                            <FileIcon className="w-4 h-4 text-blue-500" />
                          </div>
                          <span className="truncate">{att.filename}</span>
                        </a>
                        <div className="ml-8 hidden lg:flex items-center space-x-4">
                          {isAttReviewed ? (
                            <span className="flex items-center text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-100 px-3 py-1 rounded-full border border-blue-200 shadow-sm"><CheckCircle className="w-3 h-3 mr-2" /> Verified</span>
                          ) : isAttPrepared ? (
                            <span className="flex items-center text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-100 px-3 py-1 rounded-full border border-green-200 shadow-sm"><CheckCircle className="w-3 h-3 mr-2" /> Complete</span>
                          ) : (
                            <span className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full border border-gray-200"><Clock className="w-3 h-3 mr-2" /> Pending</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button 
                          onClick={() => handleCopyReference(attNomenclature, att.id)}
                          className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90"
                          title="Copy Link"
                        >
                          {copiedId === att.id ? <Check className="w-4 h-4 text-green-600 animate-bounce" /> : <LinkIcon className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleReplaceClick(att.id)}
                          className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90"
                          title="New Version"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAttachment(att.id)} 
                          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Attachment Metadata Grid */}
                    <div className="p-8 bg-white grid grid-cols-1 md:grid-cols-4 gap-8 items-end border-t border-gray-50">
                      <div className="flex flex-col">
                        <label className="text-[9px] font-bold text-gray-400 uppercase mb-3 tracking-widest px-1">Prepared By</label>
                        <input
                          value={att.preparedBy || ''}
                          onChange={(e) => handleAttachmentChange(att.id, 'preparedBy', e.target.value)}
                          className="text-xs font-bold px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-200 outline-none transition-all text-gray-900 shadow-inner"
                          placeholder="Initials"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[9px] font-bold text-gray-400 uppercase mb-3 tracking-widest px-1">Prepared Date</label>
                        <input
                          type="date"
                          value={formatDateForInput(att.preparedDate)}
                          onChange={(e) => handleAttachmentChange(att.id, 'preparedDate', e.target.value)}
                          className="text-xs font-bold px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-200 outline-none transition-all text-gray-900 shadow-inner"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[9px] font-bold text-gray-400 uppercase mb-3 tracking-widest px-1">Reviewed By</label>
                        <input
                          value={att.reviewedBy || ''}
                          onChange={(e) => handleAttachmentChange(att.id, 'reviewedBy', e.target.value)}
                          className="text-xs font-bold px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-200 outline-none transition-all text-gray-900 shadow-inner"
                          placeholder="Initials"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[9px] font-bold text-gray-400 uppercase mb-3 tracking-widest px-1">Reviewed Date</label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="date"
                            value={formatDateForInput(att.reviewedDate)}
                            onChange={(e) => handleAttachmentChange(att.id, 'reviewedDate', e.target.value)}
                            className="flex-1 text-xs font-bold px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-200 outline-none transition-all text-gray-900 shadow-inner"
                          />
                          <button
                            onClick={() => handleSaveAttachmentMetadata(att)}
                            disabled={savingAttachmentId === att.id}
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 active:scale-95 border border-blue-500 flex-shrink-0"
                            title="Save"
                          >
                            {savingAttachmentId === att.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex">
              <label className="group/btn relative inline-flex items-center px-8 py-4 border-2 border-dashed border-blue-200 text-[11px] font-bold rounded-2xl text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all duration-300 cursor-pointer active:scale-95 shadow-sm">
                <Paperclip className="w-5 h-5 mr-4" />
                <span className="uppercase tracking-[0.2em]">{uploading ? 'Processing File...' : 'Attach Workpaper'}</span>
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt" />
              </label>
              
              <input 
                type="file" 
                ref={replaceInputRef} 
                className="hidden" 
                onChange={handleReplaceFile} 
                disabled={uploading} 
                accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt" 
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
        .rich-text-wrapper :global(.ql-toolbar.ql-snow) {
          border: 1px solid #f3f4f6;
          border-top-left-radius: 1rem;
          border-top-right-radius: 1rem;
          background-color: #f9fafb;
          padding: 0.75rem;
          border-bottom: none;
          position: sticky;
          top: -2rem; /* Adjusted for parent padding */
          z-index: 10;
        }
        .rich-text-wrapper :global(.ql-container.ql-snow) {
          border: 1px solid #f3f4f6;
          border-bottom-left-radius: 1rem;
          border-bottom-right-radius: 1rem;
          background-color: white;
          min-height: 180px;
          font-family: inherit;
        }
        .rich-text-wrapper :global(.ql-editor) {
          min-height: 180px;
          font-size: 1rem;
          line-height: 1.625;
          padding: 1.5rem 2rem;
          color: #111827;
        }
        .rich-text-wrapper :global(.ql-editor.ql-blank::before) {
          left: 2rem;
          color: #d1d5db;
          font-style: normal;
        }
        .rich-text-wrapper :global(.ql-snow .ql-stroke) {
          stroke: #6b7280;
        }
        .rich-text-wrapper :global(.ql-snow .ql-fill) {
          fill: #6b7280;
        }
        .rich-text-wrapper :global(.ql-snow.ql-toolbar button:hover .ql-stroke),
        .rich-text-wrapper :global(.ql-snow.ql-toolbar button.ql-active .ql-stroke) {
          stroke: #2563eb;
        }
        .rich-text-wrapper :global(.ql-snow.ql-toolbar button:hover .ql-fill),
        .rich-text-wrapper :global(.ql-snow.ql-toolbar button.ql-active .ql-fill) {
          fill: #2563eb;
        }
      `}</style>
    </div>
  );
}
