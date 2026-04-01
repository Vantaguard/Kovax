/**
 * WORKFLOW SERVICE
 * 
 * Enterprise-grade role-based workflow enforcement
 * All role checks happen at service layer (backend)
 * 
 * SECURITY PRINCIPLES:
 * 1. Never trust UI for role checks
 * 2. Always validate at backend
 * 3. Log all workflow actions
 * 4. Enforce organization boundaries
 */

import { createClient } from '@/lib/supabase/server';
import { NotFoundError, ForbiddenError, UnauthorizedError, sanitizeError } from '@/lib/errors';
import { logActivity, LOG_ACTIONS, ENTITY_TYPES } from './log.service';
import { assertModuleEnabled, assertPermission } from '@/lib/phase6/guards';
import { FEATURE_MODULES } from '@/lib/phase6/keys';
import { evaluateWorkflows, WORKFLOW_EVENTS, type WorkflowContext } from '@/services/workflow-engine.service';

/**
 * Check if user is a super admin
 */
export async function isSuperAdmin(userId?: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      targetUserId = user.id;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('role:roles(name)')
      .eq('id', targetUserId)
      .eq('is_deleted', false)
      .single();
    
    if (error || !data) return false;
    
    const role: any = data.role;
    const roleName = Array.isArray(role) ? role[0]?.name : role?.name;
    return roleName?.toLowerCase() === 'super_admin';
  } catch (error) {
    console.error('Error checking super admin:', error);
    return false;
  }
}

/**
 * Check if user is an organization admin
 */
export async function isOrgAdmin(userId?: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      targetUserId = user.id;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('role:roles(name)')
      .eq('id', targetUserId)
      .eq('is_deleted', false)
      .single();
    
    if (error || !data) return false;
    
    const role: any = data.role;
    const roleName = (Array.isArray(role) ? role[0]?.name : role?.name)?.toLowerCase();
    
    return (
      roleName === 'super_admin' ||
      roleName === 'org_admin' ||
      roleName === 'admin'
    );
  } catch (error) {
    console.error('Error checking org admin:', error);
    return false;
  }
}

/**
 * Check if user is an intern
 */
export async function isIntern(userId?: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      targetUserId = user.id;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('role:roles(name)')
      .eq('id', targetUserId)
      .eq('is_deleted', false)
      .single();
    
    if (error || !data) return false;
    
    const role: any = data.role;
    const roleName = Array.isArray(role) ? role[0]?.name : role?.name;
    return roleName?.toLowerCase() === 'intern';
  } catch (error) {
    console.error('Error checking intern:', error);
    return false;
  }
}

/**
 * Check if user can approve interns
 */
export async function canApproveInterns(userId?: string): Promise<boolean> {
  return await isOrgAdmin(userId);
}

/**
 * Check if user can assign projects
 */
export async function canAssignProjects(userId?: string): Promise<boolean> {
  return await isOrgAdmin(userId);
}

/**
 * Check if user can manage tasks
 */
