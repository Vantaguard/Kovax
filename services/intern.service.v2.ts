/**
 * INTERN SERVICE V2 - PRODUCTION GRADE
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
  createInternSchema,
  updateInternSchema,
  searchInternsSchema,
  validateInput,
  type CreateInternInput,
  type UpdateInternInput,
  type SearchInternsInput,
  type PaginatedResponse,
} from '@/lib/validations';
import { NotFoundError, UnauthorizedError, ForbiddenError, DatabaseError, sanitizeError } from '@/lib/errors';
import { FEATURE_MODULES } from '@/lib/phase6/keys';
import { assertModuleAndPermission } from '@/lib/phase6/guards';
import { getServerAuthContext, isInternRole } from '@/lib/phase6/auth-context';
import {
  applyPrivacyToInternList,
  applyPrivacyToInternProfileExtended,
} from '@/services/privacy.service';
import { logActivity, LOG_ACTIONS, ENTITY_TYPES } from '@/services/log.service';
import { sanitizeSearchQuery } from '@/lib/security/sanitize';
import { evaluateWorkflows, WORKFLOW_EVENTS, type WorkflowContext } from '@/services/workflow-engine.service';

export interface InternProfile {
  id: string;
  user_id: string;
  organization_id: string;
  status: 'draft' | 'pending' | 'active' | 'inactive' | 'approved' | 'rejected' | 'completed';
  approved_by: string | null;
  approved_at: string | null;
  tenure_start: string | null;
  tenure_end: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export interface InternProfileExtended extends InternProfile {
  user: {
    id: string;
    email: string;
    status: string;
    department_id: string | null;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  approved_by_user: {
    id: string;
    email: string;
  } | null;
}

/**
 * Get paginated interns with optional search
 * 
 * @param params - Search and pagination parameters
 * @returns Paginated intern profiles
 */
