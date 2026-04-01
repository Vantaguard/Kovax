import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardLoading() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-slate-400">Loading dashboard data...</p>
    </div>
  );
}
