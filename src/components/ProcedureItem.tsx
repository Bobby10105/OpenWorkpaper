import Link from 'next/link';
import { ChevronRight, CheckCircle, Clock, Paperclip, MessageSquare, Trash2, User } from 'lucide-react';
import type { ProcedureWithRelations } from '@/lib/types';

export default function ProcedureItem({ 
  procedure, 
  nomenclature, 
  onDelete,
  user,
  teamMembers,
  auditId
}: { 
  procedure: ProcedureWithRelations, 
  nomenclature: string, 
  onDelete?: () => void,
  user?: any,
  teamMembers: any[],
  auditId: string
}) {
  const isReviewed = procedure.reviewedBy && procedure.reviewedDate;
  const isPrepared = procedure.preparedBy && procedure.preparedDate;
  const hasAttachments = (procedure.attachments?.length || 0) > 0;
  const hasMessages = (procedure.messages?.length || 0) > 0;

  return (
    <div id={`proc-${nomenclature}`} className="flex items-center space-x-4 group/row">
      <Link 
        href={`/audits/${auditId}/procedures/${procedure.id}?phase=${procedure.phase}`}
        className="flex-1 bg-white border border-slate-200 p-5 rounded-2xl hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-5 min-w-0">
            <div className="text-[10px] font-black bg-slate-50 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-100 tracking-tighter uppercase shrink-0">
              {nomenclature}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                {procedure.title || 'Untitled Procedure'}
              </h4>
              <div className="flex items-center mt-1.5 space-x-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {procedure.assignedTo && (
                  <div className="flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    <User className="w-3 h-3 mr-1" />
                    {procedure.assignedTo.name}
                  </div>
                )}
                {hasAttachments && (
                  <div className="flex items-center text-emerald-600">
                    <Paperclip className="w-3 h-3 mr-1" />
                    {procedure.attachments?.length} Files
                  </div>
                )}
                {hasMessages && (
                  <div className="flex items-center text-orange-500">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Active Chat
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 shrink-0">
            {isReviewed ? (
              <div className="bg-blue-600 p-1.5 rounded-full shadow-lg shadow-blue-100">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            ) : isPrepared ? (
              <div className="bg-emerald-500 p-1.5 rounded-full shadow-lg shadow-emerald-100">
                <Clock className="w-4 h-4 text-white" />
              </div>
            ) : null}
            <div className="bg-gray-50 p-2 rounded-xl group-hover:bg-blue-600 transition-all text-gray-300 group-hover:text-white">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>
      
      {onDelete && (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="p-3 text-gray-300 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-all hover:bg-red-50 rounded-xl"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
