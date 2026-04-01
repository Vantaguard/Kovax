/**
 * TASK SERVICE V2 - PRODUCTION GRADE
 * 
 * Features:
 * - Backend validation (mandatory)
 * - Search functionality
 * - Server-side pagination
 * - Error handling
 * - RLS-safe queries
 */

import { createClient } from '@/lib/supabase/server';
import {
  createTaskSchema,
  updateTaskSchema,
  searchTasksSchema,
  validateInput,
  type CreateTaskInput,
  type UpdateTaskInput,
  type SearchTasksInput,
  type PaginatedResponse,
} from '@/lib/validations';
import { NotFoundError, UnauthorizedError, ForbiddenError, DatabaseError, sanitizeError } from '@/lib/errors';
import { FEATURE_MODULES } from '@/lib/phase6/keys';
import { assertModuleAndPermission } from '@/lib/phase6/guards';
import { getServerAuthContext, isInternRole } from '@/lib/phase6/auth-context';
import { logActivity, LOG_ACTIONS, ENTITY_TYPES } from '@/services/log.service';
import { sanitizeSearchQuery } from '@/lib/security/sanitize';
import { evaluateWorkflows, WORKFLOW_EVENTS, type WorkflowContext } from '@/services/workflow-engine.service';

export interface Task {
  id: string;
  project_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string | null;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export interface TaskExtended extends Task {
  project: {
    id: string;
    name: string;
    status: string;
  } | null;
  assigned_user: {
    id: string;
    email: string;
  } | null;
}

/**
 * Get paginated tasks with optional search and filters
 * 
 * @param params - Search and pagination parameters
 * @returns Paginated tasks
 */
export async function getTasksPaginated(
  params: SearchTasksInput
): Promise<PaginatedResponse<TaskExtended>> {
  try {
    // Validate input
    const validated = validateInput(searchTasksSchema, params);
    const { query, status, priority, project_id, assigned_to, page = 1, limit = 10 } = validated;

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.TASKS, 'view');

    const supabase = await createClient();
    const offset = (page - 1) * limit;

    // Build query
    let queryBuilder = supabase
      .from('tasks')
      .select(
        `
        *,
        project:projects!tasks_project_id_fkey (
          id,
          name,
          status
        ),
        assigned_user:users!tasks_assigned_to_fkey (
          id,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('is_deleted', false);

    if (isInternRole(ctx.roleName)) {
      queryBuilder = queryBuilder.eq('assigned_to', ctx.userId);
    }

    // Apply search filter
    if (query) {
      const sanitizedQuery = sanitizeSearchQuery(query);
      if (!sanitizedQuery) {
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      queryBuilder = queryBuilder.ilike('title', `%${sanitizedQuery}%`);
    }

    // Apply status filter
    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    // Apply priority filter
    if (priority) {
      queryBuilder = queryBuilder.eq('priority', priority);
    }

    // Apply project filter
    if (project_id) {
      queryBuilder = queryBuilder.eq('project_id', project_id);
    }

    // Apply assigned_to filter
    if (assigned_to) {
      queryBuilder = queryBuilder.eq('assigned_to', assigned_to);
    }

    // Apply pagination
    queryBuilder = queryBuilder
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error('Error fetching tasks:', error);
      throw new DatabaseError('Failed to fetch tasks');
    }

    if (!data) {
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

    const tasks = data.map((task) => ({
      ...task,
      project: Array.isArray(task.project) ? task.project[0] || null : task.project,
      assigned_user: Array.isArray(task.assigned_user) ? task.assigned_user[0] || null : task.assigned_user,
    }));

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Get task by ID
 * 
 * @param id - Task ID
 * @returns Task or null
 */
export async function getTaskById(id: string): Promise<TaskExtended | null> {
  try {
    // Validate UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Task');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.TASKS, 'view');

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        project:projects!tasks_project_id_fkey (
          id,
          name,
          status
        ),
        assigned_user:users!tasks_assigned_to_fkey (
          id,
          email
        )
      `
      )
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      throw new NotFoundError('Task');
    }

    if (isInternRole(ctx.roleName) && data.assigned_to !== ctx.userId) {
      throw new NotFoundError('Task');
    }

    return {
      ...data,
      project: Array.isArray(data.project) ? data.project[0] || null : data.project,
      assigned_user: Array.isArray(data.assigned_user) ? data.assigned_user[0] || null : data.assigned_user,
    };
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Create new task
 * 
 * @param input - Task data
 * @returns Created task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  try {
    // Validate input
    const validated = validateInput(createTaskSchema, input);

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.TASKS, 'create');

    const supabase = await createClient();

    // Verify project exists and is accessible (RLS will handle this)
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', validated.project_id)
      .eq('is_deleted', false)
      .single();

    if (projectError || !projectData) {
      throw new NotFoundError('Project');
    }

    // If assigned_to is provided, verify user exists and is in same organization
    if (validated.assigned_to) {
      const { data: assignedUser, error: userError } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('id', validated.assigned_to)
        .eq('is_deleted', false)
        .single();

      if (userError || !assignedUser) {
        throw new NotFoundError('Assigned user');
      }

      if (assignedUser.organization_id !== projectData.organization_id) {
        throw new ForbiddenError('Cannot assign task to user in different organization');
      }
    }

