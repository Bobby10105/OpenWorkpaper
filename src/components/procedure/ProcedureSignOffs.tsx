import { User, CheckCircle } from 'lucide-react';
import React from 'react';
import type { ProcedureWithRelations } from '@/lib/types';

export function ProcedureSignOffs({
  data,
  isLocked,
  handleChange,
  formatDateForInput,
}: {
  data: ProcedureWithRelations;
  isLocked: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatDateForInput: (date: Date | string | null) => string;
}) {
  return (
    <div className={`bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-2xl space-y-10 transition-all ${isLocked ? 'opacity-80' : ''}`}>
      <h4 className="text-xs font-black text-gray-400 tracking-[0.2em] uppercase">Sign-offs & Dates</h4>
      
      <div className="space-y-10">
        <div className="space-y-6">
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 mb-3 tracking-widest uppercase px-1">Prepared By</label>
            <div className="relative group/input">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-100 p-2 rounded-xl group-focus-within/input:bg-blue-50 transition-all">
                <User className="w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600" />
              </div>
              <input
                name="preparedBy"
                value={String(data.preparedBy || '')}
                onChange={handleChange}
                disabled={isLocked}
                className="w-full pl-16 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm font-bold text-gray-900 outline-none shadow-inner disabled:cursor-not-allowed"
                placeholder="Auditor Name"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 mb-3 tracking-widest uppercase px-1">Prepared Date</label>
            <input
              name="preparedDate"
              type="date"
              value={formatDateForInput(data.preparedDate)}
              onChange={handleChange}
              disabled={isLocked}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm font-bold text-gray-900 outline-none shadow-inner disabled:cursor-not-allowed"
            />
          </div>
        </div>
        
        <div className="h-px bg-gray-100" />
        
        <div className="space-y-6">
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 mb-3 tracking-widest uppercase px-1">Reviewed By</label>
            <div className="relative group/input">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-100 p-2 rounded-xl group-focus-within/input:bg-blue-50 transition-all">
                <CheckCircle className="w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600" />
              </div>
              <input
                name="reviewedBy"
                value={String(data.reviewedBy || '')}
                onChange={handleChange}
                disabled={isLocked}
                className="w-full pl-16 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm font-bold text-gray-900 outline-none shadow-inner disabled:cursor-not-allowed"
                placeholder="Reviewer Name"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 mb-3 tracking-widest uppercase px-1">Reviewed Date</label>
            <input
              name="reviewedDate"
              type="date"
              value={formatDateForInput(data.reviewedDate)}
              onChange={handleChange}
              disabled={isLocked}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm font-bold text-gray-900 outline-none shadow-inner disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
