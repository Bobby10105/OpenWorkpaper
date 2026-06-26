'use client';

import ApplyTemplateModal from './ApplyTemplateModal';
import ProcedureListHeader from './procedure/ProcedureListHeader';
import ProcedureAddGroupForm from './procedure/ProcedureAddGroupForm';
import ProcedureEmptyState from './procedure/ProcedureEmptyState';
import ProcedureGroupCard from './procedure/ProcedureGroupCard';
import ProcedureUngroupedSection from './procedure/ProcedureUngroupedSection';
import { useProcedureList } from './procedure/useProcedureList';
import type { AuditWithRelations } from '@/lib/types';

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
  const {
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
  } = useProcedureList({ auditId, phase, audit });

  return (
    <div className="space-y-10 animate-fade-in">
      <ProcedureListHeader
        creating={creating}
        setShowTemplateModal={setShowTemplateModal}
        setIsAddingGroup={setIsAddingGroup}
        groups={groups}
        ungroupedProcedures={ungroupedProcedures}
        user={user}
        handleClearAll={handleClearAll}
      />

      {isAddingGroup && (
        <ProcedureAddGroupForm
          creating={creating}
          newGroupTitle={newGroupTitle}
          setNewGroupTitle={setNewGroupTitle}
          handleAddGroup={handleAddGroup}
          setIsAddingGroup={setIsAddingGroup}
        />
      )}

      {groups.length === 0 && ungroupedProcedures.length === 0 ? (
        <ProcedureEmptyState
          setShowTemplateModal={setShowTemplateModal}
          setIsAddingGroup={setIsAddingGroup}
        />
      ) : (
        <div className="space-y-12">
          {groups.map((group, groupIndex) => (
            <ProcedureGroupCard
              key={group.id}
              group={group}
              groupIndex={groupIndex}
              phaseNum={phaseNum}
              auditId={auditId}
              creating={creating}
              handleDeleteGroup={handleDeleteGroup}
              handleAddProcedure={handleAddProcedure}
              handleDeleteProcedure={handleDeleteProcedure}
            />
          ))}

          <ProcedureUngroupedSection
            ungroupedProcedures={ungroupedProcedures}
            phaseNum={phaseNum}
            auditId={auditId}
            handleDeleteProcedure={handleDeleteProcedure}
          />
        </div>
      )}

      {showTemplateModal && (
        <ApplyTemplateModal
          auditId={auditId}
          phase={phase}
          onClose={() => setShowTemplateModal(false)}
          onSuccess={() => {
            // Success handler for modal
            setShowTemplateModal(false);
          }}
        />
      )}
    </div>
  );
}
