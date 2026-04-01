'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast, { ToastType } from './Toast';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  
  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);
  
  const success = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration);
  }, [showToast]);
  
  const error = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration);
  }, [showToast]);
  
  const warning = useCallback((message: string, duration?: number) => {
    showToast('warning', message, duration);
  }, [showToast]);
  
  const info = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration);
  }, [showToast]);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container - absolute top-right, highest z-index to overlap everything */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-md">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              type={toast.type}
              message={toast.message}
              duration={toast.duration}
              onClose={removeToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
