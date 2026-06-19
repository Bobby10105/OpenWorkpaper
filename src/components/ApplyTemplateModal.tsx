'use client';

import { useState, useEffect } from 'react';
import { BookOpen, X, CheckCircle, Loader2, AlertCircle, Search, ChevronRight } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string | null;
  _count: { procedures: number };
}

export default function ApplyTemplateModal({ 
  auditId, 
  phase, 
  onClose,
  onSuccess 
}: { 
  auditId: string;
  phase: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/admin/templates');
        if (!res.ok) throw new Error('Failed to load template library');
        const data = await res.json();
        setTemplates(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleApply = async () => {
    if (!selectedTemplateId) return;
    
    setApplying(true);
    setError('');
    try {
      const res = await fetch(`/api/audits/${auditId}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templateId: selectedTemplateId,
          phase: phase 
        }),
      });
      
      if (!res.ok) throw new Error('Failed to apply template');
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Apply Template</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Importing standard procedures for {phase}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close modal" title="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center space-x-2 text-red-600 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search template library..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Accessing Library...</p>
              </div>
            ) : filteredTemplates.length > 0 ? (
              filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                    selectedTemplateId === t.id 
                      ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-50' 
                      : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-bold text-gray-900">{t.name}</span>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">{t._count.procedures} procedures</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{t.description || 'No description available.'}</p>
                  </div>
                  <div className={`p-2 rounded-full transition-colors ${selectedTemplateId === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-300 group-hover:bg-blue-100 group-hover:text-blue-400'}`}>
                    {selectedTemplateId === t.id ? <CheckCircle className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </button>
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-gray-400 italic">No matching templates found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedTemplateId || applying}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
          >
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            <span>{applying ? 'Importing...' : 'Apply to Audit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
