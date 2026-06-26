import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AuditWithRelations } from '@/lib/types';

const PHASE_MAP: Record<string, number> = {
  'Planning': 1,
  'Fieldwork': 2,
  'Reporting': 3
};

export function useProcedureList({
  auditId,
  phase,
  audit
}: {
  auditId: string,
  phase: string,
  audit: AuditWithRelations
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');

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

  return {
    creating,
    showTemplateModal,
    setShowTemplateModal,
    isAddingGroup,
    setIsAddingGroup,
    newGroupTitle,
    setNewGroupTitle,
    groups,
    ungroupedProcedures,
    phaseNum,
    handleAddGroup,
    handleDeleteGroup,
    handleAddProcedure,
    handleDeleteProcedure,
    handleClearAll
  };
}