    // Create task
    const { data: taskData, error } = await supabase
      .from('tasks')
      .insert({
        project_id: validated.project_id,
        assigned_to: validated.assigned_to,
        title: validated.title,
        description: validated.description,
        status: validated.status,
        priority: validated.priority,
        deadline: validated.deadline,
      })
      .select()
      .single();

    if (error) {
      console.error('Database Error creating task:', error);
      throw new DatabaseError(`Failed to create task: ${error.message}`);
    }

    if (!taskData) {
      throw new DatabaseError('Failed to create task: No data returned from database');
    }

    // Log activity
    await logActivity({
      action: LOG_ACTIONS.TASK_CREATED,
      entity_type: ENTITY_TYPES.TASK,
      entity_id: taskData.id,
      metadata: { 
        title: validated.title, 
        project_id: validated.project_id,
        assigned_to: validated.assigned_to 
      },
    });

    // Trigger workflow engine
    const wfContext: WorkflowContext = {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityType: ENTITY_TYPES.TASK,
      entityId: taskData.id,
      data: { title: validated.title, status: validated.status, priority: validated.priority, assigned_to: validated.assigned_to },
    };
    await evaluateWorkflows(WORKFLOW_EVENTS.TASK_CREATED, wfContext);

    return taskData;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Update task
 * 
 * @param id - Task ID
 * @param input - Updated data
 * @returns Updated task
 */
export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  try {
    // Validate UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Task');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.TASKS, 'update');

    // Validate input
    const validated = validateInput(updateTaskSchema, input);

    // If no changes, just return the current task
    if (Object.keys(validated).length === 0) {
      const current = await getTaskById(id);
      if (!current) throw new NotFoundError('Task');
      return current as Task;
    }

    const supabase = await createClient();

    if (isInternRole(ctx.roleName)) {
      const { data: existing } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();
      if (!existing || existing.assigned_to !== ctx.userId) {
        throw new ForbiddenError('You can only update tasks assigned to you');
      }
    }

    // If assigned_to is being updated, verify user exists and is in same organization
    if (validated.assigned_to !== undefined && validated.assigned_to !== null) {
      // Get task's project organization
      const { data: taskData } = await supabase
        .from('tasks')
        .select('project_id')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

      if (taskData) {
        // Get project organization
        const { data: projectData } = await supabase
          .from('projects')
          .select('organization_id')
          .eq('id', taskData.project_id)
          .eq('is_deleted', false)
          .single();

        if (projectData) {
          const { data: assignedUser, error: userError } = await supabase
            .from('users')
            .select('id, organization_id')
            .eq('id', validated.assigned_to)
            .eq('is_deleted', false)
            .single();

          if (userError || !assignedUser) {
            throw new NotFoundError('Assigned user');
          }

          if (assignedUser.organization_id !== projectData.organization_id) {
            throw new ForbiddenError('Cannot assign task to user in different organization');
          }
        }
      }
    }

    // Update task
    const { data: taskData, error } = await supabase
      .from('tasks')
      .update(validated)
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database Error updating task:', error);
      throw new DatabaseError(`Failed to update task: ${error.message}`);
    }

    if (!taskData) {
      throw new NotFoundError('Task (Not found or access denied)');
    }

    // Determine specific action
    let action: string = LOG_ACTIONS.TASK_UPDATED;
    if (validated.status) action = LOG_ACTIONS.TASK_STATUS_UPDATED;
    if (validated.priority) action = LOG_ACTIONS.TASK_PRIORITY_CHANGED;
    if (validated.assigned_to !== undefined && validated.assigned_to !== null) action = LOG_ACTIONS.TASK_ASSIGNED;

    // Log activity
    await logActivity({
      action,
      entity_type: ENTITY_TYPES.TASK,
      entity_id: id,
      metadata: { updated_fields: Object.keys(validated) },
    });

    // Trigger workflow engine
    const wfEvent = validated.status ? WORKFLOW_EVENTS.TASK_STATUS_UPDATED
      : (validated.assigned_to !== undefined ? WORKFLOW_EVENTS.TASK_ASSIGNED : WORKFLOW_EVENTS.TASK_UPDATED);
    const wfContext: WorkflowContext = {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityType: ENTITY_TYPES.TASK,
      entityId: id,
      data: { ...validated },
    };
    await evaluateWorkflows(wfEvent, wfContext);

