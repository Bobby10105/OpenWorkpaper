'use client';

import React from 'react';
import { ChevronRight, CheckCircle2, Circle, Clock, ChevronDown } from 'lucide-react';
import type { ProcedureGroupWithRelations } from '@/lib/types';

interface ProcedureMiniMapProps {
  procedureGroups: ProcedureGroupWithRelations[];
  phaseNum: number;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
}

export default function ProcedureMiniMap({ 
  procedureGroups, 
  phaseNum,
  isMinimized,
  setIsMinimized
}: ProcedureMiniMapProps) {
  if (isMinimized) {
    return (
      <button 
        onClick={() => setIsMinimized(false)}
        className="bg-white/80 backdrop-blur-xl border border-slate-200 p-4 rounded-2xl shadow-xl hover:bg-slate-50 transition-all group flex items-center space-x-3"
      >
        <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
          <ChevronRight className="w-4 h-4 text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">Workspace Navigator</span>
      </button>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] shadow-2xl w-[320px] overflow-hidden flex flex-col animate-in slide-in-from-left-4 duration-500">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Workspace Navigator</h3>
        <button 
          onClick={() => setIsMinimized(true)}
          className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
      </div>
      
      <div className="p-4 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200">
        <div className="space-y-8">
          {procedureGroups.map((group, groupIndex) => (
            <div key={group.id} className="space-y-4">
              <div className="px-2 flex items-center space-x-3">
                <div className="bg-blue-600 text-white text-[9px] font-black w-10 h-7 flex items-center justify-center rounded-lg shadow-md border border-blue-500">
                  {phaseNum}.{groupIndex + 1}
                </div>
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">{group.title}</span>
              </div>
              
              <div className="space-y-1 relative pl-5">
                <div className="absolute left-[24px] top-0 bottom-0 w-px bg-slate-100" />
                
                {group.procedures.map((proc, procIndex) => {
                  const isCompleted = !!(proc.preparedDate && proc.reviewedDate);
                  const isAwaitingReview = !!(proc.preparedDate && !proc.reviewedDate);
                  const getLetter = (index: number) => String.fromCharCode(97 + index);
                  
                  const getStatusIcon = () => {
                    if (isCompleted) return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
                    if (isAwaitingReview) return <Clock className="w-3 h-3 text-orange-400" />;
                    return <Circle className="w-3 h-3 text-slate-300" />;
                  };

                  return (
                    <a
                      key={proc.id}
                      href={`#proc-${phaseNum}.${groupIndex + 1}.${getLetter(procIndex)}`}
                      className="w-full flex items-center rounded-xl hover:bg-blue-50 transition-all group p-2"
                    >
                      <div className="w-6 flex justify-center z-10">
                        {getStatusIcon()}
                      </div>
                      <div className="flex items-center min-w-0 space-x-2">
                        <span className="text-[9px] font-bold text-slate-400 w-4">
                          {getLetter(procIndex)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600 truncate transition-colors">
                          {proc.title || 'Untitled'}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
