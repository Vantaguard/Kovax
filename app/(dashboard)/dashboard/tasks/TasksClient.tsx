'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppConfig } from '@/contexts/AppConfigContext';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface TasksClientProps {
  initialTasks: any[];
  initialPagination: any;
  initialStats: any;
  initialPage: number;
  initialQuery: string;
  initialStatus: string;
  initialPriority: string;
}

export default function TasksClient({
  initialTasks,
  initialPagination,
  initialStats,
  initialPage,
  initialQuery,
  initialStatus,
  initialPriority,
}: TasksClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [status, setStatus] = useState<TaskStatus | ''>(initialStatus as TaskStatus | '');
  const [priority, setPriority] = useState<TaskPriority | ''>(initialPriority as TaskPriority | '');
  const { ui } = useAppConfig();
  const showStats = ui?.showStats ?? true;

  const tasks = initialTasks;
  const pagination = initialPagination;
  const stats = initialStats;
  const page = initialPage;

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('query', searchQuery);
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    params.set('page', '1');
    router.push(`/dashboard/tasks?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('query', searchQuery);
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    params.set('page', newPage.toString());
    router.push(`/dashboard/tasks?${params.toString()}`);
  };

  const handleFilterChange = (filterType: 'status' | 'priority', value: string) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('query', searchQuery);
    
    if (filterType === 'status') {
      setStatus(value as TaskStatus | '');
      if (value) params.set('status', value);
      if (priority) params.set('priority', priority);
    } else {
      setPriority(value as TaskPriority | '');
      if (status) params.set('status', status);
      if (value) params.set('priority', value);
    }
    
    params.set('page', '1');
    router.push(`/dashboard/tasks?${params.toString()}`);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'blocked':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-600/20 text-slate-300 border-slate-500/30';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-300 border border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-300 border border-green-500/30';
      default:
        return 'bg-slate-600/20 text-slate-300 border border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Tasks Management</h2>
          <p className="text-slate-400 mt-1">Track and manage all your tasks</p>
        </div>
        <Link
          href="/dashboard/tasks/create"
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300"
        >
          + Create Task
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Search by Title
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by task title..."
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-amber-500 text-slate-900 font-semibold rounded-xl hover:bg-amber-600 transition-all whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                <span className="text-xl">📝</span>
              </div>
              <h3 className="text-sm font-medium text-slate-400">Total</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/30">
                <span className="text-xl">⏳</span>
              </div>
              <h3 className="text-sm font-medium text-slate-400">Pending</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{stats.by_status.pending}</p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                <span className="text-xl">🔄</span>
              </div>
              <h3 className="text-sm font-medium text-slate-400">In Progress</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{stats.by_status.in_progress}</p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                <span className="text-xl">✓</span>
              </div>
              <h3 className="text-sm font-medium text-slate-400">Completed</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{stats.by_status.completed}</p>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-slate-700/50 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-2xl font-bold text-white mb-4">No Tasks Found</h3>
          <p className="text-slate-400 mb-8">
            {searchQuery || status || priority
              ? 'No tasks match your search criteria. Try adjusting your filters.'
              : 'No tasks have been created yet. Create your first task to get started.'}
          </p>
          <Link
            href="/dashboard/tasks/create"
            className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300"
          >
            + Create First Task
          </Link>
        </div>
      ) : (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              All Tasks {pagination && `(${pagination.total} total)`}
            </h3>
            {pagination && (
              <span className="text-sm text-slate-400">
                Showing {((page - 1) * pagination.limit) + 1} - {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-slate-400 mt-1 line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {task.project?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                          task.status
                        )}`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPriorityBadgeColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                      {task.assigned_user?.email || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {task.deadline ? formatDate(task.deadline) : 'No deadline'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/tasks/${task.id}`}
                        className="text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between">
              <button
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
                className="px-4 py-2 bg-slate-900/50 text-white font-medium rounded-xl hover:bg-slate-700/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-slate-700/50"
              >
                ← Previous
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">
                  Page {page} of {pagination.totalPages}
                </span>
              </div>
              <button
                disabled={page === pagination.totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="px-4 py-2 bg-slate-900/50 text-white font-medium rounded-xl hover:bg-slate-700/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-slate-700/50"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