export async function getInternsPaginated(
  params: SearchInternsInput
): Promise<PaginatedResponse<InternProfileExtended>> {
  try {
    // Validate input
    const validated = validateInput(searchInternsSchema, params);
    const { query, status, page = 1, limit = 10 } = validated;

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.INTERNS, 'view');

    const supabase = await createClient();
    const offset = (page - 1) * limit;

    // If searching by email, we need to get user IDs first
    let userIds: string[] | undefined;
    if (query) {
      const sanitizedQuery = sanitizeSearchQuery(query);
      if (!sanitizedQuery) {
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .ilike('email', `%${sanitizedQuery}%`)
        .eq('is_deleted', false);
      
      if (users && users.length > 0) {
        userIds = users.map(u => u.id);
      } else {
        // No users found matching search, return empty result
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
    }

    // Build query
    let queryBuilder = supabase
      .from('intern_profiles')
      .select(
        `
        *,
        user:users!intern_profiles_user_id_fkey (
          id,
          email,
          status,
          department_id
        )
      `,
        { count: 'exact' }
      )
      .eq('is_deleted', false);

    if (isInternRole(ctx.roleName)) {
      queryBuilder = queryBuilder.eq('user_id', ctx.userId);
    }

    // Apply search filter (filter by user IDs)
    if (userIds) {
      queryBuilder = queryBuilder.in('user_id', userIds);
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
      console.error('Error fetching interns:', error);
      throw new DatabaseError('Failed to fetch interns');
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

    // Fetch additional details
    const internsWithDetails = await Promise.all(
      data.map(async (intern) => {
        let department = null;
        let approved_by_user = null;

        // Fetch department
        if (intern.user && !Array.isArray(intern.user) && intern.user.department_id) {
          const { data: deptData } = await supabase
            .from('departments')
            .select('id, name')
            .eq('id', intern.user.department_id)
            .single();
          department = deptData;
        }

        // Fetch approver
        if (intern.approved_by) {
          const { data: approverData } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', intern.approved_by)
            .eq('is_deleted', false)
            .single();
          approved_by_user = approverData;
        }

        return {
          ...intern,
          user: Array.isArray(intern.user) ? intern.user[0] || null : intern.user,
          department,
          approved_by_user,
        };
      })
    );

    const withPrivacy = await applyPrivacyToInternList(
      internsWithDetails,
      ctx.userId,
      ctx.organizationId,
      ctx.roleId
    );

    return {
      data: withPrivacy,
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
 * Get intern by ID
 * 
 * @param id - Intern profile ID
 * @returns Intern profile or null
 */
export async function getInternById(id: string): Promise<InternProfileExtended | null> {
  try {
    // Validate UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Intern');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.INTERNS, 'view');

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('intern_profiles')
      .select(
        `
        *,
        user:users!intern_profiles_user_id_fkey (
          id,
          email,
          status,
          department_id
        )
      `
      )
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      throw new NotFoundError('Intern');
    }

    // Fetch additional details
    let department = null;
    let approved_by_user = null;

    if (data.user && !Array.isArray(data.user) && data.user.department_id) {
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name')
        .eq('id', data.user.department_id)
        .single();
      department = deptData;
    }

    if (data.approved_by) {
      const { data: approverData } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', data.approved_by)
        .eq('is_deleted', false)
        .single();
      approved_by_user = approverData;
    }

    const userRow = Array.isArray(data.user) ? data.user[0] : data.user;
    if (isInternRole(ctx.roleName) && userRow && userRow.id !== ctx.userId) {
      throw new NotFoundError('Intern');
    }

    const extended: InternProfileExtended = {
      ...data,
      user: userRow || null,
      department,
      approved_by_user,
    };

    return applyPrivacyToInternProfileExtended(
      extended,
      ctx.userId,
      ctx.organizationId,
      ctx.roleId
    );
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Create new intern profile
 * 
 * @param input - Intern data
 * @returns Created intern profile
 */
export async function createIntern(input: CreateInternInput): Promise<InternProfile> {
  try {
    // Validate input
    const validated = validateInput(createInternSchema, input);

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

    await assertModuleAndPermission(userData.organization_id, FEATURE_MODULES.INTERNS, 'create');

    // Verify user_id exists and belongs to same organization
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', validated.user_id)
      .eq('is_deleted', false)
      .single();

    if (targetUserError || !targetUser) {
      throw new NotFoundError('User');
    }

    if (targetUser.organization_id !== userData.organization_id) {
      throw new ForbiddenError('Cannot create intern for user in different organization');
    }

    // Check if an intern profile already exists for this user/org combination
    const { data: existingProfile, error: fetchError } = await supabase
      .from('intern_profiles')
      .select('id, is_deleted')
      .eq('user_id', validated.user_id)
      .eq('organization_id', userData.organization_id)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Database Error checking existing profile:', fetchError);
      throw new DatabaseError(`Failed to check existing intern profile: ${fetchError.message}`);
    }

    let internData;
    if (existingProfile) {
      // Re-activate or update existing profile
      const { data: updated, error: updateError } = await supabase
        .from('intern_profiles')
        .update({
          status: validated.status,
          tenure_start: validated.tenure_start,
          tenure_end: validated.tenure_end,
          is_deleted: false,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Database Error re-activating intern profile:', updateError);
        throw new DatabaseError(`Failed to restore intern profile: ${updateError.message}`);
      }
      internData = updated;
    } else {
      // Create new intern profile
      const { data: created, error: insertError } = await supabase
        .from('intern_profiles')
        .insert({
          user_id: validated.user_id,
          organization_id: userData.organization_id,
          status: validated.status,
          tenure_start: validated.tenure_start,
          tenure_end: validated.tenure_end,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database Error creating intern:', insertError);
        throw new DatabaseError(`Failed to create intern profile: ${insertError.message}`);
      }
      internData = created;
    }

    if (!internData) {
      throw new DatabaseError('Failed to create/update intern profile: No data returned from database');
    }

    // NEW: Sync status AND department to users table
    const userUpdateData: any = { 
      status: validated.status, 
      updated_at: new Date().toISOString() 
    };
    if (validated.department_id) {
      userUpdateData.department_id = validated.department_id;
    }

    const { error: userUpdateError } = await supabase
      .from('users')
      .update(userUpdateData)
      .eq('id', validated.user_id);

    if (userUpdateError) {
      console.warn('Warning: Updated intern profile but failed to sync to users table:', userUpdateError.message);
    }

    // Log activity
    await logActivity({
      action: existingProfile ? LOG_ACTIONS.INTERN_UPDATED : LOG_ACTIONS.INTERN_CREATED,
      entity_type: ENTITY_TYPES.INTERN_PROFILE,
      entity_id: internData.id,
      metadata: { user_id: validated.user_id, status: validated.status, restored: !!existingProfile },
    });

    // Trigger workflow engine
    const wfContext: WorkflowContext = {
      organizationId: userData.organization_id,
      userId: user.id,
      entityType: ENTITY_TYPES.INTERN_PROFILE,
      entityId: internData.id,
      data: { status: validated.status, user_id: validated.user_id },
    };
    await evaluateWorkflows(
      existingProfile ? WORKFLOW_EVENTS.INTERN_UPDATED : WORKFLOW_EVENTS.INTERN_CREATED,
      wfContext
    );

    return internData;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Update intern profile
 * 
 * @param id - Intern profile ID
 * @param input - Updated data
 * @returns Updated intern profile
 */
export async function updateIntern(
  id: string,
  input: UpdateInternInput
): Promise<InternProfile> {
  try {
    // Validate UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Intern');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.INTERNS, 'update');

    // Validate input
    const validated = validateInput(updateInternSchema, input);

    // If no changes, just return the current intern profile
    if (Object.keys(validated).length === 0) {
      const current = await getInternById(id);
      if (!current) throw new NotFoundError('Intern');
      return current as InternProfile;
    }

    const supabase = await createClient();

    // Separate intern profile fields from user fields
    const { department_id, ...internFields } = validated;

    // Update intern profile
    const { data: internData, error } = await supabase
      .from('intern_profiles')
      .update({
        ...internFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database Error updating intern:', error);
      throw new DatabaseError(`Failed to update intern profile: ${error.message}`);
    }

    if (!internData) {
      throw new NotFoundError('Intern (Not found or access denied)');
    }

    // NEW: Sync status and department to users table if updated
    if (validated.status || validated.department_id) {
      const userUpdateData: any = { updated_at: new Date().toISOString() };
      if (validated.status) userUpdateData.status = validated.status;
      if (validated.department_id) userUpdateData.department_id = validated.department_id;

      const { error: userUpdateError } = await supabase
        .from('users')
        .update(userUpdateData)
        .eq('id', internData.user_id);

      if (userUpdateError) {
        console.warn('Warning: Updated intern profile but failed to sync to users table:', userUpdateError.message);
      }
    }

    // Log activity
    await logActivity({
      action: LOG_ACTIONS.INTERN_UPDATED,
      entity_type: ENTITY_TYPES.INTERN_PROFILE,
      entity_id: id,
      metadata: { updated_fields: Object.keys(validated) },
    });

    // Trigger workflow engine
    const wfContext: WorkflowContext = {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityType: ENTITY_TYPES.INTERN_PROFILE,
      entityId: id,
      data: { ...validated },
    };
    await evaluateWorkflows(WORKFLOW_EVENTS.INTERN_UPDATED, wfContext);

    return internData;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Soft delete intern profile
 * 
 * @param id - Intern profile ID
 * @returns Success boolean
 */
export async function deleteIntern(id: string): Promise<boolean> {
  try {
    // Validate UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Intern');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.INTERNS, 'delete');

    const supabase = await createClient();

    const { error } = await supabase
      .from('intern_profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_deleted', false);

    if (error) {
      console.error('Database Error deleting intern:', error);
      throw new DatabaseError(`Failed to delete intern profile: ${error.message}`);
    }

    // Log activity
    await logActivity({
      action: LOG_ACTIONS.INTERN_DELETED,
      entity_type: ENTITY_TYPES.INTERN_PROFILE,
      entity_id: id,
    });

    // Trigger workflow engine
    const wfContext: WorkflowContext = {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityType: ENTITY_TYPES.INTERN_PROFILE,
      entityId: id,
      data: {},
    };
    await evaluateWorkflows(WORKFLOW_EVENTS.INTERN_DELETED, wfContext);

    return true;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Get intern statistics
 * 
 * @returns Statistics by status
 */
export async function getInternStats() {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.INTERNS, 'view');

    const supabase = await createClient();

    let query = supabase.from('intern_profiles').select('status').eq('is_deleted', false);
    if (isInternRole(ctx.roleName)) {
      query = query.eq('user_id', ctx.userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching intern stats:', error);
      return {
        total: 0,
        draft: 0,
        pending: 0,
        active: 0,
        inactive: 0,
        approved: 0,
        completed: 0,
      };
    }

    const stats = {
      total: data.length,
      draft: data.filter((i) => i.status === 'draft').length,
      pending: data.filter((i) => i.status === 'pending').length,
      active: data.filter((i) => i.status === 'active').length,
      inactive: data.filter((i) => i.status === 'inactive').length,
      approved: data.filter((i) => i.status === 'approved').length,
      completed: data.filter((i) => i.status === 'completed').length,
    };

    return stats;
  } catch (error) {
    console.error('Unexpected error in getInternStats:', error);
    return {
      total: 0,
      draft: 0,
      pending: 0,
      active: 0,
      inactive: 0,
      approved: 0,
      completed: 0,
    };
  }
}

/**
 * Restore a soft-deleted intern profile (Admin only)
 * 
 * @param id - Intern profile ID
 * @returns Restored intern profile
 */
export async function restoreIntern(id: string): Promise<InternProfile> {
  try {
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError('Intern');
    }

    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();
    await assertModuleAndPermission(ctx.organizationId, FEATURE_MODULES.INTERNS, 'update');

    const supabase = await createClient();

    // Find the soft-deleted record
    const { data, error } = await supabase
      .from('intern_profiles')
      .update({
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_deleted', true)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database Error restoring intern:', error);
      throw new DatabaseError(`Failed to restore intern: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundError('Deleted intern profile not found');
    }

    await logActivity({
      action: 'intern.restored',
      entity_type: ENTITY_TYPES.INTERN_PROFILE,
      entity_id: id,
    });

    return data;
  } catch (error) {
    throw sanitizeError(error);
  }
}
