'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import { createNewTask } from '@/app/(dashboard)/dashboard/tasks/actions';
import Link from 'next/link';

export default function CreateTaskForm({ 
  projects, 
  interns,
  initialProjectId
}: { 
  projects: any[]; 
  interns: any[];
  initialProjectId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: initialProjectId || '',
    assigned_to: '',
    priority: 'medium',
    status: 'pending',
    deadline: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id) {
      return toast.warning('Please select a project');
    }

    setLoading(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        project_id: formData.project_id,
        assigned_to: formData.assigned_to || null,
        priority: formData.priority,
        status: formData.status,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
      };

      const res = await createNewTask(payload as any);

      if (res.success) {
        toast.success('Task created successfully!');
        router.push('/dashboard/tasks');
      } else {
        toast.error(res.error || 'Failed to create task');
      }
    } catch (error: any) {
      toast.error(error.message || 'Validation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/tasks"
          className="p-2 bg-slate-800/60 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700/50"
        >
          ←
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-white">Create New Task</h2>
          <p className="text-slate-400 mt-1">Assign a new task to a project</p>
        </div>
      </div>

      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-700/50">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Task Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                placeholder="e.g. Design UI mockups"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Project <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Assign To
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              >
                <option value="">Unassigned</option>
                {interns.map((i) => {
                  const name = i.user?.email || 'Unknown';
                  return (
                    <option key={i.user_id} value={i.user_id}>{name}</option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Initial Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none"
              placeholder="Detailed description of the task..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-4 border-t border-slate-700/50">
            <Link
              href="/dashboard/tasks"
              className="px-6 py-3 bg-slate-700/50 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors border border-slate-600/50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.title || !formData.project_id}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
