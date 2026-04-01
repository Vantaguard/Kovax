'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDateTime } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: any;
  created_at: string;
  user: {
    id: string;
    email: string;
  } | null;
}

export default function ActivityPage() {
  const { user } = useUser();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL('/api/activity', window.location.origin);
      if (filter) {
        url.searchParams.append('entity_type', filter);
      }
      const response = await fetch(url.toString());
      if (response.ok) {
        const result = await response.json();
        setLogs(result.data || []);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
    setPage(1);
  }, [fetchLogs]);

  const totalPages = Math.ceil(logs.length / limit);
  const paginatedLogs = logs.slice((page - 1) * limit, page * limit);

  const getActionIcon = (action: string) => {
    if (action.includes('created')) return '➕';
    if (action.includes('updated')) return '✏️';
    if (action.includes('deleted')) return '🗑️';
    if (action.includes('approved')) return '✅';
    if (action.includes('rejected')) return '❌';
    if (action.includes('login')) return '🔐';
    return '📝';
  };

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'text-green-400';
    if (action.includes('updated')) return 'text-blue-400';
    if (action.includes('deleted')) return 'text-red-400';
    if (action.includes('approved')) return 'text-green-400';
    if (action.includes('rejected')) return 'text-red-400';
    return 'text-slate-400';
  };

  const renderActionText = (log: ActivityLog) => {
    // If we have specific metadata to make the log richer
    const actionBase = log.action.split('.').pop()?.replace(/_/g, ' ') || log.action;
    switch(log.action) {
      case 'user.login': return 'User logged in to the system';
      case 'user.logout': return 'User logged out of the system';
      case 'intern_profile.created': return `Created intern profile (${log.metadata?.status || 'draft'})`;
      case 'intern_profile.updated': return `Updated intern profile fields: ${log.metadata?.updated_fields?.join(', ') || 'multiple'}`;
      case 'project.created': return `Created project "${log.metadata?.name || 'Unknown'}"`;
      case 'task.created': return `Created task "${log.metadata?.title || 'Unknown'}"`;
      case 'task.status_updated': return `Updated task status`;
      case 'task.assigned': return `Assigned task to user`;
      default: return `Performed action: ${actionBase}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Activity Log</h2>
          <p className="text-slate-400 mt-1">Track all actions and changes in your organization</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Filter by Action
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            >
              <option value="">All Actions</option>
              <option value="intern_profile">Intern Actions</option>
              <option value="project">Project Actions</option>
              <option value="task">Task Actions</option>
              <option value="user">User Actions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-slate-700/50 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-400 mt-4">Loading activity logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-slate-700/50 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-2xl font-bold text-white mb-4">No Activity Yet</h3>
          <p className="text-slate-400">
            Activity logs will appear here as actions are performed in the system.
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {paginatedLogs.map((log) => (
              <div key={log.id} className="px-6 py-4 hover:bg-slate-700/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-slate-900/50 rounded-lg flex items-center justify-center">
                    <span className="text-xl">{getActionIcon(log.action)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${getActionColor(log.action)}`}>
                      {renderActionText(log)}
                    </p>
                    <p className="text-sm text-slate-300 mt-1">
                      by {log.user?.email || 'Unknown User'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm bg-slate-700 text-white rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm bg-slate-700 text-white rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
