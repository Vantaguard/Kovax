'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationStats {
  total: number;
  unread: number;
}

export default function NotificationBell() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setStats(data.stats || { total: 0, unread: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch stats periodically
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', notificationId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setStats((prev) => ({ ...prev, unread: 0 }));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return '✓';
      case 'approval':
        return '📋';
      case 'workflow':
        return '⚡';
      case 'alert':
      case 'warning':
        return '⚠️';
      case 'consent':
        return '🔒';
      case 'system':
        return '🔔';
      default:
        return 'ℹ️';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'border-l-blue-500';
      case 'approval':
        return 'border-l-purple-500';
      case 'workflow':
        return 'border-l-amber-500';
      case 'alert':
      case 'warning':
        return 'border-l-red-500';
      case 'consent':
        return 'border-l-green-500';
      default:
        return 'border-l-slate-500';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-slate-400 hover:text-amber-400 transition-colors duration-200 rounded-lg hover:bg-slate-800/60"
        title="Notifications"
        id="notification-bell-btn"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {stats.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-xs font-bold text-slate-900 bg-amber-500 rounded-full shadow-lg shadow-amber-500/30 animate-pulse">
            {stats.unread > 9 ? '9+' : stats.unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[28rem] bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl shadow-black/30 overflow-hidden z-50"
          id="notification-dropdown"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-200">
              Notifications
              {stats.unread > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                  {stats.unread} new
                </span>
              )}
            </h3>
            {stats.unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                id="mark-all-read-btn"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-80">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-l-2 ${getTypeColor(notification.type)} ${
                    notification.is_read
                      ? 'bg-slate-800/30 opacity-70'
                      : 'bg-slate-800/80 hover:bg-slate-700/50'
                  } border-b border-slate-700/30 cursor-pointer transition-all duration-150`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5 flex-shrink-0">{getTypeIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${
                          notification.is_read ? 'text-slate-400' : 'text-slate-200'
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-900/50">
              <p className="text-xs text-slate-500 text-center">
                Showing latest {notifications.length} of {stats.total} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
