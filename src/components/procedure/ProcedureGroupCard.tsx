import { Plus, Trash2 } from 'lucide-react';
import ProcedureItem from '../ProcedureItem';
import type { ProcedureGroupWithRelations } from '@/lib/types';

// Helper to convert number to letter (1 -> a, 2 -> b...)
const getLetter = (index: number) => String.fromCharCode(97 + index);

export default function ProcedureGroupCard({
  group,
  groupIndex,
  phaseNum,
  auditId,
  creating,
  handleDeleteGroup,
  handleAddProcedure,
  handleDeleteProcedure
}: {
  group: ProcedureGroupWithRelations;
  groupIndex: number;
  phaseNum: number;
  auditId: string;
  creating: boolean;
  handleDeleteGroup: (id: string, title: string) => Promise<void>;
  handleAddProcedure: (groupId: string) => Promise<void>;
  handleDeleteProcedure: (id: string) => Promise<void>;
}) {
  const groupNomenclature = `${phaseNum}.${groupIndex + 1}`;

  return (
    <div className="space-y-6">
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
}
