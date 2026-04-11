'use client';

import { useState, useEffect } from 'react';
import { Plus, BookOpen, Trash2, Loader2, FolderPlus, ChevronRight, ChevronDown, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProcedureItem from './ProcedureItem';
import ApplyTemplateModal from './ApplyTemplateModal';
import type { AuditWithRelations, ProcedureGroupWithRelations, ProcedureWithRelations } from '@/lib/types';

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
  const [groups, setGroups] = useState<ProcedureGroupWithRelations[]>([]);
  const [ungroupedProcedures, setUngroupedProcedures] = useState<ProcedureWithRelations[]>([]);
  const [creating, setCreating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Filter groups and procedures for this specific phase
    const phaseGroups = audit.procedureGroups.filter(g => g.phase === phase);
    const phaseUngrouped = audit.procedures.filter(p => p.phase === phase && !p.groupId);
    
    setGroups(phaseGroups);
    setUngroupedProcedures(phaseUngrouped);
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
    } catch (e: any) {
      console.error(e);
      alert(`Network error creating group: ${e.message}`);
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
    setCreating(true);
    try {
      const res = await fetch('/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          groupId,
          phase,
          title: 'New Procedure',
          purpose: '',
        }),
      });
      if (res.ok) {
        router.refresh();
      }
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
      // Delete groups (cascade will delete procedures)
      for (const group of groups) {
        await fetch(`/api/procedure-groups/${group.id}`, { method: 'DELETE' });
      }
      // Delete ungrouped procedures
      for (const proc of ungroupedProcedures) {
        await fetch(`/api/procedures/${proc.id}`, { method: 'DELETE' });
      }
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Action Header */}
      <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Import Template</span>
          </button>
          <button
            onClick={() => setIsAddingGroup(true)}
            disabled={creating}
            className="flex items-center space-x-2 px-4 py-2 bg-white text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-100 shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Procedure Group</span>
          </button>
        </div>

        {(groups.length > 0 || ungroupedProcedures.length > 0) && user?.role === 'Business Operations' && (
          <button
            onClick={handleClearAll}
            disabled={creating}
            className="flex items-center space-x-2 px-3 py-2 text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Phase</span>
          </button>
        )}
      </div>

      {isAddingGroup && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
          <FolderPlus className="w-5 h-5 text-indigo-600" />
          <input 
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
            placeholder="Group Title (e.g. Payroll, Revenue...)"
            className="flex-1 bg-white border border-indigo-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
          />
          <button 
            onClick={handleAddGroup}
            disabled={creating || !newGroupTitle.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Create Group
          </button>
          <button 
            onClick={() => setIsAddingGroup(false)}
            className="px-4 py-2 text-gray-500 text-sm font-bold hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {groups.length === 0 && ungroupedProcedures.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-900 font-black uppercase tracking-tight text-lg mb-2">No Procedures Defined</h3>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">Import a standard program or create a new procedure group to begin.</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 uppercase tracking-wider text-sm"
            >
              <BookOpen className="w-5 h-5" />
              <span>Import Template</span>
            </button>
            <button
              onClick={() => setIsAddingGroup(true)}
              className="flex items-center space-x-2 px-8 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-all border border-indigo-200 shadow-sm active:scale-95 text-sm"
            >
              <FolderPlus className="w-5 h-5" />
              <span>Create Group</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group, groupIndex) => {
            const groupNomenclature = `${phaseNum}.${groupIndex + 1}`;
            
            return (
              <div key={group.id} className="space-y-4">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-900 text-white text-xs font-black w-10 h-8 flex items-center justify-center rounded-lg shadow-sm">
                      {groupNomenclature}
                    </div>
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight flex items-center">
                      {group.title}
                    </h3>
                  </div>
                  <button 
                    onClick={() => handleDeleteGroup(group.id, group.title)}
                    className="p-2 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete Group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 pl-4 border-l-2 border-indigo-50">
                  {group.procedures.map((proc, procIndex) => (
                    <ProcedureItem 
                      key={proc.id} 
                      procedure={proc} 
                      nomenclature={`${groupNomenclature}.${getLetter(procIndex)}`}
                      onDelete={() => handleDeleteProcedure(proc.id)} 
                      user={user}
                    />
                  ))}
                  
                  <button
                    onClick={() => handleAddProcedure(group.id)}
                    disabled={creating}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-indigo-600 transition-colors text-sm font-bold ml-6"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Procedure to {group.title} ({groupNomenclature}.{getLetter(group.procedures.length)})</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Ungrouped Procedures Section (if any exist) */}
          {ungroupedProcedures.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-400 text-white text-xs font-black w-10 h-8 flex items-center justify-center rounded-lg shadow-sm">
                  {phaseNum}.?
                </div>
                <h3 className="text-lg font-black text-gray-400 uppercase tracking-tight">Ungrouped Items</h3>
              </div>
              <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                {ungroupedProcedures.map((proc, index) => (
                  <ProcedureItem 
                    key={proc.id} 
                    procedure={proc} 
                    nomenclature={`${phaseNum}.?.${index + 1}`}
                    onDelete={() => handleDeleteProcedure(proc.id)} 
                    user={user}
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
