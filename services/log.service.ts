/**
 * ACTIVITY LOGGING SERVICE
 * 
 * Enterprise-grade activity logging for audit trails
 * All actions are logged with full context
 * 
 * SECURITY PRINCIPLES:
 * 1. Every action must be traceable
 * 2. Logs are immutable
 * 3. Organization isolation via RLS
 * 4. No silent updates
 */

import { createClient } from '@/lib/supabase/server';
import { sanitizeError } from '@/lib/errors';

export const LOG_ACTIONS = {
  // User actions
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  
  // Intern actions
  INTERN_CREATED: 'intern.created',
  INTERN_UPDATED: 'intern.updated',
  INTERN_APPROVED: 'intern.approved',
  INTERN_REJECTED: 'intern.rejected',
  INTERN_STATUS_CHANGED: 'intern.status_changed',
  INTERN_DELETED: 'intern.deleted',
  
  // Project actions
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_ASSIGNED: 'project.assigned',
  PROJECT_STATUS_CHANGED: 'project.status_changed',
  PROJECT_DELETED: 'project.deleted',
  
  // Task actions
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_ASSIGNED: 'task.assigned',
  TASK_STATUS_UPDATED: 'task.status_updated',
  TASK_PRIORITY_CHANGED: 'task.priority_changed',
  TASK_DELETED: 'task.deleted',
  
  // Role actions
  ROLE_ASSIGNED: 'role.assigned',
  ROLE_REMOVED: 'role.removed',

  // Phase 8 — Workflow & Intelligence
  WORKFLOW_EVALUATED: 'workflow.evaluated',
  WORKFLOW_ACTION_BLOCKED: 'workflow.action.blocked',
  WORKFLOW_ACTION_UPDATE_FIELD: 'workflow.action.update_field',
  NOTIFICATION_CREATED: 'notification.created',
  DATA_EXPORTED: 'data.exported',
} as const;

export const ENTITY_TYPES = {
  USER: 'user',
  INTERN_PROFILE: 'intern_profile',
  PROJECT: 'project',
  TASK: 'task',
  ROLE: 'role',
  ORGANIZATION: 'organization',
  WORKFLOW: 'workflow',
  NOTIFICATION: 'notification',
  EXPORT: 'export',
} as const;

interface LogActivityParams {
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log an activity to the activity_logs table
 * 
 * @param params - Activity log parameters
 * @returns Success boolean
 */
export async function logActivity(params: LogActivityParams): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Cannot log activity: No authenticated user');
      return false;
    }
    
    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .eq('is_deleted', false)
      .single();
    
    if (userError || !userData) {
      console.error('Cannot log activity: User not found');
      return false;
    }
    
    // Insert activity log
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        organization_id: userData.organization_id,
        action: params.action,
        entity_type: params.entity_type,
        entity_id: params.entity_id || null,
        metadata: params.metadata || null,
        ip_address: params.ip_address || null,
        user_agent: params.user_agent || null,
      });
    
    if (logError) {
      console.error('Error logging activity:', logError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error in logActivity:', error);
    return false;
  }
}

/**
 * Get activity logs with pagination and filters
 * 
 * @param params - Query parameters
 * @returns Paginated activity logs
 */
export async function getActivityLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
  entity_type?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}) {
  try {
    const supabase = await createClient();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    
    // Build query
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        user:users!activity_logs_user_id_fkey (
          id,
          email
        )
      `, { count: 'exact' });
    
    // Apply filters
    if (params.action) {
      query = query.eq('action', params.action);
    }
    
    if (params.entity_type) {
      query = query.eq('entity_type', params.entity_type);
    }
    
    if (params.user_id) {
      query = query.eq('user_id', params.user_id);
    }
    
    if (params.start_date) {
      query = query.gte('created_at', params.start_date);
    }
    
    if (params.end_date) {
      query = query.lte('created_at', params.end_date);
    }
    
    // Apply pagination and ordering
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching activity logs:', error);
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
    
    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    console.error('Unexpected error in getActivityLogs:', error);
    throw sanitizeError(error);
  }
}

/**
 * Get activity log statistics
 * 
 * @returns Activity statistics
 */
export async function getActivityStats() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('activity_logs')
      .select('action');
    
    if (error) {
      console.error('Error fetching activity stats:', error);
      return {
        total: 0,
        by_action: {},
      };
    }
    
    const stats = {
      total: data.length,
      by_action: data.reduce((acc: Record<string, number>, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
    };
    
    return stats;
  } catch (error) {
    console.error('Unexpected error in getActivityStats:', error);
    return {
      total: 0,
      by_action: {},
    };
  }
}

/**
 * Get recent activity for dashboard
 * 
 * @param limit - Number of recent activities to fetch
 * @returns Recent activity logs
 */
export async function getRecentActivity(limit: number = 10) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user:users!activity_logs_user_id_fkey (
          id,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getRecentActivity:', error);
    return [];
  }
}
