import { User, ChevronDown, CheckCircle } from 'lucide-react';
import type { TeamMember } from '@prisma/client';
import { toast } from 'sonner';

function OwnerAssignment({
  assignedToId,
  isLocked,
  teamMembers,
  user,
  handleAssignment,
}: {
  assignedToId: string;
  isLocked: boolean;
  teamMembers: TeamMember[];
  user?: { username: string; role: string; id: string };
  handleAssignment: (newId: string | null) => void;
}) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-xl flex items-center space-x-5">
      <div className="bg-blue-50 p-4 rounded-2xl">
        <User className="w-6 h-6 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Owner Assignment</label>
        <div className="flex flex-col space-y-3">
          <div className="relative group">
            <select
              value={assignedToId || ''}
              onChange={(e) => handleAssignment(e.target.value || null)}
              disabled={isLocked}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all appearance-none cursor-pointer shadow-inner disabled:cursor-not-allowed"
              aria-label="Assign Owner"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
          </div>

          {/* Quick Assign to Me shortcut */}
          {user && !isLocked && !teamMembers.find(m => m.id === assignedToId && m.userId === user.id) && (
            <button
              onClick={() => {
                const myMember = teamMembers.find(m => m.userId === user.id || m.email === user.username);
                if (myMember) {
                  handleAssignment(myMember.id);
                } else {
                  toast.error("You must be added as a Team Member to this audit before you can take ownership.");
                }
              }}
              className="w-fit px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest active:scale-95"
            >
              Take Ownership
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusOverview({
  isReviewed,
  isPrepared,
}: {
  isReviewed: boolean;
  isPrepared: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-xl flex items-center space-x-5">
      <div className="bg-emerald-50 p-4 rounded-2xl">
        <CheckCircle className="w-6 h-6 text-emerald-600" />
      </div>
      <div className="flex-1">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Overview</label>
        <div className="text-lg font-bold text-gray-900">
          {isReviewed ? 'Review Complete' : isPrepared ? 'Ready for Review' : 'Work in Progress'}
        </div>
      </div>
    </div>
  );
}

export function ProcedureOwner({
  assignedToId,
  isLocked,
  isReviewed,
  isPrepared,
  teamMembers,
  user,
  handleAssignment,
}: {
  assignedToId: string;
  isLocked: boolean;
  isReviewed: boolean;
  isPrepared: boolean;
  teamMembers: TeamMember[];
  user?: { username: string; role: string; id: string };
  handleAssignment: (newId: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <OwnerAssignment
        assignedToId={assignedToId}
        isLocked={isLocked}
        teamMembers={teamMembers}
        user={user}
        handleAssignment={handleAssignment}
      />
      <StatusOverview isReviewed={isReviewed} isPrepared={isPrepared} />
    </div>
  );
}
