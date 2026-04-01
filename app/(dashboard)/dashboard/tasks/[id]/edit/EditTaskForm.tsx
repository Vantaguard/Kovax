'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateTaskSchema } from '@/lib/validations';
import { useToast } from '@/components/ui/ToastProvider';
import { updateExistingTask } from '@/app/(dashboard)/dashboard/tasks/actions';
import Link from 'next/link';

export default function EditTaskForm({ task, projects, interns }: { task: any, projects: any[], interns: any[] }) {
  const router = useRouter();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    project_id: task.project_id || '',
    assigned_to: task.assigned_to || '',
    status: task.status || 'pending',
    priority: task.priority || 'medium',
    deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      const validatedData = updateTaskSchema.parse({
        ...formData,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
      });
      
      // Call server action
      const res = await updateExistingTask(task.id, validatedData);
      
      if (res.success) {
        toast.success('Task updated successfully!');
        router.push(`/dashboard/tasks/${task.id}`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update task');
      }
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || 'Validation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Project
          </label>
          <select
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
          >
            <option value="">Select Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Assigned To
          </label>
          <select
            value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
          >
            <option value="">Unassigned</option>
            {interns.map((i) => (
              <option key={i.user_id} value={i.user_id}>{i.user?.email}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
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

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Description
        </label>
        <textarea
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none"
        />
      </div>

      <div className="pt-4 flex justify-end gap-4 border-t border-slate-700/50">
        <Link
          href={`/dashboard/tasks/${task.id}`}
          className="px-6 py-3 bg-slate-700/50 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors border border-slate-600/50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || !formData.title}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
