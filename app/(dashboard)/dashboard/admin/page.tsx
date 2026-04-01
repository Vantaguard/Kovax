'use client';

import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import Link from 'next/link';
import AdminFeatureToggles from './AdminFeatureToggles';
import AdminUserManagement from './AdminUserManagement';
import { useToast } from '@/components/ui/ToastProvider';

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const { organization, stats } = useOrganization();
  const toast = useToast();

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-slate-700/50">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-1/4"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
        <p className="text-slate-400 mt-1">Manage your organization and system settings</p>
      </div>

      {/* Organization Overview */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-xl p-8 text-slate-900">
        <h3 className="text-2xl font-bold mb-2">{organization?.name}</h3>
        <p className="text-slate-800">Organization ID: {organization?.id}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <span className="text-xl">👥</span>
            </div>
            <h3 className="text-sm font-medium text-slate-400">Total Users</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
              <span className="text-xl">🏗️</span>
            </div>
            <h3 className="text-sm font-medium text-slate-400">Total Projects</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalProjects}</p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
              <span className="text-xl">✓</span>
            </div>
            <h3 className="text-sm font-medium text-slate-400">Total Tasks</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalTasks}</p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/30">
              <span className="text-xl">🎓</span>
            </div>
            <h3 className="text-sm font-medium text-slate-400">Total Interns</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalInterns}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/admin/config"
          className="block bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50 hover:border-amber-500/30 transition-all"
        >
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            Configuration & branding
          </h3>
          <p className="text-slate-400 text-sm">App name, theme colors — all from the database.</p>
        </Link>
        <Link
          href="/dashboard/admin/permissions"
          className="block bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50 hover:border-amber-500/30 transition-all"
        >
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-2xl">🔐</span>
            Permissions matrix
          </h3>
          <p className="text-slate-400 text-sm">Dynamic role → permission assignments.</p>
        </Link>
        <Link
          href="/dashboard/admin/data-lifecycle"
          className="block bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50 hover:border-amber-500/30 transition-all"
        >
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-2xl">🗄️</span>
            Data lifecycle
          </h3>
          <p className="text-slate-400 text-sm">Restore deleted records, retention policies, expired data.</p>
        </Link>
      </div>

      <AdminFeatureToggles />

      {/* User Lifecycle Management */}
      <AdminUserManagement />

      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">👥</span>
            User Management
          </h3>
          <div className="space-y-2">
            <Link
              href="/dashboard/interns"
              className="block w-full px-4 py-2 bg-slate-900/50 text-amber-400 font-medium rounded-xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-sm border border-slate-700/50 text-center"
            >
              View All Organization Users
            </Link>
            <Link
              href="/register"
              target="_blank"
              className="block w-full px-4 py-2 bg-slate-900/50 text-blue-400 font-medium rounded-xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all text-sm border border-slate-700/50 text-center"
            >
              Create New Staff Account (Register)
            </Link>
            <Link
              href="/dashboard/interns/create"
              className="block w-full px-4 py-2 bg-slate-900/50 text-green-400 font-medium rounded-xl hover:bg-green-500/10 hover:border-green-500/30 transition-all text-sm border border-slate-700/50 text-center"
            >
              Promote User to Intern Profile
            </Link>
            <Link
              href="/dashboard/admin/permissions"
              className="block w-full px-4 py-2 bg-slate-900/50 text-slate-300 font-medium rounded-xl hover:bg-slate-700/30 hover:border-slate-600/30 transition-all text-sm border border-slate-700/50 text-center"
            >
              Manage Roles & Permissions
            </Link>
          </div>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            Organization Settings
          </h3>
          <div className="space-y-2">
            <Link
              href="/dashboard/admin/config"
              className="block w-full px-4 py-2 bg-slate-900/50 text-amber-400 font-medium rounded-xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-sm border border-slate-700/50 text-center"
            >
              Edit Organization
            </Link>
            <button
              onClick={() => toast.info('Department management is configured in the database.')}
              className="w-full px-4 py-2 bg-slate-900/50 text-slate-300 font-medium rounded-xl hover:bg-slate-700/30 hover:border-slate-600/30 transition-all text-sm border border-slate-700/50"
            >
              Manage Departments
            </button>
            <Link
              href="/dashboard/activity"
              className="block w-full px-4 py-2 bg-slate-900/50 text-slate-300 font-medium rounded-xl hover:bg-slate-700/30 hover:border-slate-600/30 transition-all text-sm border border-slate-700/50 text-center"
            >
              View Activity Logs
            </Link>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          System Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-400">Organization</label>
            <p className="text-lg text-white mt-1">{organization?.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-400">Status</label>
            <p className="text-lg text-white mt-1">{organization?.status}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-400">Your Role</label>
            <p className="text-lg text-white mt-1">{user?.role?.name.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
