'use client';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
  return (
    <div className={`bg-red-500/10 border border-red-500/30 rounded-xl p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-300 mb-2">Error</h3>
          <p className="text-red-200">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundaryFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <ErrorMessage
          message={error?.message || 'Something went wrong. Please try again.'}
          onRetry={resetErrorBoundary}
        />
      </div>
    </div>
  );
}

export function NotFoundMessage({ resource = 'Resource', onBack }: { resource?: string; onBack?: () => void }) {
  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-slate-700/50 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-2xl font-bold text-white mb-4">{resource} Not Found</h3>
      <p className="text-slate-400 mb-8">
        The {resource.toLowerCase()} you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      {onBack && (
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300"
        >
          Go Back
        </button>
      )}
    </div>
  );
}

export function UnauthorizedMessage() {
  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-slate-700/50 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h3 className="text-2xl font-bold text-white mb-4">Access Denied</h3>
      <p className="text-slate-400 mb-8">
        You don&apos;t have permission to access this resource.
      </p>
    </div>
  );
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  actionLabel,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-slate-700/50 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
      <p className="text-slate-400 mb-8">{description}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
