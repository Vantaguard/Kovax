'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { setUserStatus, getOrgUsersForAdmin } from './user-actions';

interface OrgUser {
  id: string;
  email: string;
  status: string;
  role: { name: string } | { name: string }[] | null;
  created_at: string;
  updated_at: string;
}

type StatusFilter = 'all' | 'draft' | 'active' | 'inactive';

export default function AdminUserManagement() {
  const toast = useToast();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const loadUsers = async () => {
    setLoading(true);
    const result = await getOrgUsersForAdmin();
    if (result.success) {
      setUsers(result.data as OrgUser[]);
    } else {
      toast.error(result.error || 'Failed to load users');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (userId: string, newStatus: 'draft' | 'active' | 'inactive', email: string) => {
    const actionLabel = newStatus === 'active' ? 'Approve' : newStatus === 'draft' ? 'Revoke' : 'Disable';
    setActionLoading(userId);
    try {
      const result = await setUserStatus(userId, newStatus);
      if (result.success) {
        toast.success(`${actionLabel} successful for ${email}`);
        await loadUsers();
      } else {
        toast.error(result.error || `Failed to ${actionLabel.toLowerCase()} user`);
      }
    } catch {
      toast.error('An unexpected error occurred.');
    }
    setActionLoading(null);
  };

  const getRoleName = (role: OrgUser['role']): string => {
    if (!role) return 'No Role';
    if (Array.isArray(role)) return role[0]?.name?.replace('_', ' ') || 'No Role';
    return role.name?.replace('_', ' ') || 'No Role';
  };

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.status === filter);

  const statusCounts = {
    all: users.length,
    draft: users.filter(u => u.status === 'draft').length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'draft':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'inactive':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-600/20 text-slate-300 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">👥</span>
          User Lifecycle Management
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          Approve, revoke, or disable user accounts. Only active users can sign in.
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'draft', 'active', 'inactive'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              filter === f
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({statusCounts[f]})
          </button>
        ))}
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="bg-slate-800/60 rounded-2xl p-8 border border-slate-700/50 text-center">
          <p className="text-slate-400">No users found with status: {filter}</p>
        </div>
      ) : (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.map((user) => {
                  const roleName = getRoleName(user.role);
                  const isAdmin = roleName === 'super admin' || roleName === 'org admin';
                  const isActionLoading = actionLoading === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-slate-900 text-sm font-bold">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-200">{user.email}</div>
                            <div className="text-xs text-slate-500">{user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-300 capitalize">{roleName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin ? (
                          <span className="text-xs text-slate-500 italic">Admin (protected)</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {user.status !== 'active' && (
                              <button
                                onClick={() => handleStatusChange(user.id, 'active', user.email)}
                                disabled={isActionLoading}
                                className="px-3 py-1.5 bg-green-500/20 text-green-300 text-xs font-medium rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-all disabled:opacity-50"
                              >
                                {isActionLoading ? '...' : '✓ Approve'}
                              </button>
                            )}
                            {user.status === 'active' && (
                              <button
                                onClick={() => handleStatusChange(user.id, 'draft', user.email)}
                                disabled={isActionLoading}
                                className="px-3 py-1.5 bg-amber-500/20 text-amber-300 text-xs font-medium rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-all disabled:opacity-50"
                              >
                                {isActionLoading ? '...' : '↩ Revoke'}
                              </button>
                            )}
                            {user.status !== 'inactive' && (
                              <button
                                onClick={() => handleStatusChange(user.id, 'inactive', user.email)}
                                disabled={isActionLoading}
                                className="px-3 py-1.5 bg-red-500/20 text-red-300 text-xs font-medium rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
                              >
                                {isActionLoading ? '...' : '✕ Disable'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
