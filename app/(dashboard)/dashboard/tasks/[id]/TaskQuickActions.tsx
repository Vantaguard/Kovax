'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import { updateExistingTask, deleteExistingTask } from '../actions';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';

interface TaskQuickActionsProps {
  taskId: string;
  currentStatus: string;
  currentPriority: string;
}

export default function TaskQuickActions({ taskId, currentStatus, currentPriority }: TaskQuickActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      const res = await updateExistingTask(taskId, { status: newStatus as any });
      if (res.success) {
        toast.success('Task status updated successfully');
        setIsStatusOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    } catch (error: any) {
      toast.error('Unexpected error updating task');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await deleteExistingTask(taskId);
      if (res.success) {
        toast.success('Task deleted successfully');
        router.push('/dashboard/tasks');
      } else {
        toast.error(res.error || 'Failed to delete task');
      }
    } catch (error: any) {
      toast.error('Unexpected error deleting task');
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
            Update Status
          </button>
          <Link 
            href={`/dashboard/tasks/${taskId}/edit`}
            className="block w-full px-4 py-2 bg-slate-900/50 text-amber-400 text-center font-medium rounded-xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-sm border border-slate-700/50"
          >
            Edit Task Details
          </Link>
          <button 
            onClick={() => setIsDeleteOpen(true)}
            className="w-full px-4 py-2 bg-slate-900/50 text-red-400 font-medium rounded-xl hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm border border-slate-700/50"
          >
            Delete Task
          </button>
          <Link 
            href="/dashboard/activity"
            className="block w-full px-4 py-2 bg-slate-900/50 text-slate-300 text-center font-medium rounded-xl hover:bg-slate-700/30 hover:border-slate-600/30 transition-all text-sm border border-slate-700/50"
          >
            View Activity Log
          </Link>
        </div>
      </div>

      <Modal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} title="Update Task Status">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">New Status</label>
            <select 
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
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

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Task">
        <div className="space-y-4">
          <p className="text-slate-300">Are you sure you want to delete this task? This action cannot be undone.</p>
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
