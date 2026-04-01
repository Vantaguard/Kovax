'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import { createNewIntern } from '@/app/(dashboard)/dashboard/interns/actions';
import Link from 'next/link';

export default function CreateInternForm({ 
  availableUsers, 
  departments 
}: { 
  availableUsers: any[];
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    department_id: '',
    status: 'draft',
    tenure_start: '',
    tenure_end: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id) {
      return toast.warning('Please select a system user to convert into an intern profile.');
    }
    if (!formData.department_id) {
      return toast.warning('Please select a department for the intern.');
    }

    setLoading(true);

    try {
      const payload = {
        user_id: formData.user_id,
        department_id: formData.department_id,
        status: formData.status as any,
        tenure_start: formData.tenure_start ? new Date(formData.tenure_start).toISOString() : undefined,
        tenure_end: formData.tenure_end ? new Date(formData.tenure_end).toISOString() : undefined,
      };

      const res = await createNewIntern(payload);

      if (res.success) {
        toast.success('Intern profile created successfully!');
        router.push('/dashboard/interns');
      } else {
        toast.error(res.error || 'Failed to create intern profile');
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
          href="/dashboard/interns"
          className="p-2 bg-slate-800/60 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700/50"
        >
          ←
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-white">Create Intern Profile</h2>
          <p className="text-slate-400 mt-1">Convert an existing system user into an intern record</p>
        </div>
      </div>

      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-700/50">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                User Account <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              >
                <option value="">Select an available user...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
              {availableUsers.length === 0 && (
                <p className="text-sm text-amber-400 mt-2">
                  No unassigned users found. You must create a new user account first in the Admin panel.
                </p>
              )}
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
                Initial Profile Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              >
                <option value="draft">Draft - Pending Approval</option>
                <option value="active">Active - Approved</option>
                <option value="inactive">Inactive - Disabled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tenure Start Date
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
                Tenure End Date (Expected)
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
              href="/dashboard/interns"
              className="px-6 py-3 bg-slate-700/50 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors border border-slate-600/50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.user_id || !formData.department_id}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating...' : 'Create Intern Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
