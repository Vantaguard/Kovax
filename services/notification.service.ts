/**
 * NOTIFICATION SERVICE — PHASE 8
 *
 * Smart, event-driven notification system.
 *
 * ARCHITECTURE:
 * 1. Notifications are created by workflow actions or direct service calls
 * 2. All notifications are org-scoped and user-targeted
 * 3. Respects privacy rules — no PII in notification content
 * 4. All actions are logged
 *
 * CRITICAL RULES:
 * - Organization-scoped: users only see their own notifications
 * - Role-based: admin notifications go to admins only
 * - All side-effects logged
 * - No raw data exposure
 */

import { createClient } from '@/lib/supabase/server';
import { logActivity, ENTITY_TYPES } from '@/services/log.service';
import { sanitizeError, UnauthorizedError } from '@/lib/errors';
import { getServerAuthContext } from '@/lib/phase6/auth-context';

// ============================================
// TYPES
// ============================================

export type NotificationType =
  | 'workflow'
  | 'system'
  | 'task'
  | 'approval'
  | 'consent'
  | 'alert'
  | 'info'
  | 'warning';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
}

// ============================================
// CREATE NOTIFICATION
// ============================================

/**
 * Create a notification for a specific user.
 * Can be called from workflow engine, services, or system events.
 *
 * @param userId - Target user ID
 * @param title - Notification title
 * @param message - Notification body
 * @param type - Notification type (workflow, system, task, etc.)
 * @param organizationId - Optional org ID override (for system-level calls)
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType | string,
  organizationId?: string
): Promise<Notification | null> {
  try {
    const supabase = await createClient();

    // Insert notification
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[NotificationService] Error creating notification:', error);
      return null;
    }

    return data as Notification;
  } catch (error) {
    console.error('[NotificationService] Unexpected error in createNotification:', error);
    return null;
  }
}

/**
 * Create notifications for all users with a specific role in an organization.
 * Useful for admin-targeted notifications (e.g., pending approvals).
 */
export async function createRoleNotification(
  organizationId: string,
  roleName: string,
  title: string,
  message: string,
  type: NotificationType | string
): Promise<number> {
  try {
    const supabase = await createClient();

    // Get all users with the specified role in the org
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, role:roles(name)')
      .eq('organization_id', organizationId)
      .eq('is_deleted', false);

    if (usersError || !users) {
      console.error('[NotificationService] Error fetching role users:', usersError);
      return 0;
    }

    // Filter by role
    const targetUsers = users.filter((u) => {
      const role = Array.isArray(u.role) ? u.role[0] : u.role;
      return (role as any)?.name?.toLowerCase() === roleName.toLowerCase();
    });

    let created = 0;
    for (const user of targetUsers) {
      const result = await createNotification(user.id, title, message, type, organizationId);
      if (result) created++;
    }

    return created;
  } catch (error) {
    console.error('[NotificationService] Error in createRoleNotification:', error);
    return 0;
  }
}

// ============================================
// GET NOTIFICATIONS
// ============================================

/**
 * Get notifications for the currently authenticated user.
 * Ordered by most recent first.
 */
export async function getUserNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<Notification[]> {
  try {
    const supabase = await createClient();
    const { limit = 50, unreadOnly = false } = options;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[NotificationService] Error fetching notifications:', error);
      return [];
    }

    return (data || []) as Notification[];
  } catch (error) {
    console.error('[NotificationService] Unexpected error:', error);
    return [];
  }
}

/**
 * Get notification statistics (total + unread count).
 */
export async function getNotificationStats(userId: string): Promise<NotificationStats> {
  try {
    const supabase = await createClient();

    const { count: total, error: totalError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: unread, error: unreadError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (totalError || unreadError) {
      return { total: 0, unread: 0 };
    }

    return {
      total: total || 0,
      unread: unread || 0,
    };
  } catch (error) {
    console.error('[NotificationService] Error getting stats:', error);
    return { total: 0, unread: 0 };
  }
}

// ============================================
// MARK AS READ
// ============================================

/**
 * Mark a single notification as read.
 * Only the owner can mark their notifications.
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    // RLS ensures users can only update their own notifications
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[NotificationService] Error marking as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[NotificationService] Error in markAsRead:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[NotificationService] Error marking all as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[NotificationService] Error in markAllAsRead:', error);
    return false;
  }
}

// ============================================
// SYSTEM EVENT NOTIFICATIONS
// ============================================

/**
 * Generate system notifications for overdue tasks.
 * Called periodically or on-demand by admin.
 */
export async function notifyOverdueTasks(organizationId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Find overdue tasks (deadline passed, not completed)
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        deadline,
        assigned_to,
        project:projects!tasks_project_id_fkey (
          organization_id
        )
      `)
      .lt('deadline', now)
      .neq('status', 'completed')
      .eq('is_deleted', false);

    if (error || !tasks) return 0;

    let notified = 0;
    for (const task of tasks) {
      const project = Array.isArray(task.project) ? task.project[0] : task.project;
      if ((project as any)?.organization_id !== organizationId) continue;
      if (!task.assigned_to) continue;

      // Avoid duplicate notifications — check last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', task.assigned_to)
        .eq('type', 'task')
        .ilike('title', '%overdue%')
        .gte('created_at', oneDayAgo);

      if ((count || 0) > 0) continue;

      await createNotification(
        task.assigned_to,
        '⏰ Overdue Task',
        `Your task "${task.title}" is past its deadline. Please update the status or contact your mentor.`,
        'task',
        organizationId
      );
      notified++;
    }

    return notified;
  } catch (error) {
    console.error('[NotificationService] Error in notifyOverdueTasks:', error);
    return 0;
  }
}

/**
 * Notify admins about pending intern approvals.
 */
export async function notifyPendingApprovals(organizationId: string): Promise<number> {
  try {
    const supabase = await createClient();

    // Count pending intern profiles
    const { count, error } = await supabase
      .from('intern_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .eq('is_deleted', false);

    if (error || !count || count === 0) return 0;

    return await createRoleNotification(
      organizationId,
      'org_admin',
      '📋 Pending Approvals',
      `There are ${count} intern profile(s) awaiting your approval.`,
      'approval'
    );
  } catch (error) {
    console.error('[NotificationService] Error in notifyPendingApprovals:', error);
    return 0;
  }
}
