'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProjectSchema } from '@/lib/validations';
import { useToast } from '@/components/ui/ToastProvider';
import { createNewProject } from '@/app/(dashboard)/dashboard/projects/actions';
import Link from 'next/link';

export default function CreateProjectPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      const validatedData = createProjectSchema.parse(formData);
      
      // Call server action
      const res = await createNewProject(validatedData);
      
      if (res.success) {
        toast.success('Project created successfully!');
        router.push('/dashboard/projects');
      } else {
        toast.error(res.error || 'Failed to create project');
      }
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || 'Validation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/projects"
          className="p-2 bg-slate-800/60 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700/50"
        >
          ←
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-white">Create New Project</h2>
          <p className="text-slate-400 mt-1">Add a new project to your organization</p>
        </div>
      </div>

      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-700/50">
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
              placeholder="e.g. Website Redesign"
            />
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
              placeholder="Brief description of the project goals..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-4 border-t border-slate-700/50">
            <Link
              href="/dashboard/projects"
              className="px-6 py-3 bg-slate-700/50 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors border border-slate-600/50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
