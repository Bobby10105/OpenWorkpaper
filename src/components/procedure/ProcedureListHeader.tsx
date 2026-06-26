import { BookOpen, FolderPlus, Trash2 } from 'lucide-react';
import type { ProcedureWithRelations, ProcedureGroupWithRelations } from '@/lib/types';

export default function ProcedureListHeader({
  creating,
  setShowTemplateModal,
  setIsAddingGroup,
  groups,
  ungroupedProcedures,
  user,
  handleClearAll
}: {
  creating: boolean;
  setShowTemplateModal: (show: boolean) => void;
  setIsAddingGroup: (adding: boolean) => void;
  groups: ProcedureGroupWithRelations[];
  ungroupedProcedures: ProcedureWithRelations[];
  user?: { username: string; role: string; id: string };
  handleClearAll: () => Promise<void>;
}) {
  return (
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
  );
}
