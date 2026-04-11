'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchSessionAndTemplates();
  }, []);

  const fetchSessionAndTemplates = async () => {
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
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    );
  }

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
      // Automatically open the editor for the new template
      setEditingTemplateId(data.id);
    } catch (err: any) {
      setError(err.message);
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
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (user && user.role !== 'Business Operations') {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 shadow-sm">
          <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-8 font-medium">Only Business Operations can manage the Audit Program Template Library.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (editingTemplateId) {
    return (
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => {
            setEditingTemplateId(null);
            fetchSessionAndTemplates();
          }}
          className="mb-6 flex items-center text-sm font-bold text-blue-600 hover:underline"
        >
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
          Back to Template Library
        </button>
        <TemplateEditor templateId={editingTemplateId} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-900 p-2 rounded-lg shadow-md">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Templates</h1>
            <p className="text-sm text-gray-500 font-medium">Manage standard audit programs and procedures</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancel' : 'New Template'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isAdding && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-blue-100 animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleAddTemplate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Template Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white"
                  placeholder="e.g. Standard Financial Audit"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Description (Optional)</label>
                <input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white"
                  placeholder="e.g. For general purpose financial statement audits"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                disabled={submitting}
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold transition-colors"
              >
                {submitting ? 'Creating...' : 'Create & Define Procedures'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900 line-clamp-1">{template.name}</h3>
                <div className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                  {template._count.procedures} steps
                </div>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                {template.description || "No description provided."}
              </p>
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                Created: {new Date(template.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => setEditingTemplateId(template.id)}
                className="flex items-center space-x-1.5 text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-wider"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Program</span>
              </button>
              <button
                onClick={() => handleDeleteTemplate(template.id, template.name)}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        
        {templates.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
            <div className="bg-gray-200 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-gray-900 font-bold">No templates yet</h3>
            <p className="text-gray-500 text-sm mb-6">Standardize your audits by creating reusable programs.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center space-x-2 text-blue-600 font-bold hover:underline"
            >
              <Plus className="w-4 h-4" />
              <span>Create your first template</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
