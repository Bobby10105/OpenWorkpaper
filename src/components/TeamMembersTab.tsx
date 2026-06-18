'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, Mail, Briefcase, User, Loader2, AlertCircle, ChevronDown } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  userId?: string | null;
}

interface SystemUser {
  id: string;
  username: string;
  role: string;
}

export default function TeamMembersTab({ 
  auditId, 
  initialTeamMembers,
  user
}: { 
  auditId: string, 
  initialTeamMembers: TeamMember[],
  user?: { username: string; role: string; id: string }
}) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Relaxed permissions: Any role except Specialist can manage the team
  const canManageTeam = user && user.role !== 'Specialist';

  // Fetch system users on mount
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setSystemUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch system users:', err);
      }
    }
    fetchUsers();
  }, []);

  // Sync state if props change
  useEffect(() => {
    setTeamMembers(initialTeamMembers);
  }, [initialTeamMembers]);

  const handleAddMember = async () => {
    if (!canManageTeam) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId }),
      });
      
      if (res.ok) {
        const newMember = await res.json();
        setTeamMembers(prev => [...prev, newMember]);
        router.refresh();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add team member');
      }
    } catch (err: unknown) {
      console.error('Add member error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add team member');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateMember = (id: string, updates: Partial<TeamMember>) => {
    if (!canManageTeam) return;
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleSaveMember = async (memberId: string, manualMember?: TeamMember) => {
    if (!canManageTeam) return;
    const member = manualMember || teamMembers.find(m => m.id === memberId);
    if (!member) return;

    try {
      const res = await fetch(`/api/team-members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      });
      if (!res.ok) {
        throw new Error('Failed to save changes');
      }
      router.refresh();
    } catch (err: unknown) {
      console.error('Save member error:', err);
      setError('Failed to save team member details.');
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!canManageTeam) return;
    if (!confirm(`Are you sure you want to remove "${name || 'this member'}"?`)) return;
    setError('');
    try {
      const res = await fetch(`/api/team-members/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => m.id !== id));
        router.refresh();
      } else {
        throw new Error('Failed to remove team member');
      }
    } catch (err: unknown) {
      console.error('Delete member error:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove team member');
    }
  };

  const handleUserSelect = (memberId: string, username: string) => {
    if (!canManageTeam) return;
    const selectedUser = systemUsers.find(u => u.username === username);
    if (!selectedUser) {
      handleUpdateMember(memberId, { email: username });
      return;
    }

    const updates = {
      email: selectedUser.username,
      name: selectedUser.username, // Default name to username if not otherwise specified
      userId: selectedUser.id
    };

    handleUpdateMember(memberId, updates);
    
    // Trigger save immediately
    const member = teamMembers.find(m => m.id === memberId);
    if (member) {
      handleSaveMember(memberId, { ...member, ...updates });
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Audit Engagement Team</h3>
          <p className="text-gray-500 text-sm mt-1">Manage personnel access and responsibility levels.</p>
        </div>
        {canManageTeam && (
          <button
            onClick={handleAddMember}
            disabled={creating}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-200 font-bold text-sm active:scale-95 border border-blue-500"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            <span>Provision Seat</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-[2rem] flex items-center space-x-4 text-red-600 animate-shake">
          <div className="bg-red-100 p-2 rounded-xl">
            <AlertCircle className="w-6 h-6 shrink-0" />
          </div>
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {teamMembers.length === 0 ? (
          <div className="text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-200 shadow-inner">
              <User className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-900 font-bold text-xl tracking-tight">Team Unassigned</p>
            <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
              {canManageTeam 
                ? 'Building a team is the first step toward collaborative execution. Provision a seat to begin.' 
                : 'Team members will appear here once the engagement manager assigns them.'}
            </p>
          </div>
        ) : (
          teamMembers.map((member) => (
            <div key={member.id} className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-xl hover:shadow-gray-200/50 transition-all group/member animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center px-1">
                    <Mail className="w-3.5 h-3.5 mr-2 text-blue-500" /> {canManageTeam ? 'Identity Mapping' : 'System ID'}
                  </label>
                  {canManageTeam ? (
                    <div className="relative group/select">
                      <select
                        value={member.userId ? systemUsers.find(u => u.id === member.userId)?.username || member.email || '' : member.email || ''}
                        onChange={(e) => handleUserSelect(member.id, e.target.value)}
                        className="w-full pl-5 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-gray-900 appearance-none font-semibold text-sm outline-none shadow-inner"
                      >
                        <option value="">Link System User...</option>
                        {systemUsers.map(u => (
                          <option key={u.id} value={u.username}>
                            {u.username} ({u.role})
                          </option>
                        ))}
                        <option value="custom">-- Custom Reference --</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 font-semibold text-sm shadow-inner">
                      {member.email || 'Unlinked'}
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center px-1">
                    <User className="w-3.5 h-3.5 mr-2 text-blue-500" /> Engagement Name
                  </label>
                  {canManageTeam ? (
                    <input
                      value={member.name || ''}
                      onChange={(e) => handleUpdateMember(member.id, { name: e.target.value })}
                      onBlur={() => handleSaveMember(member.id)}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-gray-900 font-bold text-sm outline-none shadow-inner"
                      placeholder="Enter Full Name"
                    />
                  ) : (
                    <div className="px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold text-sm shadow-inner">
                      {member.name || 'External Specialist'}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center px-1">
                    <Briefcase className="w-3.5 h-3.5 mr-2 text-blue-500" /> Functional Responsibility
                  </label>
                  <div className="flex space-x-3">
                    {canManageTeam ? (
                      <div className="relative flex-1 group/select">
                        <select
                          value={member.role || ''}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            handleUpdateMember(member.id, { role: newRole });
                            const memberToSave = teamMembers.find(m => m.id === member.id);
                            if (memberToSave) {
                              handleSaveMember(member.id, { ...memberToSave, role: newRole });
                            }
                          }}
                          className="w-full pl-5 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-gray-900 appearance-none font-semibold text-sm outline-none shadow-inner"
                        >
                          <option value="">Select Title</option>
                          <option value="Audit Director">Audit Director</option>
                          <option value="Audit Partner">Audit Partner</option>
                          <option value="Audit Manager">Audit Manager</option>
                          <option value="Lead Auditor">Lead Auditor</option>
                          <option value="Senior Auditor">Senior Auditor</option>
                          <option value="Staff Auditor">Staff Auditor</option>
                          <option value="Specialist">Specialist</option>
                          <option value="Quality Reviewer">Quality Reviewer</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 font-semibold text-sm shadow-inner">
                        {member.role || 'General Staff'}
                      </div>
                    )}
                    
                    {canManageTeam && (
                      <button
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        className="p-3.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-red-200 shadow-sm"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
