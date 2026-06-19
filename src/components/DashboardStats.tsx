'use client';

import React, { useState } from 'react';
import { LayoutDashboard, AlertTriangle, ChevronRight, ArrowRight, ExternalLink, X, ClipboardList, User } from 'lucide-react';
import Link from 'next/link';

interface PendingProcedure {
  id: string;
  auditId?: string;
  title: string | null;
  assignedTo?: { name: string } | null;
}

interface PendingAudit {
  id: string;
  title: string;
  pendingProcedures?: PendingProcedure[];
}

interface DashboardStatsProps {
  activeCount: number;
  portfolioProgress: number;
  totalPendingReview: number;
  totalToComplete: number;
  pendingAudits: PendingAudit[];
  toCompleteAudits: PendingAudit[];
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  onClick, 
  isActive 
}: { 
  label: string, 
  value: string | number, 
  icon: React.ElementType, 
  color: string,
  onClick?: () => void,
  isActive?: boolean
}) {
  const content = (
    <div className="relative flex items-center space-x-5 z-10">
      <div className={`p-3.5 rounded-2xl transition-all duration-500 group-hover:scale-110 shadow-[0_0_20px_rgb(59,130,246,0.2)] border border-white/20 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-none mb-2">{label}</p>
        <p className="text-3xl font-bold text-slate-900 leading-none tracking-tight">{value}</p>
      </div>
      {onClick && (
        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
        </div>
      )}
    </div>
  );

  const baseClasses = "relative w-full text-left bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(59,130,246,0.1)] transition-all duration-500 overflow-hidden group";
  const glow = <div className="absolute -inset-10 bg-blue-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />;

  if (onClick) {
    return (
      <button 
        onClick={onClick}
        className={`${baseClasses} cursor-pointer active:scale-[0.98] ${isActive ? 'ring-2 ring-blue-500/50 bg-blue-50/50' : ''}`}
      >
        {glow}
        {content}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {glow}
      {content}
    </div>
  );
}

export default function DashboardStats({ 
  activeCount, 
  portfolioProgress,
  totalPendingReview, 
  totalToComplete,
  pendingAudits,
  toCompleteAudits,
}: DashboardStatsProps) {
  const [showPendingPanel, setShowPendingPanel] = useState(false);
  const [showToCompletePanel, setShowToCompletePanel] = useState(false);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Active Audits" 
          value={activeCount} 
          icon={LayoutDashboard} 
          color="bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-500/10"
        />
        <StatCard 
          label="Portfolio Progress" 
          value={`${portfolioProgress}%`} 
          icon={ExternalLink} 
          color="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/10"
        />
        <StatCard 
          label="Assigned to You" 
          value={totalToComplete} 
          icon={ClipboardList} 
          color="bg-gradient-to-br from-blue-400 to-indigo-500 shadow-blue-400/10"
          onClick={() => { setShowToCompletePanel(!showToCompletePanel); setShowPendingPanel(false); }}
          isActive={showToCompletePanel}
        />
        <StatCard 
          label="Pending Review" 
          value={totalPendingReview} 
          icon={AlertTriangle} 
          color="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/10"
          onClick={() => { setShowPendingPanel(!showPendingPanel); setShowToCompletePanel(false); }}
          isActive={showPendingPanel}
        />
      </div>

      {showToCompletePanel && totalToComplete > 0 && (
        <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] border border-blue-200 shadow-xl overflow-hidden animate-in slide-in-from-top-6 fade-in duration-500 ease-out">
          <div className="bg-blue-50/50 px-8 py-5 border-b border-blue-100 flex justify-between items-center">
            <h3 className="font-bold text-blue-700 tracking-tight text-sm flex items-center">
              <div className="bg-blue-500/10 p-1.5 rounded-lg mr-3 border border-blue-500/20">
                <ClipboardList className="w-4 h-4 text-blue-600" />
              </div>
              Procedures Assigned to You
            </h3>
            <button aria-label="Close assigned procedures panel" onClick={() => setShowToCompletePanel(false)} className="p-2 bg-white hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all shadow-sm border border-slate-200">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="p-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {toCompleteAudits.map(audit => (
                <div key={audit.id} className="space-y-4 p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm hover:shadow-blue-500/5 hover:border-blue-200 transition-all duration-300 group/card">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1 flex-1 pr-3 tracking-tight group-hover/card:text-blue-600 transition-colors">{audit.title}</h4>
                    <Link 
                      href={`/audits/${audit.id}`} 
                      className="text-blue-600 hover:text-white transition-all p-2 bg-blue-50 hover:bg-blue-600 rounded-xl"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {audit.pendingProcedures?.map(proc => (
                      <Link 
                        key={proc.id} 
                        href={`/audits/${proc.auditId || audit.id}/procedures/${proc.id}`}
                        className="flex items-center group/item p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 group-hover/item:scale-125 transition-transform shadow-[0_0_12px_rgba(59,130,246,0.2)]" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-700 group-hover/item:text-blue-600 font-bold transition-colors line-clamp-1">
                            {proc.title || 'Untitled Procedure'}
                          </span>
                          {proc.assignedTo && (
                            <div className="flex items-center mt-0.5 opacity-60">
                              <User className="w-2.5 h-2.5 mr-1" />
                              <span className="text-[10px] font-medium">{proc.assignedTo.name}</span>
                            </div>
                          )}
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover/item:opacity-100 transition-all ml-2" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPendingPanel && totalPendingReview > 0 && (
        <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-top-6 fade-in duration-500 ease-out">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-emerald-600 tracking-tight text-sm flex items-center">
              <div className="bg-emerald-500/10 p-1.5 rounded-lg mr-3 border border-emerald-500/20">
                <AlertTriangle className="w-4 h-4 text-emerald-600" />
              </div>
              Procedures Awaiting Sign-off
            </h3>
            <button aria-label="Close pending review panel" onClick={() => setShowPendingPanel(false)} className="p-2 bg-white hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all shadow-sm border border-slate-200">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="p-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {pendingAudits.map(audit => (
                <div key={audit.id} className="space-y-4 p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm hover:shadow-blue-500/5 hover:border-blue-200 transition-all duration-300 group/card">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1 flex-1 pr-3 tracking-tight group-hover/card:text-blue-600 transition-colors">{audit.title}</h4>
                    <Link 
                      href={`/audits/${audit.id}`} 
                      className="text-blue-600 hover:text-white transition-all p-2 bg-blue-50 hover:bg-blue-600 rounded-xl"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {audit.pendingProcedures?.map(proc => (
                      <Link 
                        key={proc.id} 
                        href={`/audits/${proc.auditId || audit.id}/procedures/${proc.id}`}
                        className="flex items-center group/item p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 group-hover/item:scale-125 transition-transform shadow-[0_0_12px_rgba(16,185,129,0.2)]" />
                        <span className="text-xs text-slate-500 group-hover/item:text-blue-600 font-medium transition-colors line-clamp-1 flex-1">
                          {proc.title || 'Untitled Procedure'}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover/item:opacity-100 transition-all ml-2" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
