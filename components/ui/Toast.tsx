'use client';

import { useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = useCallback(() => {
    if (isLeaving) return;
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // matches animation duration
  }, [id, isLeaving, onClose]);

  useEffect(() => {
    if (duration > 0 && !isLeaving) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, handleClose, isLeaving]);
  
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 border-emerald-700 text-white';
      case 'error':
        return 'bg-rose-600 border-rose-700 text-white';
      case 'warning':
        return 'bg-yellow-500 border-yellow-600 text-slate-900';
      case 'info':
        return 'bg-sky-600 border-sky-700 text-white';
      default:
        return 'bg-slate-700 border-slate-800 text-white';
    }
  };
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };
  
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl shadow-2xl ${
        isLeaving ? 'animate-slide-out' : 'animate-slide-in'
      } ${getTypeStyles()}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
        <span className="text-lg">{getIcon()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close notification"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
