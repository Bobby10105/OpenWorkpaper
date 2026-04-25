'use client';

import { useState, useEffect, useRef } from 'react';
import { UserPlus, Trash2, Shield, Loader2, AlertCircle, Users, FileUp, Download, KeyRound, User as UserIcon, Mail, Briefcase, ChevronDown, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

interface User {
  id: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string, role: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'Auditor' });
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchSessionAndUsers();
  }, []);

  const fetchSessionAndUsers = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setCurrentUser(sessionData.user);
      }

      const res = await fetch('/api/users');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError('Failed to load user directory.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'IT Administrator';

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Failed to add user');
      }
      
      setUsers([data, ...users]);
      setIsAdding(false);
      setFormData({ username: '', password: '', role: 'Auditor' });
      setSuccess(`User ${data.username} created successfully.`);
    } catch (err: any) {
      setError(err.message);
      console.error('User creation error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch('/api/users/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: results.data }),
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Bulk import failed');
          
          setSuccess(`Import complete: ${data.created} users created.`);
          fetchSessionAndUsers();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setSubmitting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        setError(`CSV Parse Error: ${err.message}`);
        setSubmitting(false);
      }
    });
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to revoke access for "${username}"?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        setSuccess(`User ${username} removed successfully.`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-none flex items-center">
            <Users className="w-8 h-8 mr-4 text-blue-600 shadow-lg shadow-blue-100" />
            User Directory
          </h1>
          <p className="text-slate-500 font-medium">Manage enterprise-wide access, identities, and functional roles.</p>
        </div>
        
        {isAdmin && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-5 py-2.5 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 active:scale-95 text-sm font-bold uppercase tracking-tight"
            >
              <FileUp className="w-4 h-4 text-blue-600" />
              <span>Bulk Import</span>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
            </button>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 font-bold text-sm active:scale-95 border border-blue-400/20"
            >
              {isAdding ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              <span>{isAdding ? 'Cancel' : 'Provision User'}</span>
            </button>
          </div>
        )}
      </div>

      {(error || success) && (
        <div className="space-y-4">
          {error && (
            <div className="p-5 bg-red-50 border border-red-200 rounded-[2rem] flex items-center space-x-4 text-red-600 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-[2rem] flex items-center space-x-4 text-emerald-600 animate-in fade-in">
              <Shield className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">{success}</p>
            </div>
          )}
        </div>
      )}

      {isAdmin && isAdding && (
        <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 p-8 shadow-2xl animate-in fade-in slide-in-from-top-6 duration-500 overflow-hidden">
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Identity Mapping</label>
              <div className="relative group/input">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-blue-600 transition-colors" />
                <input
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-slate-900 font-semibold outline-none shadow-inner"
                  placeholder="j.doe@company.com"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Security Token</label>
              <div className="relative group/input">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-blue-600 transition-colors" />
                <input
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-slate-900 font-semibold outline-none shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Access Tier</label>
              <div className="relative group/select">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/select:text-blue-600 transition-colors" />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-slate-900 appearance-none font-semibold text-sm outline-none shadow-inner"
                >
                  <option value="Auditor">Auditor</option>
                  <option value="Specialist">Specialist</option>
                  <option value="Audit Manager">Audit Manager</option>
                  <option value="Audit Director">Audit Director</option>
                  <option value="Audit Partner">Audit Partner</option>
                  <option value="Business Operations">Business Operations</option>
                  <option value="IT Administrator">IT Administrator</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <button
              disabled={submitting}
              type="submit"
              className="w-full py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 disabled:opacity-50 font-bold transition-all shadow-xl shadow-blue-600/20 active:scale-95 border border-blue-400/20"
            >
              {submitting ? 'Provisioning...' : 'Provision User'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Identity</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Access tier</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Created</th>
                {isAdmin && <th className="px-8 py-5 text-right"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-sm text-blue-600 font-bold border border-blue-200 group-hover:scale-110 transition-transform">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-base font-semibold text-slate-900">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      user.role === 'IT Administrator' ? 'bg-purple-50 text-purple-600 border-purple-200' : 
                      user.role === 'Business Operations' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                      'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-center">
                    {user.mustChangePassword ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-bold uppercase tracking-widest rounded-full border border-amber-200 animate-pulse">
                        <KeyRound className="w-3 h-3" />
                        <span>Reset Required</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified</span>
                    )}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm text-slate-500 font-mono">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      {user.id !== currentUser?.id ? (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="p-2.5 text-slate-400 hover:text-red-600 transition-all rounded-xl hover:bg-red-50 active:scale-90"
                          title="Revoke Account"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 italic">Current Session</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pt-4">
        <Shield className="w-3 h-3" />
        <span>Enterprise Identity Protocol • Secure Hash Protection</span>
      </div>
    </div>
  );
}
