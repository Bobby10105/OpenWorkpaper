'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Edit2, X, Tag, Hash, CheckCircle } from 'lucide-react';
import StatusToggleButton from './StatusToggleButton';
import DeleteAuditButton from './DeleteAuditButton';
import ExportAuditButton from './ExportAuditButton';
import BackupAuditButton from './BackupAuditButton';
import type { AuditWithRelations } from '@/lib/types';

export default function EditableAuditHeader({ 
  audit, 
  userRole 
}: { 
  audit: AuditWithRelations, 
  userRole?: string 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(audit.title);
  const [category, setCategory] = useState(audit.category || '');
  const [auditNumber, setAuditNumber] = useState(audit.auditNumber || '');
  const [objective, setObjective] = useState(audit.objective || '');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          category,
          auditNumber,
          objective 
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        const errorData = await res.json();
        console.error('Failed to update audit:', errorData);
        alert('Failed to save changes. Please try again.');
      }
    } catch (error) {
      console.error('Error updating audit:', error);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white/95 backdrop-blur-3xl rounded-3xl shadow-2xl border border-slate-200 p-8 mb-10">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Audit Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-2xl font-bold text-slate-900 transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-900 placeholder:text-slate-400"
                placeholder="e.g. Financial"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Audit Number</label>
              <input
                value={auditNumber}
                onChange={(e) => setAuditNumber(e.target.value)}
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-900 placeholder:text-slate-400"
                placeholder="e.g. AUD-2024-001"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Audit Objective</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={4}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium leading-relaxed placeholder:text-slate-400"
              placeholder="Define the primary objective of this audit..."
            />
          </div>
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 flex items-center space-x-2 font-semibold text-sm transition-all"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xl shadow-blue-600/20 flex items-center space-x-2 disabled:opacity-50 font-bold text-sm tracking-tight active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] shadow-xl border border-slate-200 p-10 mb-10 group relative overflow-hidden">
      {/* Status Accent Bar */}
      <div className={`absolute top-0 left-0 w-full h-1.5 transition-opacity duration-500 ${audit.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-600 opacity-60 group-hover:opacity-100'}`} />
      
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-4">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-tight">{audit.title}</h1>
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-90 shadow-sm border border-slate-200"
              title="Edit Audit Details"
              aria-label="Edit Audit Details"
            >
              <Edit2 className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mb-8">
            {audit.category && (
              <div className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-200 text-[10px] font-bold tracking-tight uppercase">
                <Tag className="w-3.5 h-3.5" />
                <span>{audit.category}</span>
              </div>
            )}
            {audit.auditNumber && (
              <div className="flex items-center space-x-1.5 px-4 py-1.5 bg-slate-50 text-slate-600 rounded-full border border-slate-200 text-[10px] font-bold tracking-tight uppercase">
                <Hash className="w-3.5 h-3.5" />
                <span>{audit.auditNumber}</span>
              </div>
            )}
            <div className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-tight uppercase border ${
              audit.status === 'Completed' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                : 'bg-indigo-50 text-indigo-600 border-indigo-200'
            }`}>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{audit.status}</span>
            </div>
          </div>

          <div>
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3 leading-none">Primary Engagement Objective</h2>
            <p className="text-slate-700 max-w-4xl whitespace-pre-wrap leading-relaxed font-medium text-base">
              {audit.objective || <span className="italic text-slate-400 font-normal">No objective defined yet. Click the edit icon to define the audit scope.</span>}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-6 min-w-fit">
          <div className="flex items-center space-x-3">
            <ExportAuditButton audit={audit} />
            <BackupAuditButton auditId={audit.id} auditTitle={audit.title} />
          </div>
          <div className="w-full h-px bg-slate-100" />
          <div className="flex items-center space-x-4">
            <StatusToggleButton auditId={audit.id} currentStatus={audit.status} />
            <DeleteAuditButton auditId={audit.id} userRole={userRole} />
          </div>
        </div>
      </div>
    </div>
  );
}
