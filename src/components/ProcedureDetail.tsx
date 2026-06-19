'use client';
/** OpenWorkpaper ProcedureDetail - Full Page Editor with Auto-Save **/
import { useState } from 'react';
import type { TeamMember } from '@prisma/client';
import type { ProcedureWithRelations } from '@/lib/types';
import { useProcedureState } from './procedure/useProcedureState';
import { ProcedureHeader } from './procedure/ProcedureHeader';
import { ProcedureOwner } from './procedure/ProcedureOwner';
import { ProcedureEditor } from './procedure/ProcedureEditor';
import { ProcedureAttachments } from './procedure/ProcedureAttachments';
import { ProcedureChat } from './procedure/ProcedureChat';
import { ProcedureSignOffs } from './procedure/ProcedureSignOffs';

export default function ProcedureDetail({ 
  procedure, 
  nomenclature, 
  user,
  teamMembers = [],
  auditId
}: { 
  procedure: ProcedureWithRelations, 
  nomenclature: string, 
  user?: { username: string; role: string; id: string },
  teamMembers?: TeamMember[],
  auditId: string
}) {
  const state = useProcedureState({ procedure });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const canDelete = user?.role !== 'Specialist' && !state.isLocked;
  const allowedUnlockRoles = ['Auditor', 'Audit Manager', 'Audit Director', 'Audit Partner', 'Business Operations', 'Engagement Manager'];
  const canUnlock = !!(user && allowedUnlockRoles.includes(user.role));

  const handleAssignment = (newId: string | null) => {
    const newData = { ...state.data, assignedToId: newId };
    state.setData(newData);
    state.handleSave(newData);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <ProcedureHeader
        auditId={auditId}
        procedureId={procedure.id}
        phase={procedure.phase}
        nomenclature={nomenclature}
        title={state.data.title || ''}
        isLocked={state.isLocked}
        isReviewed={state.isReviewed}
        isPrepared={state.isPrepared}
        saving={state.saving}
        hasUnsavedChanges={state.hasUnsavedChanges}
        canDelete={canDelete}
        canUnlock={canUnlock}
        isUnlocking={state.isUnlocking}
        setIsUnlocking={state.setIsUnlocking}
        handleChange={state.handleChange}
        handleSave={() => state.handleSave()}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className={`xl:col-span-2 space-y-8 ${state.isLocked ? 'pointer-events-none select-none' : ''}`}>
          <ProcedureOwner
            assignedToId={state.data.assignedToId || ''}
            isLocked={state.isLocked}
            isReviewed={state.isReviewed}
            isPrepared={state.isPrepared}
            teamMembers={teamMembers}
            user={user}
            handleAssignment={handleAssignment}
          />

          <ProcedureEditor
            data={state.data}
            isLocked={state.isLocked}
            focusedField={focusedField}
            setFocusedField={setFocusedField}
            isFieldDirty={state.isFieldDirty}
            handleRichTextChange={state.handleRichTextChange}
            handleSave={() => state.handleSave()}
          />

          <ProcedureAttachments
            procedureId={procedure.id}
            nomenclature={nomenclature}
            attachments={state.attachments}
            setAttachments={state.setAttachments}
            isLocked={state.isLocked}
            formatDateForInput={state.formatDateForInput}
          />
        </div>

        <div className="space-y-8">
          <ProcedureChat
            procedureId={procedure.id}
            messages={state.messages}
            setMessages={state.setMessages}
            user={user}
          />

          <ProcedureSignOffs
            data={state.data}
            isLocked={state.isLocked}
            handleChange={state.handleChange}
            formatDateForInput={state.formatDateForInput}
          />
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e2e8f0;
        }
      `}</style>
    </div>
  );
}
