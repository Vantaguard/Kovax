'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import { approveInternProfile, rejectInternProfile, deleteInternProfile } from '../actions';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';

interface InternQuickActionsProps {
  internId: string;
  currentStatus: string;
}

export default function InternQuickActions({ internId, currentStatus }: InternQuickActionsProps) {
  const router = useRouter();
  const toast = useToast();
  
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await approveInternProfile(internId);
      if (res.success) {
        toast.success('Intern profile approved successfully');
        setIsApproveOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to approve intern');
      }
    } catch (error: any) {
      toast.error('Unexpected error approving intern');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const res = await rejectInternProfile(internId, rejectReason);
      if (res.success) {
        toast.success('Intern profile rejected successfully');
        setIsRejectOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to reject intern');
      }
    } catch (error: any) {
      toast.error('Unexpected error rejecting intern');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await deleteInternProfile(internId);
      if (res.success) {
        toast.success('Intern profile deleted successfully');
        router.push('/dashboard/interns');
      } else {
        toast.error(res.error || 'Failed to delete intern');
      }
    } catch (error: any) {
      toast.error('Unexpected error deleting intern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-bold text-white mb-4">Workflow Actions</h3>
        <div className="space-y-2">
          {currentStatus === 'pending' || currentStatus === 'draft' ? (
            <button 
              onClick={() => setIsApproveOpen(true)}
              className="w-full px-4 py-2 bg-slate-900/50 text-green-400 font-medium rounded-xl hover:bg-green-500/10 hover:border-green-500/30 transition-all text-sm border border-slate-700/50"
            >
              Approve Intern
            </button>
          ) : null}
          
          {currentStatus !== 'rejected' && currentStatus !== 'completed' ? (
            <button 
              onClick={() => setIsRejectOpen(true)}
              className="w-full px-4 py-2 bg-slate-900/50 text-red-400 font-medium rounded-xl hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm border border-slate-700/50"
            >
              Reject Intern
            </button>
          ) : null}

          <Link 
            href={`/dashboard/interns/${internId}/edit`}
            className="block w-full px-4 py-2 bg-slate-900/50 text-amber-400 text-center font-medium rounded-xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-sm border border-slate-700/50"
          >
            Edit Profile Details
          </Link>
          <button 
            onClick={() => setIsDeleteOpen(true)}
            className="w-full px-4 py-2 bg-slate-900/50 text-red-500 font-medium rounded-xl hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm border border-slate-700/50"
          >
            Delete Profile
          </button>
          
          <Link 
            href="/dashboard/activity"
            className="block w-full px-4 py-2 bg-slate-900/50 text-slate-300 font-medium rounded-xl hover:bg-slate-700/30 hover:border-slate-600/30 transition-all text-sm border border-slate-700/50 text-center"
          >
            View Activity Log
          </Link>
        </div>
      </div>

      <Modal isOpen={isApproveOpen} onClose={() => setIsApproveOpen(false)} title="Approve Intern">
        <div className="space-y-4">
          <p className="text-slate-300">Are you sure you want to approve this intern? They will be granted active status.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button 
              onClick={() => setIsApproveOpen(false)}
              className="px-4 py-2 text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button 
              onClick={handleApprove}
              disabled={loading}
              className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Approving...' : 'Confirm Approve'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} title="Reject Intern">
        <div className="space-y-4">
          <p className="text-slate-300">Are you sure you want to reject this intern?</p>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Reason (Optional)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button 
              onClick={() => setIsRejectOpen(false)}
              className="px-4 py-2 text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button 
              onClick={handleReject}
              disabled={loading}
              className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Intern Profile">
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm font-medium flex items-center gap-2">
              <span>⚠️</span> Warning: This action is destructive.
            </p>
            <p className="text-slate-400 text-xs mt-1">The profile will be soft-deleted and can be restored by an admin later.</p>
          </div>
          <p className="text-slate-300">Are you sure you want to delete this intern profile? This cannot be easily undone.</p>
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
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg shadow-red-500/20 font-semibold"
            >
              {loading ? 'Deleting...' : 'Delete Profile'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
