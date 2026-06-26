'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Loader2, AlertCircle, FolderPlus, ArrowUp, ArrowDown, Info } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import RichTextEditor from './RichTextEditor';

interface Template {
  id: string;
  name: string;
  description: string | null;
  groups: TemplateGroup[];
}

interface TemplateGroup {
  id: string;
  title: string;
  phase: string;
  displayOrder: number;
  procedures: TemplateProcedure[];
}

interface TemplateProcedure {
  id: string;
  title: string;
  purpose: string | null;
  phase: string;
  displayOrder: number;
}

export default function TemplateEditor({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGroup, setActivePhase] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/admin/templates/${templateId}`);
        if (!res.ok) throw new Error('Failed to fetch template');
        const data = await res.json();
        setTemplate(data);
        if (data.groups && data.groups.length > 0) {
          setActivePhase(data.groups[0].id);
        }
      } catch (err: unknown) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);


  const handleSave = async () => {
    if (!template) return;
    setSaving(true);

    const groups = template.groups || [];
    // Capture the current group title before saving to try and re-select it after ID change
    const currentGroupTitle = groups.find(g => g.id === activeGroup)?.title;

    // Deep clone and sanitize before saving
    const sanitizedTemplate = structuredClone(template);
    (sanitizedTemplate.groups || []).forEach((group: TemplateGroup) => {
      (group.procedures || []).forEach((proc: TemplateProcedure) => {
        if (proc.purpose) {
          proc.purpose = DOMPurify.sanitize(proc.purpose);
        }
      });
    });

    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedTemplate),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || 'Failed to save template');
      }
      const updated: Template = await res.json();
      
      // Update template state with new data (contains permanent IDs)
      setTemplate(updated);

      // Try to re-select the active group using the title, or fallback to the first group
      if (updated.groups && updated.groups.length > 0) {
        const matchingGroup = updated.groups.find((g: TemplateGroup) => g.title === currentGroupTitle);
        if (matchingGroup) {
          setActivePhase(matchingGroup.id);
        } else {
          setActivePhase(updated.groups[0].id);
        }
      }

      alert('Template saved successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      alert(`Save failed: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const addGroup = (phase: string = 'Fieldwork') => {
    if (!template) return;
    const newGroup: TemplateGroup = {
      id: `new-${Date.now()}`,
      title: 'New Group',
      phase,
      displayOrder: (template.groups || []).length,
      procedures: [],
    };
    setTemplate({ ...template, groups: [...(template.groups || []), newGroup] });
    setActivePhase(newGroup.id);
  };

  const addProcedure = (group: TemplateGroup) => {
    if (!template) return;
    const newProc: TemplateProcedure = {
      id: `new-proc-${Date.now()}`,
      title: 'New Procedure',
      purpose: '',
      phase: group.phase,
      displayOrder: (group.procedures || []).length,
    };

    const newGroups = (template.groups || []).map(g => {
      if (g.id === group.id) {
        return { ...g, procedures: [...(g.procedures || []), newProc] };
      }
      return g;
    });
    setTemplate({ ...template, groups: newGroups });
  };

  const updateProcedure = (groupId: string, procId: string, field: string, value: string) => {
    if (!template) return;
    const newGroups = (template.groups || []).map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          procedures: (g.procedures || []).map(p => p.id === procId ? { ...p, [field]: value } : p)
        };
      }
      return g;
    });
    setTemplate({ ...template, groups: newGroups });
  };

  const deleteProcedure = (groupId: string, procId: string) => {
    if (!template || !confirm('Delete this procedure template?')) return;
    const newGroups = (template.groups || []).map(g => {
      if (g.id === groupId) {
        return { ...g, procedures: (g.procedures || []).filter(p => p.id !== procId) };
      }
      return g;
    });
    setTemplate({ ...template, groups: newGroups });
  };

  const deleteGroup = (groupId: string) => {
    if (!template || !confirm('Delete this group and all its procedures?')) return;
    const newGroups = (template.groups || []).filter(g => g.id !== groupId);
    setTemplate({ ...template, groups: newGroups });
    if (activeGroup === groupId) {
      setActivePhase(newGroups.length > 0 ? newGroups[0].id : null);
    }
  };

  const moveGroup = (index: number, direction: 'up' | 'down') => {
    if (!template || !template.groups) return;
    const newGroups = [...template.groups];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newGroups.length) return;
    [newGroups[index], newGroups[newIndex]] = [newGroups[newIndex], newGroups[index]];
    // Re-assign orders
    const orderedGroups = newGroups.map((g, i) => ({ ...g, displayOrder: i }));
    setTemplate({ ...template, groups: orderedGroups });
  };

  const moveProcedure = (groupId: string, index: number, direction: 'up' | 'down') => {
    if (!template) return;
    const newGroups = (template.groups || []).map(g => {
      if (g.id === groupId) {
        const newProcs = [...(g.procedures || [])];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newProcs.length) return g;
        [newProcs[index], newProcs[newIndex]] = [newProcs[newIndex], newProcs[index]];
        return { ...g, procedures: newProcs.map((p, i) => ({ ...p, displayOrder: i })) };
      }
      return g;
    });
    setTemplate({ ...template, groups: newGroups });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-gray-500 font-medium">Loading template editor...</p>
    </div>
  );

  if (!template) return (
    <div className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <p className="text-red-800 font-bold">Template not found</p>
    </div>
  );

  const groups = template.groups || [];
  const currentGroup = groups.find(g => g.id === activeGroup);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 min-w-0">
          <input
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            className="text-2xl font-black text-gray-900 border-none focus:ring-0 p-0 w-full mb-1 placeholder:text-gray-300"
            placeholder="Template Name"
          />
          <input
            value={template.description || ''}
            onChange={(e) => setTemplate({ ...template, description: e.target.value })}
            className="text-sm text-gray-500 border-none focus:ring-0 p-0 w-full placeholder:text-gray-400"
            placeholder="Optional description of this audit program template..."
          />
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-8 py-4 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-100 disabled:opacity-50 uppercase tracking-widest"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{saving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Phases/Groups */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-lg space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Program Phases</h3>
            </div>
            
            <div className="space-y-6">
              {['Planning', 'Fieldwork', 'Reporting'].map((phaseName) => {
                const phaseGroups = groups.filter(g => g.phase === phaseName);
                return (
                  <div key={phaseName} className="space-y-2">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{phaseName}</h4>
                      <button 
                        onClick={() => addGroup(phaseName)} 
                        className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                        title={`Add group to ${phaseName}`}
                        aria-label={`Add group to ${phaseName}`}
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {phaseGroups.length === 0 ? (
                        <p className="px-4 py-2 text-[10px] text-gray-400 italic font-medium">No groups mapped</p>
                      ) : (
                        phaseGroups.map((group) => {
                          const index = groups.findIndex(g => g.id === group.id);
                          const isActive = activeGroup === group.id;
                          return (
                            <div key={group.id} className="space-y-1">
                              <div className="group relative">
                                <button
                                  onClick={() => setActivePhase(group.id)}
                                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${
                                    isActive 
                                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 translate-x-1' 
                                      : 'text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  <span className="truncate pr-8">{group.title}</span>
                                  <span className="text-[10px] opacity-60 font-black">{(group.procedures || []).length}</span>
                                </button>
                                <div className={`absolute right-10 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                  <button onClick={(e) => { e.stopPropagation(); moveGroup(index, 'up'); }} className="p-1 hover:scale-125 transition-transform" disabled={index === 0} title="Move phase up" aria-label="Move phase up">
                                    <ArrowUp className="w-3 h-3" aria-hidden="true" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); moveGroup(index, 'down'); }} className="p-1 hover:scale-125 transition-transform" disabled={index === groups.length - 1} title="Move phase down" aria-label="Move phase down">
                                    <ArrowDown className="w-3 h-3" aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                              {isActive && (group.procedures || []).length > 0 && (
                                <div className="ml-4 border-l-2 border-blue-100 pl-3 space-y-1 py-1 animate-in slide-in-from-left-2 duration-200">
                                  {(group.procedures || []).map((p) => (
                                    <div key={p.id} className="text-[10px] text-gray-500 font-medium truncate py-0.5 flex items-center">
                                      <span className="w-1 h-1 bg-gray-300 rounded-full mr-2 shrink-0" />
                                      {p.title || 'Untitled Procedure'}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-start space-x-4">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed font-medium">
              Templates define the default structure for new audits. Standardized procedures only require a &quot;Purpose&quot; definition to maintain engagement speed.
            </p>
          </div>
        </div>

        {/* Main: Procedures in Active Group */}
        <div className="lg:col-span-3 space-y-6">
          {currentGroup ? (
            <>
              <div className="flex flex-col space-y-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1 max-w-md">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Group Title</label>
                    <input
                      value={currentGroup.title}
                      onChange={(e) => {
                        const newGroups = groups.map(g => g.id === currentGroup.id ? { ...g, title: e.target.value } : g);
                        setTemplate(template ? { ...template, groups: newGroups } : null);
                      }}
                      className="text-lg font-bold text-gray-900 border-none focus:ring-0 p-0 bg-transparent w-full placeholder:text-gray-300"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => deleteGroup(currentGroup.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Phase"
                      aria-label="Delete Phase"
                    >
                      <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <div className="w-px h-6 bg-gray-100 mx-2" />
                    <button
                      onClick={() => addProcedure(currentGroup)}
                      className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest shadow-lg shadow-emerald-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Procedure</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 pt-2 border-t border-gray-50">
                  <div className="flex-1 max-w-[200px]">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Phase Mapping</label>
                    <select
                      value={currentGroup.phase}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newGroups = groups.map(g => {
                          if (g.id === currentGroup.id) {
                            return { 
                              ...g, 
                              phase: val,
                              procedures: (g.procedures || []).map(p => ({ ...p, phase: val }))
                            };
                          }
                          return g;
                        });
                        setTemplate(template ? { ...template, groups: newGroups } : null);
                      }}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-[10px] font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="Planning">Planning</option>
                      <option value="Fieldwork">Fieldwork</option>
                      <option value="Reporting">Reporting</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {(currentGroup.procedures || []).length === 0 && (
                  <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 text-gray-400">
                    <Plus className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-sm opacity-40">No procedures in this phase</p>
                  </div>
                )}
                {(currentGroup.procedures || []).map((proc, index) => (
                  <div key={proc.id} className="bg-white rounded-[2.5rem] border border-gray-200 shadow-lg overflow-hidden group/proc transition-all hover:border-blue-200">
                    <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                      <div className="flex items-center space-x-4 flex-1">
                        <span className="text-[10px] font-black text-gray-400 bg-white px-2.5 py-1 rounded-lg border border-gray-100 shadow-sm">{index + 1}</span>
                        <input
                          value={proc.title}
                          onChange={(e) => updateProcedure(currentGroup.id, proc.id, 'title', e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 p-0 w-full placeholder:text-gray-300"
                          placeholder="Procedure Title"
                        />
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover/proc:opacity-100 transition-opacity">
                        <button onClick={() => moveProcedure(currentGroup.id, index, 'up')} className="p-2 text-gray-400 hover:text-blue-600" disabled={index === 0} title="Move procedure up" aria-label="Move procedure up">
                          <ArrowUp className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button onClick={() => moveProcedure(currentGroup.id, index, 'down')} className="p-2 text-gray-400 hover:text-blue-600" disabled={index === (currentGroup.procedures || []).length - 1} title="Move procedure down" aria-label="Move procedure down">
                          <ArrowDown className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-1" />
                        <button onClick={() => deleteProcedure(currentGroup.id, proc.id)} className="p-2 text-gray-400 hover:text-red-600" title="Delete procedure" aria-label="Delete procedure">
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="p-8 space-y-4">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Procedure Purpose Template</label>
                        <RichTextEditor
                          value={proc.purpose || ''}
                          onChange={(val) => updateProcedure(currentGroup.id, proc.id, 'purpose', val)}
                          placeholder="Describe the objective and high-level steps for this procedure..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white p-20 rounded-[3rem] border border-gray-100 text-center shadow-sm">
              <FolderPlus className="w-16 h-16 text-gray-200 mx-auto mb-6" />
              <p className="text-gray-500 font-bold mb-6">Select a phase from the sidebar or create a new one to begin adding procedures.</p>
              <button onClick={() => addGroup()} className="inline-flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-700 transition-all uppercase tracking-widest shadow-xl shadow-blue-100">
                <Plus className="w-4 h-4" />
                <span>Create First Phase</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
