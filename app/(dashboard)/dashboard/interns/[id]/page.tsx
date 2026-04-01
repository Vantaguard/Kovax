import { getInternById } from '@/services/intern.service.v2';
import { getProfileValues } from '@/services/dynamic-form.service';
import { formatDate, formatDateTime } from '@/lib/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import InternQuickActions from '@/app/(dashboard)/dashboard/interns/[id]/InternQuickActions';
import InternDynamicFields from '@/app/(dashboard)/dashboard/interns/[id]/InternDynamicFields';

export default async function InternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const intern = await getInternById(id);

  if (!intern) {
    notFound();
  }

  // Load dynamic profile fields
  let dynamicFields: any[] = [];
  try {
    dynamicFields = await getProfileValues(intern.id);
  } catch (error) {
    console.error('Error loading dynamic fields:', error);
  }

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
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getUserStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'inactive':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'suspended':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard" className="hover:text-amber-400 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/interns" className="hover:text-amber-400 transition-colors">
          Interns
        </Link>
        <span>/</span>
        <span className="text-white font-medium">
          {intern.user?.email || 'Intern Details'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Intern Profile</h2>
          <p className="text-slate-300 mt-1">View and manage intern information</p>
        </div>
        <Link
          href="/dashboard/interns"
          className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl hover:bg-slate-700/30 hover:border-amber-500/30 transition-all"
        >
          ← Back to List
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-xl p-8 text-slate-900">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-slate-900/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-slate-900/30">
            <span className="text-4xl font-bold text-slate-900">
              {intern.user?.email?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">
              {intern.user?.email || 'Unknown User'}
            </h3>
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-3 py-1 backdrop-blur-sm rounded-full text-sm font-medium border ${
                  intern.status === 'active' || intern.status === 'approved'
                    ? 'bg-green-500/20 text-green-900 border-green-900/30'
                    : intern.status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-900 border-yellow-900/30'
                    : 'bg-slate-500/20 text-slate-900 border-slate-900/30'
                }`}
              >
                {intern.status}
              </span>
              {intern.user && (
                <span
                  className={`px-3 py-1 backdrop-blur-sm rounded-full text-sm font-medium border ${
                    intern.user.status === 'active'
                      ? 'bg-green-500/20 text-green-900 border-green-900/30'
                      : 'bg-slate-500/20 text-slate-900 border-slate-900/30'
                  }`}
                >
                  User: {intern.user.status}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dynamic Profile Fields — DB-driven, not hardcoded */}
          {dynamicFields.length > 0 && (
            <InternDynamicFields
              fields={dynamicFields}
              profileId={intern.id}
            />
          )}

          {/* Basic Information */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">
                  Intern Profile ID
                </label>
                <p className="text-sm font-mono text-slate-200 mt-1 bg-slate-900/50 px-3 py-2 rounded-lg">
                  {intern.id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">User ID</label>
                <p className="text-sm font-mono text-slate-200 mt-1 bg-slate-900/50 px-3 py-2 rounded-lg">
                  {intern.user_id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Email</label>
                <p className="text-lg text-white mt-1">
                  {intern.user?.email || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">
                  Department
                </label>
                <p className="text-lg text-white mt-1">
                  {intern.department?.name || 'Not Assigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Status Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">
                  Intern Status
                </label>
                <div className="mt-1">
                  <span
                    className={`inline-block px-4 py-2 rounded-xl text-base font-semibold border ${getStatusBadgeColor(
                      intern.status
                    )}`}
                  >
                    {intern.status}
                  </span>
                </div>
              </div>
              {intern.user && (
                <div>
                  <label className="text-sm font-medium text-slate-400">
                    User Account Status
                  </label>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getUserStatusBadgeColor(
                        intern.user.status
                      )}`}
                    >
                      {intern.user.status}
                    </span>
                  </div>
                </div>
              )}
              {intern.approved_by_user && (
                <div>
                  <label className="text-sm font-medium text-slate-400">
                    Approved By
                  </label>
                  <p className="text-lg text-white mt-1">
                    {intern.approved_by_user.email}
                  </p>
                </div>
              )}
              {intern.approved_at && (
                <div>
                  <label className="text-sm font-medium text-slate-400">
                    Approved At
                  </label>
                  <p className="text-slate-200 mt-1">
                    {formatDateTime(intern.approved_at)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tenure Information */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Tenure Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">
                  Tenure Start Date
                </label>
                <p className="text-lg text-white mt-1">
                  {intern.tenure_start ? formatDate(intern.tenure_start) : 'Not Set'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">
                  Tenure End Date
                </label>
                <p className="text-lg text-white mt-1">
                  {intern.tenure_end ? formatDate(intern.tenure_end) : 'Not Set'}
                </p>
              </div>
              {intern.tenure_start && intern.tenure_end && (
                <div>
                  <label className="text-sm font-medium text-slate-400">
                    Duration
                  </label>
                  <p className="text-lg text-white mt-1">
                    {Math.ceil(
                      (new Date(intern.tenure_end).getTime() -
                        new Date(intern.tenure_start).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{' '}
                    days
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🕐</span>
              Timestamps
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">
                  Profile Created
                </label>
                <p className="text-slate-200 mt-1">
                  {formatDateTime(intern.created_at)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">
                  Last Updated
                </label>
                <p className="text-slate-200 mt-1">
                  {formatDateTime(intern.updated_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Quick Actions */}
        <div className="space-y-6">
          <InternQuickActions internId={intern.id} currentStatus={intern.status} />

          {/* Status Legend */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-4">Status Guide</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-500/20 text-slate-300 border-slate-500/30 rounded text-xs font-medium border">
                  draft
                </span>
                <span className="text-sm text-slate-400">Initial state</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 border-yellow-500/30 rounded text-xs font-medium border">
                  pending
                </span>
                <span className="text-sm text-slate-400">Awaiting approval</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-500/20 text-green-300 border-green-500/30 rounded text-xs font-medium border">
                  active
                </span>
                <span className="text-sm text-slate-400">Currently active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 border-blue-500/30 rounded text-xs font-medium border">
                  completed
                </span>
                <span className="text-sm text-slate-400">Tenure finished</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-red-500/20 text-red-300 border-red-500/30 rounded text-xs font-medium border">
                  inactive
                </span>
                <span className="text-sm text-slate-400">No longer active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
