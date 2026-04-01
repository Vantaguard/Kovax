'use client';

import { useState, useEffect, useTransition } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { restoreInternProfile } from '@/app/(dashboard)/dashboard/interns/actions';
import { restoreExistingProject } from '@/app/(dashboard)/dashboard/projects/actions';
import { restoreExistingTask } from '@/app/(dashboard)/dashboard/tasks/actions';
import Link from 'next/link';

interface DeletedRecord {
  id: string;
  label: string;
  deleted_at: string;
}

interface RetentionPolicy {
  entity: string;
  retention_days: number;
}

interface RetentionSummary {
  policies: RetentionPolicy[];
  expired_counts: Record<string, number>;
  total_expired: number;
}

export default function DataLifecyclePage() {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'restore' | 'retention'>('restore');

  // Restore state
  const [deletedInterns, setDeletedInterns] = useState<DeletedRecord[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<DeletedRecord[]>([]);
  const [deletedTasks, setDeletedTasks] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Retention state
  const [retentionData, setRetentionData] = useState<RetentionSummary | null>(null);

  useEffect(() => {
    loadDeletedRecords();
    loadRetentionData();
  }, []);

  async function loadDeletedRecords() {
    try {
      const res = await fetch('/api/data-lifecycle/deleted');
      if (res.ok) {
        const data = await res.json();
        setDeletedInterns(data.interns || []);
        setDeletedProjects(data.projects || []);
        setDeletedTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error loading deleted records:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRetentionData() {
    try {
      const res = await fetch('/api/data-lifecycle/retention');
      if (res.ok) {
        const data = await res.json();
        setRetentionData(data);
      }
    } catch (error) {
      console.error('Error loading retention data:', error);
    }
  }

  const handleRestore = (type: 'intern' | 'project' | 'task', id: string) => {
    startTransition(async () => {
      let result;
      if (type === 'intern') result = await restoreInternProfile(id);
      else if (type === 'project') result = await restoreExistingProject(id);
      else result = await restoreExistingTask(id);

      if (result.success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully`);
        loadDeletedRecords();
      } else {
        toast.error(result.error || `Failed to restore ${type}`);
      }
    });
  };

  const totalDeleted = deletedInterns.length + deletedProjects.length + deletedTasks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Data Lifecycle</h2>
          <p className="text-slate-400 mt-1">Restore deleted records and manage data retention</p>
        </div>
        <Link
          href="/dashboard/admin"
          className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl hover:bg-slate-700/30 hover:border-amber-500/30 transition-all"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🗑️</span>
            <p className="text-sm text-slate-400">Deleted Records</p>
          </div>
          <p className="text-3xl font-bold text-amber-400">{loading ? '...' : totalDeleted}</p>
        </div>
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">⏰</span>
            <p className="text-sm text-slate-400">Expired (Past Retention)</p>
          </div>
          <p className="text-3xl font-bold text-red-400">{retentionData?.total_expired ?? '...'}</p>
        </div>
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🛡️</span>
            <p className="text-sm text-slate-400">Status</p>
          </div>
          <p className="text-lg font-bold text-green-400 mt-1.5">No Permanent Deletions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50 pb-0">
        <button
          onClick={() => setActiveTab('restore')}
          className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all ${
            activeTab === 'restore'
              ? 'bg-slate-800/60 text-amber-400 border border-b-0 border-slate-700/50'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🔄 Restore Records
        </button>
        <button
          onClick={() => setActiveTab('retention')}
          className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all ${
            activeTab === 'retention'
              ? 'bg-slate-800/60 text-amber-400 border border-b-0 border-slate-700/50'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📊 Retention Policies
        </button>
      </div>

      {/* Restore Tab */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          {loading ? (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-slate-700 rounded w-1/4"></div>
                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : totalDeleted === 0 ? (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/50 text-center">
              <span className="text-5xl block mb-4">✨</span>
              <p className="text-xl font-semibold text-white mb-2">No deleted records</p>
              <p className="text-slate-400">All records are active. Nothing to restore.</p>
            </div>
          ) : (
            <>
              {/* Deleted Interns */}
              {deletedInterns.length > 0 && (
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span>👥</span> Deleted Interns ({deletedInterns.length})
                  </h3>
                  <div className="space-y-2">
                    {deletedInterns.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                        <div>
                          <p className="text-white font-medium">{item.label}</p>
                          <p className="text-xs text-slate-400">Deleted: {new Date(item.deleted_at).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleRestore('intern', item.id)}
                          disabled={isPending}
                          className="px-4 py-2 text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-all disabled:opacity-50"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deleted Projects */}
              {deletedProjects.length > 0 && (
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span>🏗️</span> Deleted Projects ({deletedProjects.length})
                  </h3>
                  <div className="space-y-2">
                    {deletedProjects.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                        <div>
                          <p className="text-white font-medium">{item.label}</p>
                          <p className="text-xs text-slate-400">Deleted: {new Date(item.deleted_at).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleRestore('project', item.id)}
                          disabled={isPending}
                          className="px-4 py-2 text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-all disabled:opacity-50"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deleted Tasks */}
              {deletedTasks.length > 0 && (
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span>✓</span> Deleted Tasks ({deletedTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {deletedTasks.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                        <div>
                          <p className="text-white font-medium">{item.label}</p>
                          <p className="text-xs text-slate-400">Deleted: {new Date(item.deleted_at).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleRestore('task', item.id)}
                          disabled={isPending}
                          className="px-4 py-2 text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-all disabled:opacity-50"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Retention Tab */}
      {activeTab === 'retention' && (
        <div className="space-y-6">
          {/* Retention Policies */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📋</span> Active Retention Policies
            </h3>
            <div className="space-y-3">
              {retentionData?.policies?.map((policy) => (
                <div key={policy.entity} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                  <div>
                    <p className="text-white font-medium capitalize">{policy.entity.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-400">Soft-deleted records are flagged after this period</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-amber-400">{policy.retention_days}</span>
                    <span className="text-slate-400 text-sm ml-1">days</span>
                  </div>
                </div>
              )) || (
                <p className="text-slate-400">Loading retention policies...</p>
              )}
            </div>
          </div>

          {/* Expired Counts */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>⏰</span> Expired Records (Past Retention Period)
            </h3>
            {retentionData ? (
              <div className="space-y-3">
                {Object.entries(retentionData.expired_counts).map(([entity, count]) => (
                  <div key={entity} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                    <p className="text-white font-medium capitalize">{entity.replace('_', ' ')}</p>
                    <span className={`text-2xl font-bold ${count > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Loading...</p>
            )}
          </div>

          {/* Info */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
            <p className="text-amber-300 text-sm font-medium flex items-center gap-2 mb-2">
              <span>ℹ️</span> How Data Retention Works
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Records are <strong className="text-white">never permanently deleted</strong>. When a record is soft-deleted and exceeds its retention period,
              it is flagged for archival. Retention policies can be customized per organization via the configurations table.
              An admin can always restore records regardless of their retention status.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
