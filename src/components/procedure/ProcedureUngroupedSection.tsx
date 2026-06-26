import ProcedureItem from '../ProcedureItem';
import type { ProcedureWithRelations } from '@/lib/types';

export default function ProcedureUngroupedSection({
  ungroupedProcedures,
  phaseNum,
  auditId,
  handleDeleteProcedure
}: {
  ungroupedProcedures: ProcedureWithRelations[];
  phaseNum: number;
  auditId: string;
  handleDeleteProcedure: (id: string) => Promise<void>;
}) {
  if (ungroupedProcedures.length === 0) return null;

  return (
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
  );
}
