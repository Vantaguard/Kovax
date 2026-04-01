import { getTaskById } from '@/services/task.service.v2';
import { formatDate, formatDateTime } from '@/lib/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import TaskQuickActions from '@/app/(dashboard)/dashboard/tasks/[id]/TaskQuickActions';

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getTaskById(id);

  if (!task) {
    notFound();
  }

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
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
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
        <Link href="/dashboard/tasks" className="hover:text-amber-400 transition-colors">
          Tasks
        </Link>
        <span>/</span>
        <span className="text-white font-medium">{task.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Task Details</h2>
          <p className="text-slate-300 mt-1">View and manage task information</p>
        </div>
        <Link
          href="/dashboard/tasks"
          className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl hover:bg-slate-700/30 hover:border-amber-500/30 transition-all"
        >
          ← Back to List
        </Link>
      </div>

      {/* Task Header Card */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-xl p-8 text-slate-900">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-slate-900/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-slate-900/30">
            <span className="text-4xl">✓</span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">{task.title}</h3>
            {task.description && (
              <p className="text-slate-800 mb-3">{task.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-3 py-1 backdrop-blur-sm rounded-full text-sm font-medium border ${
                  task.status === 'completed'
                    ? 'bg-green-500/20 text-green-900 border-green-900/30'
                    : task.status === 'in_progress'
                    ? 'bg-blue-500/20 text-blue-900 border-blue-900/30'
                    : 'bg-slate-500/20 text-slate-900 border-slate-900/30'
                }`}
              >
                {task.status.replace('_', ' ')}
              </span>
              <span
                className={`px-3 py-1 backdrop-blur-sm rounded-full text-sm font-medium border ${
                  task.priority === 'urgent'
                    ? 'bg-red-500/20 text-red-900 border-red-900/30'
                    : task.priority === 'high'
                    ? 'bg-orange-500/20 text-orange-900 border-orange-900/30'
                    : 'bg-slate-900/20 text-slate-900 border-slate-900/30'
                }`}
              >
                {task.priority} priority
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Task Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Task ID</label>
                <p className="text-sm font-mono text-slate-200 mt-1 bg-slate-900/50 px-3 py-2 rounded-lg">
                  {task.id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Title</label>
                <p className="text-lg text-white mt-1">{task.title}</p>
              </div>
              {task.description && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Description</label>
                  <p className="text-slate-200 mt-1 whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Project & Assignment */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🏗️</span>
              Project & Assignment
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Project</label>
                {task.project ? (
                  <Link
                    href={`/dashboard/projects/${task.project.id}`}
                    className="text-lg text-amber-400 hover:text-amber-300 mt-1 block transition-colors"
                  >
                    {task.project.name} →
                  </Link>
                ) : (
                  <p className="text-lg text-white mt-1">N/A</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Assigned To</label>
                <p className="text-lg text-white mt-1">
                  {task.assigned_user?.email || 'Unassigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Status & Priority */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Status & Priority
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Status</label>
                <div className="mt-1">
                  <span
                    className={`inline-block px-4 py-2 rounded-xl text-base font-semibold border ${getStatusBadgeColor(
                      task.status
                    )}`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Priority</label>
                <div className="mt-1">
                  <span
                    className={`inline-block px-4 py-2 rounded-xl text-base font-semibold border ${getPriorityBadgeColor(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
              {task.deadline && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Deadline</label>
                  <p className="text-lg text-white mt-1">{formatDate(task.deadline)}</p>
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
                <label className="text-sm font-medium text-slate-400">Created</label>
                <p className="text-slate-200 mt-1">{formatDateTime(task.created_at)}</p>
              </div>
              {task.updated_at && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Last Updated</label>
                  <p className="text-slate-200 mt-1">{formatDateTime(task.updated_at)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <TaskQuickActions taskId={task.id} currentStatus={task.status} currentPriority={task.priority} />

          {/* Status Guide */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-4">Status Guide</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 border-yellow-500/30 rounded text-xs font-medium border">
                  pending
                </span>
                <span className="text-sm text-slate-400">Not started</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 border-blue-500/30 rounded text-xs font-medium border">
                  in progress
                </span>
                <span className="text-sm text-slate-400">Being worked on</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-500/20 text-green-300 border-green-500/30 rounded text-xs font-medium border">
                  completed
                </span>
                <span className="text-sm text-slate-400">Finished</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-red-500/20 text-red-300 border-red-500/30 rounded text-xs font-medium border">
                  blocked
                </span>
                <span className="text-sm text-slate-400">Cannot proceed</span>
              </div>
            </div>
          </div>

          {/* Priority Guide */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-4">Priority Levels</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-red-500/20 text-red-300 border-red-500/30 rounded text-xs font-medium border">
                  urgent
                </span>
                <span className="text-sm text-slate-400">Immediate action</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-orange-500/20 text-orange-300 border-orange-500/30 rounded text-xs font-medium border">
                  high
                </span>
                <span className="text-sm text-slate-400">Important</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 border-yellow-500/30 rounded text-xs font-medium border">
                  medium
                </span>
                <span className="text-sm text-slate-400">Normal priority</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-500/20 text-green-300 border-green-500/30 rounded text-xs font-medium border">
                  low
                </span>
                <span className="text-sm text-slate-400">Can wait</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
