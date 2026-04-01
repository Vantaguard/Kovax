'use client';

import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import Link from 'next/link';
import { useState, useEffect, useTransition } from 'react';
import DynamicProfileForm from '@/components/dashboard/DynamicProfileForm';
import { saveDynamicProfileValues } from '@/app/(dashboard)/dashboard/interns/actions';

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser();
  const { organization, stats, loading: orgLoading } = useOrganization();
  const toast = useToast();

  const loading = userLoading || orgLoading;

  // Dynamic profile fields state
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [fieldsLoading, setFieldsLoading] = useState(true);

  // Load dynamic profile fields for the current user
  useEffect(() => {
    async function loadFields() {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/profile-fields?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setDynamicFields(data.fields || []);
          setProfileId(data.profileId || null);
        }
      } catch (error) {
        console.error('Error loading profile fields:', error);
      } finally {
        setFieldsLoading(false);
      }
    }
    loadFields();
  }, [user?.id]);

  const handleSaveFields = async (
    pid: string,
    values: Record<string, string | null>
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await saveDynamicProfileValues(pid, values);
    if (result.success) {
      toast.success('Profile fields saved successfully');
    }
    return result;
  };

  const getRoleBadgeColor = (roleName: string | undefined) => {
    switch (roleName) {
      case 'super_admin':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'org_admin':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'mentor':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'intern':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getStatusBadgeColor = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'inactive':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'suspended':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  if (loading) {
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

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-slate-700/50 text-center">
          <p className="text-slate-300">Unable to load profile. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-white">My Profile</h2>
        <p className="text-slate-300 mt-1">View and manage your account information</p>
      </div>

      {/* Profile Header Card */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-xl p-8 text-slate-900">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-slate-900/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-slate-900/30">
            <span className="text-4xl font-bold text-slate-900">
              {user.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">{user.email}</h3>
            <div className="flex flex-wrap gap-2">
              {user.role && (
                <span className="px-3 py-1 bg-slate-900/20 backdrop-blur-sm text-slate-900 rounded-full text-sm font-medium border border-slate-900/30">
                  {user.role.name.replace('_', ' ')}
                </span>
              )}
              <span className={`px-3 py-1 backdrop-blur-sm rounded-full text-sm font-medium border ${
                user.status === 'active' 
                  ? 'bg-green-500/20 text-green-900 border-green-900/30' 
                  : 'bg-slate-500/20 text-slate-900 border-slate-900/30'
              }`}>
                {user.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dynamic Profile Fields (DB-driven) */}
          {!fieldsLoading && profileId && dynamicFields.length > 0 && (
            <DynamicProfileForm
              fields={dynamicFields}
              profileId={profileId}
              onSave={handleSaveFields}
            />
          )}

          {/* Organization Information */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🏢</span>
              Organization Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Organization Name</label>
                <p className="text-lg font-semibold text-white mt-1">
                  {organization?.name || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Organization Slug</label>
                <p className="text-lg font-mono text-slate-200 mt-1">
                  {organization?.slug || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Organization Status</label>
                <div className="mt-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(organization?.status)}`}>
                    {organization?.status || 'N/A'}
                  </span>
                </div>
              </div>
              {organization?.created_at && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Member Since</label>
                  <p className="text-lg text-white mt-1">
                    {formatDate(organization.created_at)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Role & Permissions */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🔐</span>
              Role & Permissions
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Current Role</label>
                <div className="mt-1">
                  <span className={`inline-block px-4 py-2 rounded-xl text-base font-semibold border ${getRoleBadgeColor(user.role?.name)}`}>
                    {user.role?.name.replace('_', ' ') || 'No role assigned'}
                  </span>
                </div>
              </div>
              {user.role && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Role Description</label>
                  <p className="text-slate-200 mt-1">
                    {user.role.name === 'super_admin' && 'Full system access with all permissions'}
                    {user.role.name === 'org_admin' && 'Organization administrator with management permissions'}
                    {user.role.name === 'mentor' && 'Mentor role with guidance and evaluation permissions'}
                    {user.role.name === 'intern' && 'Intern role with basic access permissions'}
                  </p>
                </div>
              )}
              {user.department && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Department</label>
                  <p className="text-lg font-semibold text-white mt-1">
                    {user.department.name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Account Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">User ID</label>
                <p className="text-sm font-mono text-slate-200 mt-1 bg-slate-900/50 px-3 py-2 rounded-lg">
                  {user.id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Email Address</label>
                <p className="text-lg text-white mt-1">
                  {user.email}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Account Status</label>
                <div className="mt-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(user.status)}`}>
                    {user.status}
                  </span>
                </div>
              </div>
              {user.last_login && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Last Login</label>
                  <p className="text-slate-200 mt-1">
                    {formatDateTime(user.last_login)}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-400">Account Created</label>
                <p className="text-slate-200 mt-1">
                  {formatDate(user.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Organization Stats */}
        <div className="space-y-6">
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Organization Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">👥</span>
                  </div>
                  <span className="text-sm font-medium text-slate-300">Total Users</span>
                </div>
                <span className="text-2xl font-bold text-blue-400">{stats.totalUsers}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🏗️</span>
                  </div>
                  <span className="text-sm font-medium text-slate-300">Total Projects</span>
                </div>
                <span className="text-2xl font-bold text-purple-400">{stats.totalProjects}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">✓</span>
                  </div>
                  <span className="text-sm font-medium text-slate-300">Total Tasks</span>
                </div>
                <span className="text-2xl font-bold text-green-400">{stats.totalTasks}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🎓</span>
                  </div>
                  <span className="text-sm font-medium text-slate-300">Total Interns</span>
                </div>
                <span className="text-2xl font-bold text-yellow-400">{stats.totalInterns}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => toast.warning('Password reset is handled via email. Check your inbox.')}
                className="w-full px-4 py-2 bg-slate-900/50 text-amber-400 font-medium rounded-xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-sm border border-slate-700/50"
              >
                Change Password
              </button>
              <Link
                href="/dashboard/activity"
                className="block w-full px-4 py-2 bg-slate-900/50 text-slate-300 font-medium rounded-xl hover:bg-slate-700/30 hover:border-slate-600/30 transition-all text-sm border border-slate-700/50 text-center"
              >
                View Activity Log
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
