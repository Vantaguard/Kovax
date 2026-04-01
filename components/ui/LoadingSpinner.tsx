'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  return (
    <div className={`inline-block ${className}`} role="status" aria-label="Loading">
      <svg
        className={`animate-spin ${sizeClasses[size]}`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800/90 rounded-2xl p-8 shadow-2xl border border-slate-700/50">
        <LoadingSpinner size="lg" className="text-amber-500" />
        <p className="text-white mt-4 text-center">Loading...</p>
      </div>
    </div>
  );
}

export function LoadingButton({ loading, children, ...props }: any) {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-700/50 rounded ${className}`}></div>
  );
}

export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <SkeletonLoader key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
