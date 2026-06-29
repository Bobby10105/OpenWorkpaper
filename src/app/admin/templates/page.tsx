'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Trash2, Edit, Loader2, AlertCircle, FileText, ChevronRight, ShieldAlert, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import TemplateEditor from '@/components/TemplateEditor';

interface Template {
  id: string;
  name: string;
  description: string | null;
  _count: { procedures: number };
  createdAt: string;
}

export default function TemplateManagementPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string, role: string } | null>(null);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const fetchSessionAndTemplates = useCallback(async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setUser(sessionData.user);

        if (sessionData.user.role !== 'Business Operations') {
          setLoading(false);
          return;
        }
      } else {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/admin/templates');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Server responded with ${res.status}`);
      }
      const data = await res.json();
      setTemplates(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSessionAndTemplates();
  }, [fetchSessionAndTemplates]);

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create template');
      
      setTemplates([...templates, { ...data, _count: { procedures: 0 } }]);
      setIsAdding(false);
      setFormData({ name: '', description: '' });
      setEditingTemplateId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"? This will also delete all procedures within it.`)) return;
    
    try {
      const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete template');
      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user && user.role !== 'Business Operations') {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4">
        <div className="bg-white/80 backdrop-blur-3xl border border-slate-200 rounded-[3rem] p-16 text-center shadow-2xl">
          <ShieldAlert className="w-20 h-20 text-orange-500 mx-auto mb-8 shadow-lg shadow-orange-100" />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4 uppercase">Access Restricted</h1>
          <p className="text-slate-500 mb-10 font-medium leading-relaxed">System architecture protocols only allow Business Operations to manage the standardized audit library.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-all shadow-xl active:scale-95 border border-blue-400/20"
          >
            Exit to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (editingTemplateId) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <button 
          onClick={() => {
            setEditingTemplateId(null);
            fetchSessionAndTemplates();
          }}
          className="mb-8 inline-flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <div className="bg-slate-100 p-1 rounded-lg group-hover:bg-slate-200 transition-all">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </div>
          <span className="font-bold text-sm tracking-tight">Return to Program Library</span>
        </button>
        <TemplateEditor templateId={editingTemplateId} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-none flex items-center">
            <BookOpen className="w-8 h-8 mr-4 text-blue-600 shadow-lg shadow-blue-100" />
            Program Library
          </h1>
          <p className="text-slate-500 font-medium">Standardized procedures for global consistency across engagements.</p>
        </div>
        
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 font-bold text-sm active:scale-95 border border-blue-400/20"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancel' : 'New Program'}</span>
        </button>
      </div>

      {error && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-4 text-red-600">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {isAdding && (
        <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 p-8 shadow-2xl animate-in fade-in slide-in-from-top-6 duration-500">
          <form onSubmit={handleAddTemplate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Program Label</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-slate-900 font-semibold outline-none shadow-inner"
                  placeholder="e.g. Financial Control Framework"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Definition (Optional)</label>
                <input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-slate-900 font-semibold outline-none shadow-inner"
                  placeholder="Primary usage and scoping details"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                disabled={submitting}
                type="submit"
                className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 font-bold transition-all shadow-xl active:scale-95 border border-blue-400/20"
              >
                {submitting ? 'Initializing...' : 'Construct Program Map'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div key={template.id} className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 overflow-hidden flex flex-col hover:shadow-blue-500/5 hover:border-blue-300 transition-all duration-500 group">
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{template.name}</h3>
                <div className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-widest shadow-sm">
                  {template._count.procedures} Steps
                </div>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 mb-6 h-10 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                {template.description || "System protocol for standardized execution."}
              </p>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center">
                <FileText className="w-3 h-3 mr-2 text-slate-400" />
                Auth: {new Date(template.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-between items-center group-hover:bg-slate-100 transition-colors">
              <button
                onClick={() => setEditingTemplateId(template.id)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Optimize Program</span>
              </button>
              <button
                onClick={() => handleDeleteTemplate(template.id, template.name)}
                className="p-2 text-slate-400 hover:text-red-600 transition-all active:scale-90 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        
        {templates.length === 0 && !isAdding && (
          <div className="col-span-full py-24 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-300 backdrop-blur-sm">
            <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200 shadow-inner">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-bold uppercase tracking-widest text-lg mb-3">Library Depleted</h3>
            <p className="text-slate-500 text-sm mb-10 max-w-sm mx-auto leading-relaxed">Establish reusable program frameworks to standardize high-performance audit execution.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center space-x-2 px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-all shadow-xl active:scale-95 border border-blue-400/20"
            >
              <Plus className="w-5 h-5" />
              <span>Initialize Master Program</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
