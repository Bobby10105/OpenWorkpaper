import { BookOpen, FolderPlus } from 'lucide-react';

export default function ProcedureEmptyState({
  setShowTemplateModal,
  setIsAddingGroup
}: {
  setShowTemplateModal: (show: boolean) => void;
  setIsAddingGroup: (adding: boolean) => void;
}) {
  return (
    <div className="text-center py-24 bg-white rounded-[3rem] border border-gray-100 shadow-xl">
      <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-inner">
        <BookOpen className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-gray-900 font-bold uppercase tracking-widest text-lg mb-3">Empty Program</h3>
      <p className="text-gray-500 text-sm mb-10 max-w-sm mx-auto leading-relaxed">Import a standard audit program or build your own by adding groups and procedures.</p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        <button
          onClick={() => setShowTemplateModal(true)}
          className="flex items-center space-x-2 px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl active:scale-95 uppercase tracking-wider text-sm border border-blue-500"
        >
          <BookOpen className="w-5 h-5" />
          <span>Import Program</span>
        </button>
        <button
          onClick={() => setIsAddingGroup(true)}
          className="flex items-center space-x-2 px-10 py-4 bg-gray-50 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 transition-all border border-gray-200 shadow-lg active:scale-95 text-sm uppercase tracking-wider"
        >
          <FolderPlus className="w-5 h-5" />
          <span>Add Group</span>
        </button>
      </div>
    </div>
  );
}
