/**
 * PROJECT SERVICE V2 - PRODUCTION GRADE
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
  createProjectSchema,
  updateProjectSchema,
  searchProjectsSchema,
  validateInput,
  type CreateProjectInput,
  type UpdateProjectInput,
  type SearchProjectsInput,
  type PaginatedResponse,
} from '@/lib/validations';
import { NotFoundError, UnauthorizedError, DatabaseError, sanitizeError } from '@/lib/errors';
import { FEATURE_MODULES } from '@/lib/phase6/keys';
import { assertModuleAndPermission } from '@/lib/phase6/guards';
import { getServerAuthContext, isInternRole, getAssignedProjectIdsForUser } from '@/lib/phase6/auth-context';
import { logActivity, LOG_ACTIONS, ENTITY_TYPES } from '@/services/log.service';
import { sanitizeSearchQuery } from '@/lib/security/sanitize';

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export interface ProjectExtended extends Project {
  creator: {
    id: string;
    email: string;
  } | null;
  task_count: number;
  member_count: number;
}

/**
 * Get paginated projects with optional search
 * 
 * @param params - Search and pagination parameters
 * @returns Paginated projects
 */
export async function getProjectsPaginated(
  params: SearchProjectsInput
): Promise<PaginatedResponse<ProjectExtended>> {
  try {
    // Validate input
    const validated = validateInput(searchProjectsSchema, params);
    const { query, status, page = 1, limit = 10 } = validated;

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.PROJECTS, 'view');

    const supabase = await createClient();
    const offset = (page - 1) * limit;

    // Build query
    let queryBuilder = supabase
      .from('projects')
      .select(
        `
        *,
        creator:users!projects_created_by_fkey (
          id,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('is_deleted', false);

    if (isInternRole(ctx.roleName)) {
      const assignedIds = await getAssignedProjectIdsForUser(ctx.userId);
      if (assignedIds.length === 0) {
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }
      queryBuilder = queryBuilder.in('id', assignedIds);
    }

    // Apply search filter
    if (query) {
      const sanitizedQuery = sanitizeSearchQuery(query);
      if (!sanitizedQuery) {
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      queryBuilder = queryBuilder.ilike('name', `%${sanitizedQuery}%`);
    }

    // Apply status filter
    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    // Apply pagination
    queryBuilder = queryBuilder
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error('Error fetching projects:', error);
      throw new DatabaseError('Failed to fetch projects');
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

    // Fetch task counts and member counts
    const projectsWithCounts = await Promise.all(
      data.map(async (project) => {
        // Get task count
        const { count: taskCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('is_deleted', false);

        // Get unique assigned users count
        const { data: tasks } = await supabase
          .from('tasks')
          .select('assigned_to')
          .eq('project_id', project.id)
          .eq('is_deleted', false)
          .not('assigned_to', 'is', null);

        const uniqueMembers = new Set(tasks?.map((t) => t.assigned_to) || []);

        return {
          ...project,
          creator: Array.isArray(project.creator) ? project.creator[0] || null : project.creator,
          task_count: taskCount || 0,
          member_count: uniqueMembers.size,
        };
      })
    );

    return {
      data: projectsWithCounts,
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
 * Get project by ID
 * 
 * @param id - Project ID
 * @returns Project or null
 */
export async function getProjectById(id: string): Promise<ProjectExtended | null> {
  try {
    // Validate UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Project');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.PROJECTS, 'view');

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        creator:users!projects_created_by_fkey (
          id,
          email
        )
      `
      )
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      throw new NotFoundError('Project');
    }

    if (isInternRole(ctx.roleName)) {
      const assignedIds = await getAssignedProjectIdsForUser(ctx.userId);
      if (!assignedIds.includes(data.id)) {
        throw new NotFoundError('Project');
      }
    }

    // Get task count
    const { count: taskCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', data.id)
      .eq('is_deleted', false);

    // Get unique assigned users count
    const { data: tasks } = await supabase
      .from('tasks')
      .select('assigned_to')
      .eq('project_id', data.id)
      .eq('is_deleted', false)
      .not('assigned_to', 'is', null);

    const uniqueMembers = new Set(tasks?.map((t) => t.assigned_to) || []);

    return {
      ...data,
      creator: Array.isArray(data.creator) ? data.creator[0] || null : data.creator,
      task_count: taskCount || 0,
      member_count: uniqueMembers.size,
    };
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Create new project
 * 
 * @param input - Project data
 * @returns Created project
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  try {
    // Validate input
    const validated = validateInput(createProjectSchema, input);

    const supabase = await createClient();

    // Get current user's organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError();
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      throw new UnauthorizedError();
    }

    await assertModuleAndPermission(userData.organization_id, FEATURE_MODULES.PROJECTS, 'create');

    // Create project
    const { data: projectData, error } = await supabase
      .from('projects')
      .insert({
        organization_id: userData.organization_id,
        name: validated.name,
        description: validated.description,
        status: validated.status,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Database Error creating project:', error);
      throw new DatabaseError(`Failed to create project: ${error.message}`);
    }

    if (!projectData) {
      throw new DatabaseError('Failed to create project: No data returned from database');
    }

    // Log activity
    await logActivity({
      action: LOG_ACTIONS.PROJECT_CREATED,
      entity_type: ENTITY_TYPES.PROJECT,
      entity_id: projectData.id,
      metadata: { name: validated.name, status: validated.status },
    });

    return projectData;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Update project
 * 
 * @param id - Project ID
 * @param input - Updated data
 * @returns Updated project
 */
export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  try {
    // Validate UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Project');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.PROJECTS, 'update');

    // Validate input
    const validated = validateInput(updateProjectSchema, input);

    // If no changes, just return the current project
    if (Object.keys(validated).length === 0) {
      const current = await getProjectById(id);
      if (!current) throw new NotFoundError('Project');
      return current as Project;
    }

    const supabase = await createClient();

    // Update project
    const { data: projectData, error } = await supabase
      .from('projects')
      .update(validated)
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database Error updating project:', error);
      throw new DatabaseError(`Failed to update project: ${error.message}`);
    }

    if (!projectData) {
      // Could be no match or RLS failure
      throw new NotFoundError('Project (Not found or access denied)');
    }

    // Determine the action (was it a status change?)
    const action = validated.status ? LOG_ACTIONS.PROJECT_STATUS_CHANGED : LOG_ACTIONS.PROJECT_UPDATED;

    // Log activity
    await logActivity({
      action,
      entity_type: ENTITY_TYPES.PROJECT,
      entity_id: id,
      metadata: { updated_fields: Object.keys(validated) },
    });

    return projectData;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Soft delete project
 * 
 * @param id - Project ID
 * @returns Success boolean
 */
export async function deleteProject(id: string): Promise<boolean> {
  try {
    // Validate UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Project');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.PROJECTS, 'delete');

    const supabase = await createClient();

    const { error } = await supabase
      .from('projects')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_deleted', false);

    if (error) {
      console.error('Database Error deleting project:', error);
      throw new DatabaseError(`Failed to delete project: ${error.message}`);
    }

    // Log activity
    await logActivity({
      action: LOG_ACTIONS.PROJECT_DELETED,
      entity_type: ENTITY_TYPES.PROJECT,
      entity_id: id,
    });

    return true;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Get project statistics
 * 
 * @returns Statistics by status
 */
export async function getProjectStats() {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.PROJECTS, 'view');

    const supabase = await createClient();

    let query = supabase.from('projects').select('status').eq('is_deleted', false);
    if (isInternRole(ctx.roleName)) {
      const assignedIds = await getAssignedProjectIdsForUser(ctx.userId);
      if (assignedIds.length === 0) {
        return {
          total: 0,
          active: 0,
          completed: 0,
          on_hold: 0,
          cancelled: 0,
        };
      }
      query = query.in('id', assignedIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching project stats:', error);
      return {
        total: 0,
        active: 0,
        completed: 0,
        on_hold: 0,
        cancelled: 0,
      };
    }

    const stats = {
      total: data.length,
      active: data.filter((p) => p.status === 'active').length,
      completed: data.filter((p) => p.status === 'completed').length,
      on_hold: data.filter((p) => p.status === 'on_hold').length,
      cancelled: data.filter((p) => p.status === 'cancelled').length,
    };

    return stats;
  } catch (error) {
    console.error('Unexpected error in getProjectStats:', error);
    return {
      total: 0,
      active: 0,
      completed: 0,
      on_hold: 0,
      cancelled: 0,
    };
  }
}

/**
 * Get tasks for a specific project
 * 
 * @param projectId - Project ID
 * @returns Array of tasks
 */
export async function getProjectTasks(projectId: string) {
  try {
    // Validate UUID
    if (!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      throw new NotFoundError('Project');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.PROJECTS, 'view');

    const supabase = await createClient();

    if (isInternRole(ctx.roleName)) {
      const assignedIds = await getAssignedProjectIdsForUser(ctx.userId);
      if (!assignedIds.includes(projectId)) {
        return [];
      }
    }

    let taskQuery = supabase
      .from('tasks')
      .select(
        `
        *,
        assigned_user:users!tasks_assigned_to_fkey (
          id,
          email
        )
      `
      )
      .eq('project_id', projectId)
      .eq('is_deleted', false);

    if (isInternRole(ctx.roleName)) {
      taskQuery = taskQuery.eq('assigned_to', ctx.userId);
    }

    const { data, error } = await taskQuery.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching project tasks:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in getProjectTasks:', error);
    return [];
  }
}

/**
 * Restore a soft-deleted project (Admin only)
 * 
 * @param id - Project ID
 * @returns Restored project
 */
export async function restoreProject(id: string): Promise<Project> {
  try {
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Project');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.PROJECTS, 'update');

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('projects')
      .update({
        is_deleted: false,
        deleted_at: null,
      })
      .eq('id', id)
      .eq('is_deleted', true)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database Error restoring project:', error);
      throw new DatabaseError(`Failed to restore project: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundError('Deleted project not found');
    }

    await logActivity({
      action: 'project.restored',
      entity_type: ENTITY_TYPES.PROJECT,
      entity_id: id,
    });

    return data;
  } catch (error) {
    throw sanitizeError(error);
  }
}
