'use client';

import { useState, useEffect, useRef } from 'react';
import { UserPlus, Trash2, Shield, Loader2, AlertCircle, Users, FileUp, Download, KeyRound } from 'lucide-react';
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
      // Fetch session first to know the role
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
      setSuccess(`User ${data.username} created successfully. They will be prompted to change their password on first login.`);
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
          
          setSuccess(`Import complete: ${data.created} users created, ${data.skipped} skipped. All new users must change their password on first login.`);
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

  const exportUsersToCSV = () => {
    if (users.length === 0) return;
    
    // Header
    const headers = ["username", "role", "mustChangePassword", "createdAt"];
    
    // Data rows
    const rows = users.map(user => [
      user.username,
      user.role,
      user.mustChangePassword ? "Yes" : "No",
      new Date(user.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_directory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const csvContent = "username,role,password\nuser1@company.com,Auditor,Welcome123!\nadmin1@company.com,IT Administrator,Welcome123!";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!isAdmin) return;
    if (id === currentUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      setUsers(users.filter(u => u.id !== id));
      setSuccess(`User ${username} deleted.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-900 p-2 rounded-lg shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Directory</h1>
            <p className="text-sm text-gray-500 font-medium">View system access and roles</p>
          </div>
        </div>
        
        {isAdmin && (
          <div className="flex items-center space-x-3">
            <button
              onClick={exportUsersToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              title="Export Current Directory"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Directory</span>
            </button>
            <button
              onClick={downloadTemplate}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium border border-gray-200"
              title="Download Import Template"
            >
              <FileUp className="w-3 h-3" />
              <span className="hidden sm:inline">Template</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium border border-indigo-100"
            >
              <FileUp className="w-4 h-4" />
              <span>Import CSV</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".csv"
              />
            </button>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAdding ? 'Cancel' : 'Add User'}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3 text-green-700 animate-in fade-in slide-in-from-top-2">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-white" />
          </div>
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {isAdmin && isAdding && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Username / Email</label>
              <input
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white"
                placeholder="e.g. j.doe@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Initial Password</label>
              <input
                required
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-gray-50 focus:bg-white"
              >
                <option value="Auditor">Auditor</option>
                <option value="Specialist">Specialist</option>
                <option value="Audit Manager">Audit Manager</option>
                <option value="Audit Director">Audit Director</option>
                <option value="Audit Partner">Audit Partner</option>
                <option value="Business Operations">Business Operations</option>
                <option value="IT Administrator">IT Administrator</option>
              </select>
            </div>
            <button
              disabled={submitting}
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold transition-colors h-[42px]"
            >
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Account Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Created</th>
              {isAdmin && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-700 font-bold border border-blue-200 group-hover:bg-blue-200 transition-colors">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{user.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    user.role === 'IT Administrator' ? 'bg-purple-50 text-purple-700' : 
                    user.role === 'Business Operations' ? 'bg-indigo-50 text-indigo-700' :
                    (user.role === 'Audit Manager' || user.role === 'Audit Director' || user.role === 'Audit Partner') ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {user.mustChangePassword ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-tighter rounded-md border border-amber-100 animate-pulse">
                      <KeyRound className="w-3 h-3" />
                      <span>Must Change Password</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Verified</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 tabular-nums">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center space-x-2 text-xs text-gray-400 italic bg-gray-100/50 p-3 rounded-lg border border-dashed border-gray-200">
        <Users className="w-3 h-3" />
        <span>User passwords are securely hashed using bcrypt at rest. {isAdmin ? 'You have administrative access to manage users.' : 'Only IT administrators can manage system users.'}</span>
      </div>
    </div>
  );
}
