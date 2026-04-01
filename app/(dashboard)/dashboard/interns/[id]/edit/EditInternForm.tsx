'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateInternSchema } from '@/lib/validations';
import { useToast } from '@/components/ui/ToastProvider';
import { updateExistingIntern } from '@/app/(dashboard)/dashboard/interns/actions';
import Link from 'next/link';

export default function EditInternForm({ 
  intern, 
  departments 
}: { 
  intern: any;
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: intern.status || 'draft',
    department_id: intern.user?.department_id || '',
    tenure_start: intern.tenure_start ? new Date(intern.tenure_start).toISOString().split('T')[0] : '',
    tenure_end: intern.tenure_end ? new Date(intern.tenure_end).toISOString().split('T')[0] : '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      const validatedData = updateInternSchema.parse({
        ...formData,
        department_id: formData.department_id,
        tenure_start: formData.tenure_start ? new Date(formData.tenure_start).toISOString() : undefined,
        tenure_end: formData.tenure_end ? new Date(formData.tenure_end).toISOString() : undefined,
      });
      
      // Call server action
      const res = await updateExistingIntern(intern.id, validatedData);
      
      if (res.success) {
        toast.success('Intern profile updated successfully!');
        router.push(`/dashboard/interns/${intern.id}`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update intern');
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
          Email (Read-only)
        </label>
        <input
          type="text"
          disabled
          value={intern.user?.email || 'N/A'}
          className="w-full px-4 py-3 bg-slate-900/30 border border-slate-700/30 rounded-xl text-slate-500 cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Department <span className="text-red-400">*</span>
        </label>
        <select
          required
          value={formData.department_id}
          onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
        >
          <option value="">Select a department...</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
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
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tenure Start
          </label>
          <input
            type="date"
            value={formData.tenure_start}
            onChange={(e) => setFormData({ ...formData, tenure_start: e.target.value })}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tenure End
          </label>
          <input
            type="date"
            value={formData.tenure_end}
            onChange={(e) => setFormData({ ...formData, tenure_end: e.target.value })}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-4 border-t border-slate-700/50">
        <Link
          href={`/dashboard/interns/${intern.id}`}
          className="px-6 py-3 bg-slate-700/50 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors border border-slate-600/50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || !formData.department_id}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
