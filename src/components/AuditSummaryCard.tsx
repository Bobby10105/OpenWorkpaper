import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Audit } from '@prisma/client';

export interface AuditWithCount extends Audit {
  _count?: {
    procedures: number;
  };
  reviewedCount?: number;
}

export function AuditSummaryCard({ audit }: { audit: AuditWithCount }) {
  const totalProcedures = audit._count?.procedures || 0;
  const reviewedProcedures = audit.reviewedCount || 0;
  const progress = totalProcedures > 0 ? Math.round((reviewedProcedures / totalProcedures) * 100) : 0;

  return (
    <Link key={audit.id} href={`/audits/${audit.id}`} className="block group">
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 hover:shadow-xl hover:border-blue-500/30 transition-all duration-500 h-full flex flex-col relative overflow-hidden group">
        <div className={`absolute top-0 left-0 w-full h-1 transition-opacity duration-500 ${audit.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-600 opacity-40 group-hover:opacity-100'}`} />

        <div className="flex justify-between items-start mb-6">
          <div className="space-y-3 flex-1 min-w-0 mr-4">
            <div className="flex items-center space-x-2">
              {audit.auditNumber && (
                <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">
                  {audit.auditNumber}
                </span>
              )}
              {audit.category && (
                <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-tighter">
                  {audit.category}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight tracking-tight">
              {audit.title}
            </h2>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-blue-600 transition-all duration-300 text-slate-400 group-hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Progress</span>
              <span className={progress === 100 ? 'text-emerald-600' : 'text-blue-600'}>{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
              audit.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}>
              {audit.status}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {reviewedProcedures}/{totalProcedures} Reviewed
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
