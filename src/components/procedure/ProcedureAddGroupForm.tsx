import { FolderPlus } from 'lucide-react';

export default function ProcedureAddGroupForm({
  creating,
  newGroupTitle,
  setNewGroupTitle,
  handleAddGroup,
  setIsAddingGroup
}: {
  creating: boolean;
  newGroupTitle: string;
  setNewGroupTitle: (title: string) => void;
  handleAddGroup: () => Promise<void>;
  setIsAddingGroup: (adding: boolean) => void;
}) {
  return (
    <div className="bg-white border border-blue-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-xl">
      <div className="bg-blue-50 p-3 rounded-2xl">
        <FolderPlus className="w-6 h-6 text-blue-600" />
      </div>
      <input
        value={newGroupTitle}
        onChange={(e) => setNewGroupTitle(e.target.value)}
        placeholder="Group Title (e.g. Payroll, Revenue...)"
        className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
      />
      <div className="flex items-center space-x-2 w-full md:w-auto">
        <button
          onClick={handleAddGroup}
          disabled={creating || !newGroupTitle.trim()}
          className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
        >
          Create Group
        </button>
        <button
          onClick={() => setIsAddingGroup(false)}
          className="px-6 py-3 text-gray-500 text-sm font-bold hover:text-gray-700 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
