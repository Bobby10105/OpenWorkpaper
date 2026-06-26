'use client';

import { useState, useMemo } from 'react';
import { Plus, BookOpen, Trash2, FolderPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProcedureItem from './ProcedureItem';
import ApplyTemplateModal from './ApplyTemplateModal';
import type { AuditWithRelations } from '@/lib/types';

const PHASE_MAP: Record<string, number> = {
  'Planning': 1,
  'Fieldwork': 2,
  'Reporting': 3
};

// Helper to convert number to letter (1 -> a, 2 -> b...)
const getLetter = (index: number) => String.fromCharCode(97 + index);

export default function ProcedureList({ 
  auditId, 
  phase, 
  audit,
  user
}: { 
  auditId: string, 
  phase: string, 
  audit: AuditWithRelations,
  user?: { username: string; role: string; id: string }
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');

  // Use useMemo to calculate groups/procedures immediately during render
  // instead of waiting for a useEffect. This fixes the 'flicker' glitch.
  const { groups, ungroupedProcedures } = useMemo(() => {
    const phaseGroups = audit.procedureGroups
      .filter(g => g.phase === phase)
      .map(group => ({
        ...group,
        procedures: [...group.procedures].sort((a, b) => {
          if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
            return (a.displayOrder || 0) - (b.displayOrder || 0);
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        })
      }));

    const phaseUngrouped = audit.procedures
      .filter(p => p.phase === phase && !p.groupId)
      .sort((a, b) => {
        if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
          return (a.displayOrder || 0) - (b.displayOrder || 0);
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    return { groups: phaseGroups, ungroupedProcedures: phaseUngrouped };
  }, [audit, phase]);

  const phaseNum = PHASE_MAP[phase] || 0;

  const handleAddGroup = async () => {
    if (!newGroupTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/procedure-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          phase,
          title: newGroupTitle
        }),
      });
      if (res.ok) {
        setNewGroupTitle('');
        setIsAddingGroup(false);
        router.refresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to create group: ${errData.details || errData.error || res.statusText}`);
      }
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert(`Network error creating group: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the group "${title}"? This will also delete all procedures within it.`)) return;
    try {
      const res = await fetch(`/api/procedure-groups/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddProcedure = async (groupId?: string) => {
    console.log('[ProcedureList] handleAddProcedure called. auditId:', auditId, 'phase:', phase);
    setCreating(true);
    try {
      const payload = {
        auditId,
        groupId: groupId || null,
        phase,
        title: 'New Procedure',
        purpose: '',
      };

      const res = await fetch('/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[ProcedureList] HTTP Status:', res.status, res.statusText);
      
      const rawText = await res.text();
      console.log('[ProcedureList] Server Response Body:', rawText);

      if (res.ok) {
        try {
          const data = JSON.parse(rawText);
          console.log('[ProcedureList] SUCCESS:', data);
          router.refresh();
        } catch {
          console.warn('[ProcedureList] SUCCESS but could not parse response JSON');
          router.refresh();
        }
      } else {
        alert(`Error (Status ${res.status}): ${rawText || res.statusText}`);
      }
    } catch (e) {
      console.error('[ProcedureList] Critical Fetch Error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert(`Network error: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProcedure = async (id: string) => {
    try {
      const res = await fetch(`/api/procedures/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Are you sure you want to delete ALL procedure groups and procedures in the ${phase} phase? This cannot be undone.`)) return;
    
    setCreating(true);
    try {
      // Delete groups (cascade will delete procedures) and ungrouped procedures in parallel
      const deletePromises = [
        ...groups.map(group => fetch(`/api/procedure-groups/${group.id}`, { method: 'DELETE' })),
        ...ungroupedProcedures.map(proc => fetch(`/api/procedures/${proc.id}`, { method: 'DELETE' }))
      ];
      await Promise.all(deletePromises);
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-50 text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-100 transition-all border border-blue-200 active:scale-95 shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Import Program</span>
          </button>
          <button
            onClick={() => setIsAddingGroup(true)}
            disabled={creating}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gray-50 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all border border-gray-200 active:scale-95 shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Add Procedure Group</span>
          </button>
        </div>

        {(groups.length > 0 || ungroupedProcedures.length > 0) && user?.role === 'Business Operations' && (
          <button
            onClick={handleClearAll}
            disabled={creating}
            className="flex items-center space-x-2 px-4 py-2 text-red-500 hover:text-red-600 text-xs font-bold uppercase tracking-wider transition-all hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Phase</span>
          </button>
        )}
      </div>

      {isAddingGroup && (
        <div className="bg-white border border-blue-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-xl">
          <div className="bg-blue-50 p-3 rounded-2xl">
            <FolderPlus className="w-6 h-6 text-blue-600" />
          </div>
          <input 
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
            placeholder="Group Title (e.g. Payroll, Revenue...)"
            className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
          />
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button 
              onClick={handleAddGroup}
              disabled={creating || !newGroupTitle.trim()}
              className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
            >
              Create Group
            </button>
            <button 
              onClick={() => setIsAddingGroup(false)}
              className="px-6 py-3 text-gray-500 text-sm font-bold hover:text-gray-700 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 && ungroupedProcedures.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[3rem] border border-gray-100 shadow-xl">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-inner">
            <BookOpen className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-gray-900 font-bold uppercase tracking-widest text-lg mb-3">Empty Program</h3>
          <p className="text-gray-500 text-sm mb-10 max-w-sm mx-auto leading-relaxed">Import a standard audit program or build your own by adding groups and procedures.</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center space-x-2 px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl active:scale-95 uppercase tracking-wider text-sm border border-blue-500"
            >
              <BookOpen className="w-5 h-5" />
              <span>Import Program</span>
            </button>
            <button
              onClick={() => setIsAddingGroup(true)}
              className="flex items-center space-x-2 px-10 py-4 bg-gray-50 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 transition-all border border-gray-200 shadow-lg active:scale-95 text-sm uppercase tracking-wider"
            >
              <FolderPlus className="w-5 h-5" />
              <span>Add Group</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {groups.map((group, groupIndex) => {
            const groupNomenclature = `${phaseNum}.${groupIndex + 1}`;
            
            return (
              <div key={group.id} className="space-y-6">
                <div className="flex items-center justify-between group/row px-6 py-4 bg-white rounded-3xl border border-gray-100 shadow-xl">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-900 text-white text-[11px] font-bold w-12 h-9 flex items-center justify-center rounded-xl shadow-lg border border-blue-800">
                      {groupNomenclature}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center">
                      {group.title}
                    </h3>
                  </div>
                  <button 
                    onClick={() => handleDeleteGroup(group.id, group.title)}
                    className="p-2.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all hover:bg-red-50 rounded-xl"
                    title="Delete Group"
                    aria-label="Delete Group"
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-5 pl-6 border-l border-gray-100">
                  {group.procedures.map((proc, procIndex) => (
                    <ProcedureItem
                      key={proc.id}
                      procedure={proc}
                      nomenclature={`${groupNomenclature}.${getLetter(procIndex)}`}
                      onDelete={() => handleDeleteProcedure(proc.id)}
                      auditId={auditId}
                    />

                  ))}
                  
                  <button
                    onClick={() => handleAddProcedure(group.id)}
                    disabled={creating}
                    className="flex items-center space-x-3 px-6 py-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all text-sm font-bold ml-6 border border-transparent hover:border-blue-100"
                  >
                    <div className="bg-gray-100 p-1 rounded-lg">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span>Add Procedure ({groupNomenclature}.{getLetter(group.procedures.length)})</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Ungrouped Procedures Section (if any exist) */}
          {ungroupedProcedures.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4 px-6 py-4 bg-white rounded-3xl border border-gray-100 shadow-xl">
                <div className="bg-gray-700 text-white text-[11px] font-bold w-12 h-9 flex items-center justify-center rounded-xl shadow-lg border border-gray-600">
                  {phaseNum}.?
                </div>
                <h3 className="text-xl font-bold text-gray-700 tracking-tight">Ungrouped Items</h3>
              </div>
              <div className="space-y-5 pl-6 border-l border-gray-100">
                {ungroupedProcedures.map((proc, index) => (
                  <ProcedureItem 
                    key={proc.id} 
                    procedure={proc} 
                    nomenclature={`${phaseNum}.?.${index + 1}`}
                    onDelete={() => handleDeleteProcedure(proc.id)} 
                    auditId={auditId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showTemplateModal && (
        <ApplyTemplateModal
          auditId={auditId}
          phase={phase}
          onClose={() => setShowTemplateModal(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
