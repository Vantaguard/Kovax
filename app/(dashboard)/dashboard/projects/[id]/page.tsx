import { getProjectById, getProjectTasks } from '@/services/project.service.v2';
import { formatDate } from '@/lib/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProjectQuickActions from '@/app/(dashboard)/dashboard/projects/[id]/ProjectQuickActions';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, tasks] = await Promise.all([
    getProjectById(id),
    getProjectTasks(id),
  ]);

  if (!project) {
    notFound();
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'on_hold':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getTaskStatusBadgeColor = (status: string) => {
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

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter((t: any) => t.status === 'pending').length,
    in_progress: tasks.filter((t: any) => t.status === 'in_progress').length,
    completed: tasks.filter((t: any) => t.status === 'completed').length,
    blocked: tasks.filter((t: any) => t.status === 'blocked').length,
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard" className="hover:text-amber-400 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/projects" className="hover:text-amber-400 transition-colors">
          Projects
        </Link>
        <span>/</span>
        <span className="text-white font-medium">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Project Details</h2>
          <p className="text-slate-300 mt-1">View and manage project information</p>
        </div>
        <Link
          href="/dashboard/projects"
          className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl hover:bg-slate-700/30 hover:border-amber-500/30 transition-all"
        >
          ← Back to List
        </Link>
      </div>

      {/* Project Header Card */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-xl p-8 text-slate-900">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-slate-900/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-slate-900/30">
            <span className="text-4xl">🏗️</span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">{project.name}</h3>
            {project.description && (
              <p className="text-slate-800 mb-3">{project.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-3 py-1 backdrop-blur-sm rounded-full text-sm font-medium border ${
                  project.status === 'active'
                    ? 'bg-green-500/20 text-green-900 border-green-900/30'
                    : project.status === 'completed'
                    ? 'bg-blue-500/20 text-blue-900 border-blue-900/30'
                    : 'bg-slate-500/20 text-slate-900 border-slate-900/30'
                }`}
              >
                {project.status.replace('_', ' ')}
              </span>
              <span className="px-3 py-1 bg-slate-900/20 backdrop-blur-sm text-slate-900 rounded-full text-sm font-medium border border-slate-900/30">
                {project.task_count} tasks
              </span>
              <span className="px-3 py-1 bg-slate-900/20 backdrop-blur-sm text-slate-900 rounded-full text-sm font-medium border border-slate-900/30">
                {project.member_count} members
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Statistics */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Task Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                <div className="text-2xl font-bold text-white">{taskStats.total}</div>
                <div className="text-sm text-slate-400 mt-1">Total</div>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-400">
                  {taskStats.pending}
                </div>
                <div className="text-sm text-slate-400 mt-1">Pending</div>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-400">
                  {taskStats.in_progress}
                </div>
                <div className="text-sm text-slate-400 mt-1">In Progress</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="text-2xl font-bold text-green-400">
                  {taskStats.completed}
                </div>
                <div className="text-sm text-slate-400 mt-1">Completed</div>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                <div className="text-2xl font-bold text-red-400">{taskStats.blocked}</div>
                <div className="text-sm text-slate-400 mt-1">Blocked</div>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Project Tasks ({tasks.length})
              </h3>
              <Link 
                href="/dashboard/tasks/create"
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-amber-500/20 transition-all"
              >
                + Add Task
              </Link>
            </div>

            {tasks.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h4 className="text-xl font-bold text-white mb-2">No Tasks Yet</h4>
                <p className="text-slate-400 mb-6">
                  Create your first task to get started with this project.
                </p>
                <Link 
                  href="/dashboard/tasks/create"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300"
                >
                  + Create First Task
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Task
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
                    {tasks.map((task: any) => (
                      <tr key={task.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-sm text-slate-400 mt-1 line-clamp-1">
                                {task.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getTaskStatusBadgeColor(
                              task.status
                            )}`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getPriorityBadgeColor(
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
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-4">Project Info</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Project ID</label>
                <p className="text-xs font-mono text-slate-200 mt-1 bg-slate-900/50 px-2 py-1 rounded">
                  {project.id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Status</label>
                <div className="mt-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(
                      project.status
                    )}`}
                  >
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Created By</label>
                <p className="text-sm text-white mt-1">
                  {project.creator?.email || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Created</label>
                <p className="text-sm text-slate-200 mt-1">
                  {formatDate(project.created_at)}
                </p>
              </div>
              {project.updated_at && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Last Updated</label>
                  <p className="text-sm text-slate-200 mt-1">
                    {formatDate(project.updated_at)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <ProjectQuickActions projectId={project.id} currentStatus={project.status} />
        </div>
      </div>
    </div>
  );
}
