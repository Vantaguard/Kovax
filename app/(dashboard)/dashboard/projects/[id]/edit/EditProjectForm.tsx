'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProjectSchema } from '@/lib/validations';
import { useToast } from '@/components/ui/ToastProvider';
import { updateExistingProject } from '@/app/(dashboard)/dashboard/projects/actions';
import Link from 'next/link';

export default function EditProjectForm({ project }: { project: any }) {
  const router = useRouter();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name || '',
    description: project.description || '',
    status: project.status || 'active',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      const validatedData = updateProjectSchema.parse(formData);
      
      // Call server action
      const res = await updateExistingProject(project.id, validatedData);
      
      if (res.success) {
        toast.success('Project updated successfully!');
        router.push(`/dashboard/projects/${project.id}`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update project');
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
          Project Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
        >
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Description
        </label>
        <textarea
          rows={5}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none"
        />
      </div>

      <div className="pt-4 flex justify-end gap-4 border-t border-slate-700/50">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="px-6 py-3 bg-slate-700/50 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors border border-slate-600/50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || !formData.name}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
