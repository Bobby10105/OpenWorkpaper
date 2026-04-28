'use client';

import { useState } from 'react';
import { TrendingUp, Clock, AlertCircle, Users, FileDown, Loader2, ChevronRight, CheckCircle2, Inbox } from 'lucide-react';
import { saveAs } from 'file-saver';

interface AuditorWorkload {
  name: string;
  completed: number;
  pending: number;
  awaitingReview: number;
}

interface ManagementInsightsProps {
  avgReviewLag: number;
  agingCount: number;
  auditorWorkloads: AuditorWorkload[];
  portfolioVelocity: number;
}

function InsightCard({ 
  label, 
  value, 
  subValue,
  icon: Icon, 
  color 
}: { 
  label: string;
  value: string | number;
  subValue?: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</p>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
          {subValue && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${color} text-white shadow-lg`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function ManagementInsights({ 
  avgReviewLag, 
  agingCount, 
  auditorWorkloads, 
  portfolioVelocity 
}: ManagementInsightsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/reports/export');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      saveAs(blob, `AMSOS_Global_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to generate global report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-200">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Management Insights</h2>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-70 font-bold text-xs uppercase tracking-widest border border-slate-700"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          <span>{isExporting ? 'Generating...' : 'Global Export'}</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <InsightCard 
          label="Review Timeliness" 
          value={`${avgReviewLag.toFixed(1)}d`} 
          subValue="Avg Lag (Prep to Review)"
          icon={Clock} 
          color="bg-indigo-500" 
        />
        <InsightCard 
          label="Aging Procedures" 
          value={agingCount} 
          subValue="Pending Review > 30 Days"
          icon={AlertCircle} 
          color="bg-orange-500" 
        />
        <InsightCard 
          label="Portfolio Velocity" 
          value={`${portfolioVelocity}%`} 
          subValue="Total Procedures Reviewed"
          icon={CheckCircle2} 
          color="bg-emerald-500" 
        />
        <InsightCard 
          label="Resource Capacity" 
          value={auditorWorkloads.length} 
          subValue="Active Team Members"
          icon={Users} 
          color="bg-blue-500" 
        />
      </div>

      <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-200 p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
            <Users className="w-4 h-4 mr-3 text-indigo-600" />
            Auditor Workload Analysis
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Capacity tracking</span>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {auditorWorkloads.length > 0 ? (
            auditorWorkloads.map((workload) => (
              <div key={workload.name} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{workload.name}</p>
                  <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Active</span>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="space-y-1">
                    <p suppressHydrationWarning className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Assigned</p>
                    <p className="text-xl font-black text-slate-900 leading-none">{workload.pending}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-100" />
                  <div className="space-y-1">
                    <p suppressHydrationWarning className="text-[10px] font-bold text-orange-600 uppercase tracking-tighter">Prepared</p>
                    <p className="text-xl font-black text-slate-900 leading-none">{workload.awaitingReview}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-100" />
                  <div className="space-y-1">
                    <p suppressHydrationWarning className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Completed</p>
                    <p className="text-xl font-black text-slate-900 leading-none">{workload.completed}</p>
                  </div>
                </div>
                <div className="mt-4 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000" 
                    style={{ width: `${(workload.completed / (workload.completed + workload.pending + workload.awaitingReview || 1)) * 100}%` }} 
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center space-y-3 opacity-50">
              <Inbox className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-widest">No workload data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