export async function canManageTasks(userId?: string): Promise<boolean> {
  // Admins and mentors can manage tasks
  const supabase = await createClient();
  
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    targetUserId = user.id;
  }
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      role:roles (
        name
      )
    `)
    .eq('id', targetUserId)
    .eq('is_deleted', false)
    .single();
  
  if (error || !data) return false;
  
  const role = Array.isArray(data.role) ? data.role[0] : data.role;
  return ['super_admin', 'org_admin', 'mentor'].includes(role?.name || '');
}

/**
 * Approve an intern profile
 * 
 * @param internId - Intern profile ID
 * @param approverId - User ID of approver (optional, uses current user)
 * @returns Success boolean
 */
export async function approveIntern(internId: string, approverId?: string): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get current user if approverId not provided
    let approver = approverId;
    if (!approver) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new UnauthorizedError();
      approver = user.id;
    }
    
    // Check if user can approve interns
    const canApprove = await canApproveInterns(approver);
    if (!canApprove) {
      throw new ForbiddenError('You do not have permission to approve interns');
    }
    
    // Get intern profile
    const { data: intern, error: internError } = await supabase
      .from('intern_profiles')
      .select('*, user:users!intern_profiles_user_id_fkey(email)')
      .eq('id', internId)
      .eq('is_deleted', false)
      .single();
    
    if (internError || !intern) {
      throw new NotFoundError('Intern profile');
    }

    await assertModuleEnabled(intern.organization_id, FEATURE_MODULES.INTERNS);
    await assertPermission(approver, 'interns', 'update');
    
    // Update intern status
    const { error: updateError } = await supabase
      .from('intern_profiles')
      .update({
        status: 'approved',
        approved_by: approver,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', internId);
    
    if (updateError) {
      throw new Error('Failed to approve intern');
    }

    // NEW: Sync status to users table — 'approved' profile means 'active' user
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', intern.user_id);
    
    if (userUpdateError) {
      console.warn('Warning: Approved intern profile but failed to sync active status to users table:', userUpdateError.message);
    }
    
    // Log activity
    const userEmail = Array.isArray(intern.user) ? intern.user[0]?.email : intern.user?.email;
    await logActivity({
      action: LOG_ACTIONS.INTERN_APPROVED,
      entity_type: ENTITY_TYPES.INTERN_PROFILE,
      entity_id: internId,
      metadata: {
        intern_email: userEmail,
        previous_status: intern.status,
        new_status: 'approved',
      },
    });

    // Trigger workflow engine
    const wfContext: WorkflowContext = {
      organizationId: intern.organization_id,
      userId: approver,
      entityType: ENTITY_TYPES.INTERN_PROFILE,
      entityId: internId,
      data: { status: 'approved', previous_status: intern.status },
    };
    await evaluateWorkflows(WORKFLOW_EVENTS.INTERN_APPROVED, wfContext);
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Reject an intern profile
 * 
 * @param internId - Intern profile ID
 * @param rejecterId - User ID of rejecter (optional, uses current user)
 * @param reason - Rejection reason
 * @returns Success boolean
 */
export async function rejectIntern(
  internId: string,
  rejecterId?: string,
  reason?: string
): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get current user if rejecterId not provided
    let rejecter = rejecterId;
    if (!rejecter) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new UnauthorizedError();
      rejecter = user.id;
    }
    
    // Check if user can approve/reject interns
    const canReject = await canApproveInterns(rejecter);
    if (!canReject) {
      throw new ForbiddenError('You do not have permission to reject interns');
    }
    
    // Get intern profile
    const { data: intern, error: internError } = await supabase
      .from('intern_profiles')
      .select('*, user:users!intern_profiles_user_id_fkey(email)')
      .eq('id', internId)
      .eq('is_deleted', false)
      .single();
    
    if (internError || !intern) {
      throw new NotFoundError('Intern profile');
    }

    await assertModuleEnabled(intern.organization_id, FEATURE_MODULES.INTERNS);
    await assertPermission(rejecter, 'interns', 'update');
    
    // Update intern status
    const { error: updateError } = await supabase
      .from('intern_profiles')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', internId);
    
    if (updateError) {
      throw new Error('Failed to reject intern');
    }

    // NEW: Sync status to users table — 'rejected' profile means 'rejected' user record
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', intern.user_id);
    
    if (userUpdateError) {
      console.warn('Warning: Rejected intern profile but failed to sync status to users table:', userUpdateError.message);
    }
    
    // Log activity
    const userEmail = Array.isArray(intern.user) ? intern.user[0]?.email : intern.user?.email;
    await logActivity({
      action: LOG_ACTIONS.INTERN_REJECTED,
      entity_type: ENTITY_TYPES.INTERN_PROFILE,
      entity_id: internId,
      metadata: {
        intern_email: userEmail,
        previous_status: intern.status,
        new_status: 'rejected',
        reason: reason || 'No reason provided',
      },
    });

    // Trigger workflow engine
    const wfContext: WorkflowContext = {
      organizationId: intern.organization_id,
      userId: rejecter,
      entityType: ENTITY_TYPES.INTERN_PROFILE,
      entityId: internId,
      data: { status: 'rejected', previous_status: intern.status, reason },
    };
    await evaluateWorkflows(WORKFLOW_EVENTS.INTERN_REJECTED, wfContext);
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Update intern status
 * 
 * @param internId - Intern profile ID
 * @param status - New status
 * @param updaterId - User ID of updater (optional, uses current user)
 * @returns Success boolean
 */
export async function updateInternStatus(
  internId: string,
  status: string,
  updaterId?: string
): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get current user if updaterId not provided
    let updater = updaterId;
    if (!updater) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new UnauthorizedError();
      updater = user.id;
    }
    
    // Check if user can update intern status
    const canUpdate = await canApproveInterns(updater);
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update intern status');
    }
    
    // Get intern profile
    const { data: intern, error: internError } = await supabase
      .from('intern_profiles')
      .select('*, user:users!intern_profiles_user_id_fkey(email)')
      .eq('id', internId)
      .eq('is_deleted', false)
      .single();
    
    if (internError || !intern) {
      throw new NotFoundError('Intern profile');
    }

    await assertModuleEnabled(intern.organization_id, FEATURE_MODULES.INTERNS);
    await assertPermission(updater, 'interns', 'update');
    
    // Update intern status
    const { error: updateError } = await supabase
      .from('intern_profiles')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', internId);
    
    if (updateError) {
      throw new Error('Failed to update intern status');
    }

    // NEW: Sync status to users table with mapping
    let mappedStatus = 'inactive';
    if (status === 'active' || status === 'approved') mappedStatus = 'active';
    else if (status === 'draft') mappedStatus = 'draft';

    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ status: mappedStatus, updated_at: new Date().toISOString() })
      .eq('id', intern.user_id);
    
    if (userUpdateError) {
      console.warn(`Warning: Updated intern status to "${status}" but failed to sync "${mappedStatus}" to users table:`, userUpdateError.message);
    }
    
    // Log activity
    const userEmail = Array.isArray(intern.user) ? intern.user[0]?.email : intern.user?.email;
    await logActivity({
      action: LOG_ACTIONS.INTERN_STATUS_CHANGED,
      entity_type: ENTITY_TYPES.INTERN_PROFILE,
      entity_id: internId,
      metadata: {
        intern_email: userEmail,
        previous_status: intern.status,
        new_status: status,
      },
    });
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Check if user can update a specific task
 * 
 * @param taskId - Task ID
 * @param userId - User ID (optional, uses current user)
 * @returns Boolean indicating if user can update task
 */
export async function canUpdateTask(taskId: string, userId?: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Get current user if userId not provided
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      targetUserId = user.id;
    }
    
    // Admins and mentors can update any task
    const canManage = await canManageTasks(targetUserId);
    if (canManage) return true;
    
    // Interns can only update tasks assigned to them
    const { data: task, error } = await supabase
      .from('tasks')
      .select('assigned_to')
      .eq('id', taskId)
      .eq('is_deleted', false)
      .single();
    
    if (error || !task) return false;
    
    return task.assigned_to === targetUserId;
  } catch (error) {
    console.error('Error checking task update permission:', error);
    return false;
  }
}