    return taskData;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Update task status
 * 
 * @param id - Task ID
 * @param status - New status
 * @returns Updated task
 */
export async function updateTaskStatus(
  id: string,
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
): Promise<Task> {
  return updateTask(id, { status });
}

/**
 * Soft delete task
 * 
 * @param id - Task ID
 * @returns Success boolean
 */
export async function deleteTask(id: string): Promise<boolean> {
  try {
    // Validate UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Task');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.TASKS, 'delete');

    const supabase = await createClient();

    const { error } = await supabase
      .from('tasks')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_deleted', false);

    if (error) {
      console.error('Database Error deleting task:', error);
      throw new DatabaseError(`Failed to delete task: ${error.message}`);
    }

    // Log activity
    await logActivity({
      action: LOG_ACTIONS.TASK_DELETED,
      entity_type: ENTITY_TYPES.TASK,
      entity_id: id,
    });

    // Trigger workflow engine
    const wfContext: WorkflowContext = {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityType: ENTITY_TYPES.TASK,
      entityId: id,
      data: {},
    };
    await evaluateWorkflows(WORKFLOW_EVENTS.TASK_DELETED, wfContext);

    return true;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Get task statistics
 * 
 * @returns Statistics by status and priority
 */
export async function getTaskStats() {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.TASKS, 'view');

    const supabase = await createClient();

    let query = supabase.from('tasks').select('status, priority').eq('is_deleted', false);
    if (isInternRole(ctx.roleName)) {
      query = query.eq('assigned_to', ctx.userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching task stats:', error);
      return {
        total: 0,
        by_status: {
          pending: 0,
          in_progress: 0,
          completed: 0,
          blocked: 0,
        },
        by_priority: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0,
        },
      };
    }

    const stats = {
      total: data.length,
      by_status: {
        pending: data.filter((t) => t.status === 'pending').length,
        in_progress: data.filter((t) => t.status === 'in_progress').length,
        completed: data.filter((t) => t.status === 'completed').length,
        blocked: data.filter((t) => t.status === 'blocked').length,
      },
      by_priority: {
        low: data.filter((t) => t.priority === 'low').length,
        medium: data.filter((t) => t.priority === 'medium').length,
        high: data.filter((t) => t.priority === 'high').length,
        urgent: data.filter((t) => t.priority === 'urgent').length,
      },
    };

    return stats;
  } catch (error) {
    console.error('Unexpected error in getTaskStats:', error);
    return {
      total: 0,
      by_status: {
        pending: 0,
        in_progress: 0,
        completed: 0,
        blocked: 0,
      },
      by_priority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
    };
  }
}

/**
 * Get tasks assigned to a specific user
 * 
 * @param userId - User ID
 * @returns Array of tasks
 */
export async function getTasksByUser(userId: string): Promise<TaskExtended[]> {
  try {
    // Validate UUID
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return [];
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.TASKS, 'view');

    if (isInternRole(ctx.roleName) && userId !== ctx.userId) {
      return [];
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        project:projects!tasks_project_id_fkey (
          id,
          name,
          status
        ),
        assigned_user:users!tasks_assigned_to_fkey (
          id,
          email
        )
      `
      )
      .eq('assigned_to', userId)
      .eq('is_deleted', false)
      .order('deadline', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching tasks by user:', error);
      return [];
    }

    return (data || []).map((task) => ({
      ...task,
      project: Array.isArray(task.project) ? task.project[0] || null : task.project,
      assigned_user: Array.isArray(task.assigned_user) ? task.assigned_user[0] || null : task.assigned_user,
    }));
  } catch (error) {
    console.error('Unexpected error in getTasksByUser:', error);
    return [];
  }
}

/**
 * Get tasks by project
 * 
 * @param projectId - Project ID
 * @returns Array of tasks
 */
export async function getTasksByProject(projectId: string): Promise<TaskExtended[]> {
  try {
    // Validate UUID
    if (!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      return [];
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.TASKS, 'view');

    const supabase = await createClient();

    let q = supabase
      .from('tasks')
      .select(
        `
        *,
        project:projects!tasks_project_id_fkey (
          id,
          name,
          status
        ),
        assigned_user:users!tasks_assigned_to_fkey (
          id,
          email
        )
      `
      )
      .eq('project_id', projectId)
      .eq('is_deleted', false);

    if (isInternRole(ctx.roleName)) {
      q = q.eq('assigned_to', ctx.userId);
    }

    const { data, error } = await q.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks by project:', error);
      return [];
    }

    return (data || []).map((task) => ({
      ...task,
      project: Array.isArray(task.project) ? task.project[0] || null : task.project,
      assigned_user: Array.isArray(task.assigned_user) ? task.assigned_user[0] || null : task.assigned_user,
    }));
  } catch (error) {
    console.error('Unexpected error in getTasksByProject:', error);
    return [];
  }
}

/**
 * Restore a soft-deleted task (Admin only)
 * 
 * @param id - Task ID
 * @returns Restored task
 */
export async function restoreTask(id: string): Promise<Task> {
  try {
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Task');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.TASKS, 'update');

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('tasks')
      .update({
        is_deleted: false,
        deleted_at: null,
      })
      .eq('id', id)
      .eq('is_deleted', true)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database Error restoring task:', error);
      throw new DatabaseError(`Failed to restore task: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundError('Deleted task not found');
    }

    await logActivity({
      action: 'task.restored',
      entity_type: ENTITY_TYPES.TASK,
      entity_id: id,
    });

    return data;
  } catch (error) {
    throw sanitizeError(error);
  }
}
