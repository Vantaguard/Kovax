'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDateTime } from '@/lib/utils';
import { SkeletonLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/ErrorMessage';
import Link from 'next/link';

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

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { stats, loading: statsLoading } = useOrganization();

  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const fetchRecentActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      const res = await fetch('/api/activity?limit=5');
      if (res.ok) {
        const result = await res.json();
        setRecentActivity(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity]);

  const loading = userLoading || statsLoading;

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
    if (action.includes('created')) return 'green';
    if (action.includes('updated')) return 'blue';
    if (action.includes('deleted')) return 'red';
    if (action.includes('approved')) return 'green';
    if (action.includes('rejected')) return 'red';
    return 'amber';
  };

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return formatDateTime(dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl border border-slate-700/50">
        <h2 className="text-3xl font-bold mb-2">Welcome back! 👋</h2>
        {loading ? (
          <SkeletonLoader className="w-48 h-6" />
        ) : (
          <p className="text-slate-300">
            Logged in as: <span className="font-semibold text-amber-400">{user?.email}</span>
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50 hover:shadow-2xl hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <span className="text-2xl">👥</span>
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">Total Users</h3>
          {loading ? (
            <SkeletonLoader className="w-16 h-8" />
          ) : (
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          )}
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50 hover:shadow-2xl hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
              <span className="text-2xl">🏗️</span>
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">Total Projects</h3>
          {loading ? (
            <SkeletonLoader className="w-16 h-8" />
          ) : (
            <p className="text-3xl font-bold text-white">{stats.totalProjects}</p>
          )}
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50 hover:shadow-2xl hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center border border-green-500/30">
              <span className="text-2xl">✓</span>
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">Total Tasks</h3>
          {loading ? (
            <SkeletonLoader className="w-16 h-8" />
          ) : (
            <p className="text-3xl font-bold text-white">{stats.totalTasks}</p>
          )}
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50 hover:shadow-2xl hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/30">
              <span className="text-2xl">🎓</span>
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">Total Interns</h3>
          {loading ? (
            <SkeletonLoader className="w-16 h-8" />
          ) : (
            <p className="text-3xl font-bold text-white">{stats.totalInterns}</p>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity — Real Data */}
        <div className="lg:col-span-2 bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
            <Link
              href="/dashboard/activity"
              className="text-sm text-amber-400 hover:text-amber-300 font-medium"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {activityLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-slate-700/30">
                  <SkeletonLoader className="w-10 h-10 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <SkeletonLoader className="w-3/4 h-4" />
                    <SkeletonLoader className="w-1/3 h-3" />
                  </div>
                </div>
              ))
            ) : recentActivity.length === 0 ? (
              <EmptyState 
                title="No activity recorded yet"
                description="Actions will appear here as they occur."
                icon="📋"
              />
            ) : (
              recentActivity.map((activity) => {
                const color = getActionColor(activity.action);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-700/30 transition-colors border border-slate-700/30"
                  >
                    <div className={`w-10 h-10 bg-${color}-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-${color}-500/30`}>
                      <span className="text-lg">{getActionIcon(activity.action)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 font-medium">
                        {activity.action.replace(/\./g, ' ').replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        by {activity.user?.email || 'System'} · {getRelativeTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions — Wired Up */}
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
          <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/interns/create"
              className="block w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-medium rounded-xl hover:shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300 text-center"
            >
              + Add New Intern
            </Link>
            <Link
              href="/dashboard/projects/create"
              className="block w-full px-4 py-3 bg-slate-700/60 border-2 border-blue-500/30 text-blue-300 font-medium rounded-xl hover:bg-slate-700 transition-colors text-center"
            >
              + Create Project
            </Link>
            <Link
              href="/dashboard/tasks/create"
              className="block w-full px-4 py-3 bg-slate-700/60 border-2 border-purple-500/30 text-purple-300 font-medium rounded-xl hover:bg-slate-700 transition-colors text-center"
            >
              + Create Task
            </Link>
            <Link
              href="/dashboard/activity"
              className="block w-full px-4 py-3 bg-slate-700/60 border-2 border-slate-600/50 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-colors text-center"
            >
              📊 View Activity
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
