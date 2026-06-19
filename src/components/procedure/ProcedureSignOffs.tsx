import { User, CheckCircle, LucideIcon } from 'lucide-react';
import React from 'react';
import type { ProcedureWithRelations } from '@/lib/types';

interface SignOffBlockProps {
  title: string;
  nameKey: string;
  dateKey: string;
  nameValue: string | null;
  dateValue: Date | string | null;
  icon: LucideIcon;
  placeholder: string;
  isLocked: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatDateForInput: (date: Date | string | null) => string;
}

function SignOffBlock({
  title,
  nameKey,
  dateKey,
  nameValue,
  dateValue,
  icon: Icon,
  placeholder,
  isLocked,
  handleChange,
  formatDateForInput,
}: SignOffBlockProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <label className="text-[10px] font-black text-gray-400 mb-3 tracking-widest uppercase px-1">{title} By</label>
        <div className="relative group/input">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-100 p-2 rounded-xl group-focus-within/input:bg-blue-50 transition-all">
            <Icon className="w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600" />
          </div>
          <input
            name={nameKey}
            value={String(nameValue || '')}
            onChange={handleChange}
            disabled={isLocked}
            className="w-full pl-16 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm font-bold text-gray-900 outline-none shadow-inner disabled:cursor-not-allowed"
            placeholder={placeholder}
          />
        </div>
      </div>
      <div className="flex flex-col">
        <label className="text-[10px] font-black text-gray-400 mb-3 tracking-widest uppercase px-1">{title} Date</label>
        <input
          name={dateKey}
          type="date"
          value={formatDateForInput(dateValue)}
          onChange={handleChange}
          disabled={isLocked}
          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm font-bold text-gray-900 outline-none shadow-inner disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

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
        <SignOffBlock
          title="Prepared"
          nameKey="preparedBy"
          dateKey="preparedDate"
          nameValue={data.preparedBy}
          dateValue={data.preparedDate}
          icon={User}
          placeholder="Auditor Name"
          isLocked={isLocked}
          handleChange={handleChange}
          formatDateForInput={formatDateForInput}
        />
        
        <div className="h-px bg-gray-100" />
        
        <SignOffBlock
          title="Reviewed"
          nameKey="reviewedBy"
          dateKey="reviewedDate"
          nameValue={data.reviewedBy}
          dateValue={data.reviewedDate}
          icon={CheckCircle}
          placeholder="Reviewer Name"
          isLocked={isLocked}
          handleChange={handleChange}
          formatDateForInput={formatDateForInput}
        />
      </div>
    </div>
  );
}
