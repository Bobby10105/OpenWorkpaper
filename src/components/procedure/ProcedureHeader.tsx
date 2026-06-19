import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Lock, RefreshCw, Unlock, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ProcedureHeader({
  auditId,
  procedureId,
  phase,
  nomenclature,
  title,
  isLocked,
  isReviewed,
  isPrepared,
  saving,
  hasUnsavedChanges,
  canDelete,
  canUnlock,
  isUnlocking,
  setIsUnlocking,
  handleChange,
  handleSave,
}: {
  auditId: string;
  procedureId: string;
  phase: string;
  nomenclature: string;
  title: string;
  isLocked: boolean;
  isReviewed: boolean;
  isPrepared: boolean;
  saving: boolean;
  hasUnsavedChanges: boolean;
  canDelete: boolean;
  canUnlock: boolean;
  isUnlocking: boolean;
  setIsUnlocking: (v: boolean) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSave: () => void;
}) {
  const router = useRouter();

  let statusBadge = null;
  if (isReviewed) {
    statusBadge = (
      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider flex items-center shadow-lg shadow-blue-100 border border-blue-400 animate-fade-in">
        <CheckCircle className="w-3 h-3 mr-1.5" />
        Reviewed
      </span>
    );
  } else if (isPrepared) {
    statusBadge = (
      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider flex items-center shadow-lg shadow-emerald-100 border border-emerald-400 animate-fade-in">
        <Clock className="w-3 h-3 mr-1.5" />
        Prepared
      </span>
    );
  }

  const handleUnlock = async () => {
    if (!confirm("Unlocking this procedure will clear the existing sign-offs and require re-preparation and re-review. Continue?")) return;
    
    setIsUnlocking(true);
    try {
      const res = await fetch(`/api/procedures/${procedureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock' }),
      });
      
      if (res.ok) {
        toast.success('Procedure unlocked successfully');
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to unlock procedure");
      }
    } catch (e: unknown) {
      console.error(e);
      toast.error("Network error unlocking procedure");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDelete = async () => {
    if (isLocked) return;
    if (!confirm('Are you sure you want to delete this procedure?')) return;
    
    try {
      const res = await fetch(`/api/procedures/${procedureId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Procedure deleted successfully');
        router.push(`/audits/${auditId}`);
      } else {
        toast.error('Failed to delete procedure');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error deleting procedure');
    }
  };

  return (
    <>
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex items-center justify-between shadow-sm animate-slide-up">
           <div className="flex items-center space-x-4">
             <div className="bg-amber-100 p-2 rounded-xl">
               <Lock className="w-5 h-5 text-amber-600" />
             </div>
             <div>
               <p className="text-sm font-bold text-amber-900 tracking-tight">Procedure is Locked</p>
               <p className="text-[11px] text-amber-700 font-medium uppercase tracking-widest opacity-80">This workpaper has been reviewed and is now read-only.</p>
             </div>
           </div>
           {canUnlock && (
             <button
               onClick={handleUnlock}
               disabled={isUnlocking}
               className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-amber-200 text-amber-700 text-[10px] font-black rounded-xl hover:bg-amber-100 transition-all active:scale-95 shadow-sm uppercase tracking-widest"
             >
               {isUnlocking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
               <span>Unlock for Editing</span>
             </button>
           )}
        </div>
      )}

      {/* Header / Navigation */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-2xl transition-all duration-500 ${isLocked ? 'opacity-80 grayscale-[0.3]' : ''}`}>
        <div className="flex items-center space-x-6">
          <Link 
            href={`/audits/${auditId}?phase=${phase}`}
            className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all shadow-sm active:scale-95 border border-gray-100"
            aria-label="Back to Audit"
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </Link>
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 tracking-[0.1em] uppercase">{nomenclature}</span>
              {statusBadge}
            </div>
            <input
              name="title"
              value={title || ''}
              onChange={handleChange}
              disabled={isLocked}
              className="bg-transparent border-none focus:ring-0 text-3xl font-black text-gray-900 placeholder:text-gray-200 p-0 w-full disabled:cursor-not-allowed"
              placeholder="Untitled Procedure"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {!isLocked && (
            <>
              {saving ? (
                <div className="flex items-center space-x-2 mr-4">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Auto-Saving...</span>
                </div>
              ) : hasUnsavedChanges ? (
                <div className="flex items-center space-x-2 mr-4">
                  <Clock className="w-4 h-4 text-orange-400 animate-pulse" />
                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Unsaved Changes</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mr-4 opacity-50">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Saved</span>
                </div>
              )}
              
              <button 
                onClick={() => handleSave()} 
                disabled={saving || !hasUnsavedChanges}
                className={`flex items-center space-x-3 px-8 py-4 text-sm font-black rounded-2xl transition-all active:scale-95 border uppercase tracking-widest ${
                  hasUnsavedChanges 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-200 hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                }`}
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Manual'}</span>
              </button>
            </>
          )}
          
          {isLocked && (
             <div className="flex items-center space-x-3 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400">
               <Lock className="w-5 h-5" />
               <span className="text-xs font-black uppercase tracking-widest">Locked</span>
             </div>
          )}
          
          {canDelete && (
            <button 
              onClick={handleDelete} 
              className="p-4 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-red-100"
              title="Delete Procedure"
              aria-label="Delete Procedure"
            >
              <Trash2 className="w-6 h-6" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
