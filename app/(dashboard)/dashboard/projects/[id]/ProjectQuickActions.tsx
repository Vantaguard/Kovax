'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import { updateExistingProject, deleteExistingProject } from '../actions';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';

interface ProjectQuickActionsProps {
  projectId: string;
  currentStatus: string;
}

export default function ProjectQuickActions({ projectId, currentStatus }: ProjectQuickActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      const res = await updateExistingProject(projectId, { status: newStatus as any });
      if (res.success) {
        toast.success('Project status updated successfully');
        setIsStatusOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update project status');
      }
    } catch (error: any) {
      toast.error('Unexpected error updating project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await deleteExistingProject(projectId);
      if (res.success) {
        toast.success('Project deleted successfully');
        router.push('/dashboard/projects');
      } else {
        toast.error(res.error || 'Failed to delete project');
      }
    } catch (error: any) {
      toast.error('Unexpected error deleting project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
        <div className="space-y-2">
          <button 
            onClick={() => setIsStatusOpen(true)}
            className="w-full px-4 py-2 bg-slate-900/50 text-amber-400 font-medium rounded-xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-sm border border-slate-700/50"
          >
            Update Project Status
          </button>
          <Link 
            href={`/dashboard/projects/${projectId}/edit`}
            className="block w-full px-4 py-2 bg-slate-900/50 text-amber-400 text-center font-medium rounded-xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-sm border border-slate-700/50"
          >
            Edit Project Details
          </Link>
          <button 
            onClick={() => setIsDeleteOpen(true)}
            className="w-full px-4 py-2 bg-slate-900/50 text-red-400 font-medium rounded-xl hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm border border-slate-700/50"
          >
            Delete Project
          </button>
          <Link 
            href={`/dashboard/tasks/create?project_id=${projectId}`}
            className="block w-full px-4 py-2 bg-slate-900/50 text-green-400 text-center font-medium rounded-xl hover:bg-green-500/10 hover:border-green-500/30 transition-all text-sm border border-slate-700/50"
          >
            Add New Task
          </Link>
          <Link 
            href="/dashboard/interns/create"
            className="block w-full px-4 py-2 bg-slate-900/50 text-sky-400 text-center font-medium rounded-xl hover:bg-sky-500/10 hover:border-sky-500/30 transition-all text-sm border border-slate-700/50"
          >
            Add New Intern
          </Link>
          <Link 
            href="/dashboard/activity"
            className="block w-full px-4 py-2 bg-slate-900/50 text-slate-300 text-center font-medium rounded-xl hover:bg-slate-700/30 hover:border-slate-600/30 transition-all text-sm border border-slate-700/50"
          >
            View Activity Log
          </Link>
        </div>
      </div>

      <Modal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} title="Update Project Status">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">New Project Status</label>
            <select 
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button 
              onClick={() => setIsStatusOpen(false)}
              className="px-4 py-2 text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button 
              onClick={handleStatusUpdate}
              disabled={loading}
              className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-lg hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Project">
        <div className="space-y-4">
          <p className="text-slate-300">Are you sure you want to delete this project? All associated tasks will remain but will be part of an inactive project. This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button 
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button 
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
