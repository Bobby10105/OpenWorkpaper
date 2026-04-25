'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Loader2, AlertCircle, CheckCircle, Info, ArrowUp, ArrowDown, FolderPlus } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(async () => {
  const mod = await import('react-quill-new');
  return mod.default || mod;
}, { 
  ssr: false,
  loading: () => <div className="w-full h-20 bg-gray-50 animate-pulse rounded-lg border border-gray-100" />
});

interface TemplateProcedure {
  id?: string;
  phase: string;
  title: string;
  purpose: string | null;
  displayOrder: number;
}

interface TemplateGroup {
  id?: string;
  phase: string;
  title: string;
  displayOrder: number;
  procedures: TemplateProcedure[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  groups: TemplateGroup[];
}

const PHASES = ['Planning', 'Fieldwork', 'Reporting'];

export default function TemplateEditor({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activePhase, setActivePhase] = useState(PHASES[0]);

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setTemplate({
        ...data,
        groups: data.groups || []
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save template');
      }
      setSuccess('Template saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addGroup = () => {
    if (!template) return;
    const newGroup: TemplateGroup = {
      phase: activePhase,
      title: 'New Procedure Group',
      displayOrder: template.groups.length,
      procedures: []
    };
    setTemplate({
      ...template,
      groups: [...template.groups, newGroup]
    });
  };

  const updateGroupTitle = (gIndex: number, title: string) => {
    if (!template) return;
    const updatedGroups = [...template.groups];
    updatedGroups[gIndex] = { ...updatedGroups[gIndex], title };
    setTemplate({ ...template, groups: updatedGroups });
  };

  const removeGroup = (gIndex: number) => {
    if (!template) return;
    if (!confirm('Delete this group and all procedures within it?')) return;
    const updatedGroups = template.groups.filter((_, i) => i !== gIndex);
    setTemplate({ ...template, groups: updatedGroups });
  };

  const addProcedureToGroup = (gIndex: number) => {
    if (!template) return;
    const updatedGroups = [...template.groups];
    const newProc: TemplateProcedure = {
      phase: activePhase,
      title: 'New Procedure',
      purpose: '',
      displayOrder: updatedGroups[gIndex].procedures.length
    };
    updatedGroups[gIndex].procedures.push(newProc);
    setTemplate({ ...template, groups: updatedGroups });
  };

  const updateProcedure = (gIndex: number, pIndex: number, field: keyof TemplateProcedure, value: any) => {
    if (!template) return;
    const updatedGroups = [...template.groups];
    updatedGroups[gIndex].procedures[pIndex] = { 
      ...updatedGroups[gIndex].procedures[pIndex], 
      [field]: value 
    };
    setTemplate({ ...template, groups: updatedGroups });
  };

  const removeProcedure = (gIndex: number, pIndex: number) => {
    if (!template) return;
    const updatedGroups = [...template.groups];
    updatedGroups[gIndex].procedures = updatedGroups[gIndex].procedures.filter((_, i) => i !== pIndex);
    setTemplate({ ...template, groups: updatedGroups });
  };

  const moveGroup = (index: number, direction: 'up' | 'down') => {
    if (!template) return;
    const updatedGroups = [...template.groups];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updatedGroups.length) return;
    
    const temp = updatedGroups[index];
    updatedGroups[index] = updatedGroups[targetIndex];
    updatedGroups[targetIndex] = temp;
    
    setTemplate({ ...template, groups: updatedGroups.map((g, i) => ({ ...g, displayOrder: i })) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    );
  }

  if (!template) return null;

  const phaseGroups = template.groups
    .map((g, originalIndex) => ({ g, originalIndex }))
    .filter(({ g }) => g.phase === activePhase);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{template.name}</h2>
            <div className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Editor</div>
          </div>
          <p className="text-sm text-gray-500 font-medium">{template.description || "Defining standard procedure groups for this program."}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Changes</span>
        </button>
      </div>

      <div className="px-6 border-b border-gray-200 bg-white sticky top-0 z-10">
        <nav className="-mb-px flex space-x-8">
          {PHASES.map((phase) => (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-colors
                ${activePhase === phase ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {phase}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-gray-400">
            <Info className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Structure for {activePhase}</span>
          </div>
          <button
            onClick={addGroup}
            className="flex items-center space-x-1 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 transition-colors text-sm border border-indigo-100"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Group</span>
          </button>
        </div>

        <div className="space-y-10">
          {phaseGroups.map(({ g, originalIndex }, groupIndex) => (
            <div key={groupIndex} className="space-y-4">
              <div className="flex items-center justify-between bg-gray-100/50 p-3 rounded-xl border border-gray-200 group">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="bg-gray-900 text-white text-[10px] font-black w-8 h-6 flex items-center justify-center rounded uppercase tracking-tighter shadow-sm">
                    {activePhase === 'Planning' ? '1' : activePhase === 'Fieldwork' ? '2' : '3'}.{groupIndex + 1}
                  </div>
                  <input 
                    value={g.title}
                    onChange={(e) => updateGroupTitle(originalIndex, e.target.value)}
                    className="flex-1 bg-transparent font-black text-gray-800 uppercase tracking-tight outline-none focus:ring-0 text-sm"
                    placeholder="Group Title (e.g. Payroll)"
                  />
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveGroup(originalIndex, 'up')} className="p-1.5 text-gray-400 hover:text-blue-600"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => moveGroup(originalIndex, 'down')} className="p-1.5 text-gray-400 hover:text-blue-600"><ArrowDown className="w-4 h-4" /></button>
                  <button onClick={() => removeGroup(originalIndex)} className="p-1.5 text-gray-400 hover:text-red-600 ml-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="pl-6 space-y-4 border-l-2 border-gray-100 ml-4">
                {g.procedures.map((p, pIndex) => (
                  <div key={pIndex} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all group/proc">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-50 text-blue-700 text-[10px] font-black px-1.5 py-0.5 rounded mt-1">
                        {groupIndex + 1}.{String.fromCharCode(97 + pIndex)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          value={p.title}
                          onChange={(e) => updateProcedure(originalIndex, pIndex, 'title', e.target.value)}
                          className="w-full font-bold text-gray-900 outline-none border-none p-0 text-sm focus:ring-0"
                          placeholder="Procedure Title..."
                        />
                        <div className="rich-text-template-wrapper">
                          <ReactQuill
                            theme="snow"
                            value={p.purpose || ''}
                            onChange={(content) => updateProcedure(originalIndex, pIndex, 'purpose', content)}
                            modules={quillModules}
                            placeholder="Purpose / Standard instructions..."
                          />
                        </div>
                      </div>
                      <button onClick={() => removeProcedure(originalIndex, pIndex)} className="p-1.5 text-gray-300 hover:text-red-600 opacity-0 group-hover/proc:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addProcedureToGroup(originalIndex)}
                  className="flex items-center space-x-1.5 text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-widest pl-4"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Procedure to Group</span>
                </button>
              </div>
            </div>
          ))}

          {phaseGroups.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-2xl">
              <p className="text-gray-400 font-medium mb-4">No groups defined for {activePhase}.</p>
              <button onClick={addGroup} className="bg-white border border-indigo-200 text-indigo-700 px-6 py-2 rounded-xl font-bold hover:bg-indigo-50 transition-all text-sm shadow-sm">
                + Create First Group
              </button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .rich-text-template-wrapper :global(.ql-toolbar.ql-snow) {
          border: none;
          border-bottom: 1px solid #f3f4f6;
          background-color: #f9fafb;
          padding: 4px;
        }
        .rich-text-template-wrapper :global(.ql-container.ql-snow) {
          border: none;
          font-family: inherit;
        }
        .rich-text-template-wrapper :global(.ql-editor) {
          min-height: 80px;
          font-size: 0.75rem;
          line-height: 1.5;
          padding: 8px 0;
          color: #6b7280;
        }
        .rich-text-template-wrapper :global(.ql-editor.ql-blank::before) {
          left: 0;
          color: #d1d5db;
          font-style: normal;
        }
      `}</style>
    </div>
  );
}
