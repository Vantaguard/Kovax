'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppConfig } from '@/contexts/AppConfigContext';

type InternStatus = 'draft' | 'pending' | 'active' | 'inactive' | 'approved' | 'rejected' | 'completed';

interface InternsClientProps {
  initialInterns: any[];
  initialPagination: any;
  initialStats: any;
  initialPage: number;
  initialQuery: string;
  initialStatus: string;
}

export default function InternsClient({
  initialInterns,
  initialPagination,
  initialStats,
  initialPage,
  initialQuery,
  initialStatus,
}: InternsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [status, setStatus] = useState<InternStatus | ''>(initialStatus as InternStatus | '');
  const { ui } = useAppConfig();
  const showStats = ui?.showStats ?? true;

  const interns = initialInterns;
  const pagination = initialPagination;
  const stats = initialStats;
  const page = initialPage;

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('query', searchQuery);
    if (status) params.set('status', status);
    params.set('page', '1');
    router.push(`/dashboard/interns?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('query', searchQuery);
    if (status) params.set('status', status);
    params.set('page', newPage.toString());
    router.push(`/dashboard/interns?${params.toString()}`);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'rejected':
      case 'inactive':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'draft':
        return 'bg-slate-600/20 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-600/20 text-slate-300 border-slate-500/30';
    }
  };

  const getUserStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'inactive':
        return 'bg-slate-600/20 text-slate-300 border border-slate-500/30';
      case 'suspended':
        return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default:
        return 'bg-slate-600/20 text-slate-300 border border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Interns Management</h2>
          <p className="text-slate-400 mt-1">Manage and track your intern programs</p>
        </div>
        <Link
          href="/dashboard/interns/create"
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300"
        >
          + Add Intern
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Search by Email
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by email..."
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            />
          </div>
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Filter by Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as InternStatus | '');
                const params = new URLSearchParams();
                if (searchQuery) params.set('query', searchQuery);
                if (e.target.value) params.set('status', e.target.value);
                params.set('page', '1');
                router.push(`/dashboard/interns?${params.toString()}`);
              }}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft (Pending Approval)</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-amber-500 text-slate-900 font-semibold rounded-xl hover:bg-amber-600 transition-all"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                <span className="text-xl">👥</span>
              </div>
              <h3 className="text-sm font-medium text-slate-400">Total</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                <span className="text-xl">✅</span>
              </div>
              <h3 className="text-sm font-medium text-slate-400">Active</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{stats.active}</p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/30">
                <span className="text-xl">⏳</span>
              </div>
              <h3 className="text-sm font-medium text-slate-400">Pending</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                <span className="text-xl">🎓</span>
              </div>
              <h3 className="text-sm font-medium text-slate-400">Completed</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{stats.completed}</p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                <span className="text-xl">✓</span>
              </div>
              <h3 className="text-sm font-medium text-slate-400">Approved</h3>
            </div>
            <p className="text-3xl font-bold text-purple-400">{stats.approved}</p>
          </div>
        </div>
      )}

      {/* Interns List */}
      {interns.length === 0 ? (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-slate-700/50 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-2xl font-bold text-white mb-4">No Interns Found</h3>
          <p className="text-slate-400 mb-8">
            {searchQuery || status
              ? 'No interns match your search criteria. Try adjusting your filters.'
              : 'No intern profiles have been created yet. Add your first intern to get started.'}
          </p>
          <Link
            href="/dashboard/interns/create"
            className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300"
          >
            + Add First Intern
          </Link>
        </div>
      ) : (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              All Interns {pagination && `(${pagination.total} total)`}
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
                    Intern
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Tenure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {interns.map((intern) => (
                  <tr key={intern.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-slate-900 text-sm font-bold">
                            {intern.user?.email?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-200">
                            {intern.user?.email || 'Unknown User'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getUserStatusBadgeColor(intern.user?.status || 'inactive')}`}>
                              {intern.user?.status || 'inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(intern.status)}`}>
                        {intern.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {intern.department?.name || 'Not Assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {intern.tenure_start && intern.tenure_end ? (
                        <div>
                          <div>{formatDate(intern.tenure_start)}</div>
                          <div className="text-xs text-slate-500">to {formatDate(intern.tenure_end)}</div>
                        </div>
                      ) : (
                        'Not Set'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDate(intern.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/interns/${intern.id}`}
                          className="text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          View
                        </Link>
                      </div>
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
