'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, Mail, Briefcase, User, Loader2, AlertCircle, Search } from 'lucide-react';

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
  initialTeamMembers: any[],
  user?: { username: string; role: string; id: string }
}) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [creating, setCreating] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const isBusinessOps = user?.role === 'Business Operations';

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
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  // Sync state if props change
  useEffect(() => {
    setTeamMembers(initialTeamMembers);
  }, [initialTeamMembers]);

  const handleAddMember = async () => {
    if (!isBusinessOps) return;
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
    } catch (err: any) {
      console.error('Add member error:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateMember = (id: string, updates: Partial<TeamMember>) => {
    if (!isBusinessOps) return;
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleSaveMember = async (memberId: string, manualMember?: TeamMember) => {
    if (!isBusinessOps) return;
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
    } catch (err: any) {
      console.error('Save member error:', err);
      setError('Failed to save team member details.');
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!isBusinessOps) return;
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
    } catch (err: any) {
      console.error('Delete member error:', err);
      setError(err.message);
    }
  };

  const handleUserSelect = (memberId: string, username: string) => {
    if (!isBusinessOps) return;
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
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Audit Team</h3>
          <p className="text-xs text-gray-500 mt-1">Assign users to give them access to this audit.</p>
        </div>
        {isBusinessOps && (
          <button
            onClick={handleAddMember}
            disabled={creating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm font-bold"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {teamMembers.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">No team members assigned yet.</p>
            <p className="text-gray-400 text-sm mt-1">{isBusinessOps ? 'Click the button above to start building your team.' : 'Team members will appear here once assigned.'}</p>
          </div>
        ) : (
          teamMembers.map((member) => (
            <div key={member.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all group animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                    <Mail className="w-3 h-3 mr-1" /> {isBusinessOps ? 'Select User' : 'User'}
                  </label>
                  {isBusinessOps ? (
                    <select
                      value={member.email || ''}
                      onChange={(e) => handleUserSelect(member.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all text-gray-800 appearance-none font-medium"
                    >
                      <option value="">Choose a System User...</option>
                      {systemUsers.map(u => (
                        <option key={u.id} value={u.username}>
                          {u.username} ({u.role})
                        </option>
                      ))}
                      <option value="custom">-- Custom / Other --</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-gray-700 font-medium">
                      {member.email || 'No email specified'}
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                    <User className="w-3 h-3 mr-1" /> Display Name
                  </label>
                  {isBusinessOps ? (
                    <input
                      value={member.name || ''}
                      onChange={(e) => handleUpdateMember(member.id, { name: e.target.value })}
                      onBlur={() => handleSaveMember(member.id)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all text-gray-800 font-semibold"
                      placeholder="Full Name"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-gray-700 font-semibold">
                      {member.name || 'Anonymous Member'}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                    <Briefcase className="w-3 h-3 mr-1" /> Audit Role
                  </label>
                  <div className="flex space-x-2">
                    {isBusinessOps ? (
                      <select
                        value={member.role || ''}
                        onChange={(e) => {
                          const newRole = e.target.value;
                          handleUpdateMember(member.id, { role: newRole });
                          // Trigger save immediately for select
                          const memberToSave = teamMembers.find(m => m.id === member.id);
                          if (memberToSave) {
                            handleSaveMember(member.id, { ...memberToSave, role: newRole });
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all text-gray-800 appearance-none"
                      >
                        <option value="">Select Role</option>
                        <option value="Audit Director">Audit Director</option>
                        <option value="Audit Partner">Audit Partner</option>
                        <option value="Audit Manager">Audit Manager</option>
                        <option value="Lead Auditor">Lead Auditor</option>
                        <option value="Senior Auditor">Senior Auditor</option>
                        <option value="Staff Auditor">Staff Auditor</option>
                        <option value="Specialist">Specialist</option>
                        <option value="Quality Reviewer">Quality Reviewer</option>
                      </select>
                    ) : (
                      <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-gray-700">
                        {member.role || 'Not assigned'}
                      </div>
                    )}
                    
                    {isBusinessOps && (
                      <button
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Member"
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
