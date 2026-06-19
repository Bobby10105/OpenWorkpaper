import { Save, Lock } from 'lucide-react';
import type { ProcedureWithRelations } from '@/lib/types';
import RichTextEditor from '@/components/RichTextEditor';

const fields = [
  { name: 'purpose', label: 'Purpose' },
  { name: 'source', label: 'Source' },
  { name: 'scope', label: 'Scope' },
  { name: 'methodology', label: 'Methodology' },
  { name: 'results', label: 'Results' },
  { name: 'conclusions', label: 'Conclusions' },
];

function ProcedureField({
  field,
  data,
  isLocked,
  isFocused,
  isDirty,
  setFocusedField,
  handleRichTextChange,
  handleSave,
}: {
  field: { name: string; label: string };
  data: ProcedureWithRelations;
  isLocked: boolean;
  isFocused: boolean;
  isDirty: boolean;
  setFocusedField: (field: string | null) => void;
  handleRichTextChange: (field: string, content: string) => void;
  handleSave: () => void;
}) {
  return (
    <div
      className={`group relative flex flex-col rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${
        isFocused
          ? 'border-blue-500 bg-white shadow-[0_20px_80px_rgba(59,130,246,0.12)] scale-[1.02]'
          : 'border-gray-100 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)]'
      } ${isLocked ? 'bg-gray-50/50' : ''}`}
    >
      {/* Left Accent Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-500 ${
        isFocused ? 'bg-blue-600' : 'bg-gray-200'
      }`} />

      <div className="flex justify-between items-center py-6 px-10 border-b border-gray-50 bg-gray-50/30">
        <div className="flex items-center space-x-4">
          <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isFocused ? 'bg-blue-600 scale-150 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-300'}`} />
          <label className={`text-xs font-black tracking-[0.25em] uppercase transition-all duration-300 ${
            isFocused ? 'text-blue-700' : 'text-gray-400'
          }`}>
            {field.label}
          </label>
        </div>
        {isDirty && !isLocked && (
          <span className="flex items-center text-[10px] font-black text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-full border border-blue-100 animate-pulse shadow-sm">
            <Save className="w-3.5 h-3.5 mr-2" /> Syncing...
          </span>
        )}
        {isLocked && (
          <Lock className="w-3.5 h-3.5 text-gray-300" />
        )}
      </div>

      <div className="rich-text-wrapper px-4 pb-4">
        <RichTextEditor
          readOnly={isLocked}
          value={String(data[field.name as keyof ProcedureWithRelations] || '')}
          onChange={(content) => handleRichTextChange(field.name, content)}
          onFocus={() => setFocusedField(field.name)}
          onBlur={() => {
            setFocusedField(null);
            handleSave(); // Immediate save on blur for better feel
          }}
          placeholder={isLocked ? "No content provided." : `Provide comprehensive details for ${field.label.toLowerCase()}...`}
        />
      </div>
    </div>
  );
}

export function ProcedureEditor({
  data,
  isLocked,
  focusedField,
  setFocusedField,
  isFieldDirty,
  handleRichTextChange,
  handleSave,
}: {
  data: ProcedureWithRelations;
  isLocked: boolean;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
  isFieldDirty: (field: string) => boolean;
  handleRichTextChange: (field: string, content: string) => void;
  handleSave: () => void;
}) {
  return (
    <div className="space-y-12">
      {fields.map(field => (
        <ProcedureField
          key={field.name}
          field={field}
          data={data}
          isLocked={isLocked}
          isFocused={focusedField === field.name}
          isDirty={isFieldDirty(field.name)}
          setFocusedField={setFocusedField}
          handleRichTextChange={handleRichTextChange}
          handleSave={handleSave}
        />
      ))}
    </div>
  );
}
