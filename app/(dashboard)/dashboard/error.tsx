'use client';

import { useEffect } from 'react';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-white mb-4">Failed to load content</h2>
      <ErrorMessage 
        message={error.message || "An unexpected error occurred while loading the dashboard."}
        onRetry={reset}
      />
    </div>
  );
}
