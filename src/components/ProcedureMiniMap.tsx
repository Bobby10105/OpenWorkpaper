'use client';

import { CheckCircle2, Circle, Clock, ChevronLeft, ChevronRight, Map as MapIcon } from 'lucide-react';

interface ProcedureMiniMapProps {
  procedureGroups: {
    id: string;
    title: string;
    procedures: {
      id: string;
      title: string | null;
      preparedBy: string | null;
      reviewedBy: string | null;
      preparedDate: any;
      reviewedDate: any;
    }[];
  }[];
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
  const getLetter = (index: number) => String.fromCharCode(97 + index);

  const scrollToProcedure = (nomenclature: string) => {
    const element = document.getElementById(`proc-${nomenclature}`);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <aside 
      className={`sticky top-24 self-start flex-shrink-0 hidden xl:block transition-all duration-300 ease-in-out ${
        isMinimized ? 'w-12' : 'w-72'
      }`}
    >
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        {/* Toggle Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          {!isMinimized && (
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center ml-1">
              <MapIcon className="w-3.5 h-3.5 mr-2 text-blue-600" />
              Navigator
            </h3>
          )}
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className={`p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-all duration-300 ${isMinimized ? 'mx-auto' : ''}`}
            title={isMinimized ? "Expand Navigator" : "Minimize Navigator"}
          >
            {isMinimized ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className={`p-2 space-y-5 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar`}>
          {procedureGroups.map((group, groupIndex) => {
            const groupNomenclature = `${phaseNum}.${groupIndex + 1}`;
            
            return (
              <div key={group.id} className="space-y-1.5">
                {!isMinimized && (
                  <p className="text-[9px] font-bold text-indigo-900/40 uppercase truncate px-3 tracking-wider">
                    {groupNomenclature} {group.title}
                  </p>
                )}
                <div className={`space-y-0.5 ${isMinimized ? 'flex flex-col items-center' : 'ml-2 border-l border-gray-100 pl-1'}`}>
                  {group.procedures.map((proc, procIndex) => {
                    const nomenclature = `${groupNomenclature}.${getLetter(procIndex)}`;
                    const isReviewed = proc.reviewedBy && proc.reviewedDate;
                    const isPrepared = proc.preparedBy && proc.preparedDate;
                    
                    let StatusIcon = Circle;
                    let iconColor = 'text-gray-300';
                    let bgHover = 'hover:bg-blue-50';
                    if (isReviewed) {
                      StatusIcon = CheckCircle2;
                      iconColor = 'text-blue-500';
                    } else if (isPrepared) {
                      StatusIcon = Clock;
                      iconColor = 'text-green-500';
                    }

                    return (
                      <button
                        key={proc.id}
                        onClick={() => scrollToProcedure(nomenclature)}
                        className={`w-full flex items-center rounded-lg ${bgHover} transition-all group text-left ${
                          isMinimized ? 'justify-center p-2' : 'space-x-3 px-3 py-2'
                        }`}
                        title={`${nomenclature}: ${proc.title || 'Untitled'}`}
                      >
                        <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor} transition-all duration-300 group-hover:scale-125`} />
                        {!isMinimized && (
                          <span className="text-[11px] font-semibold text-gray-600 group-hover:text-blue-700 transition-colors truncate leading-tight">
                            <span className="text-[9px] text-gray-400 mr-1.5 font-mono">{nomenclature}</span>
                            {proc.title || 'Untitled'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mini Legend when minimized */}
        {isMinimized && (
          <div className="py-5 border-t border-gray-100 flex flex-col items-center space-y-4 opacity-40 bg-gray-50/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            <Clock className="w-3.5 h-3.5 text-green-500" />
            <Circle className="w-3.5 h-3.5 text-gray-300" />
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </aside>
  );
}
