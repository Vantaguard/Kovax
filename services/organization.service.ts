/**
 * ORGANIZATION SERVICE
 * 
 * Production-grade service layer for organization operations
 * All queries rely on RLS - NO manual filtering
 * 
 * SECURITY PRINCIPLES:
 * 1. RLS enforces organization isolation
 * 2. Users can only see their own organization
 * 3. Super admins can see all organizations
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get the current user's organization
 * 
 * RLS ensures user can only see their own organization
 * 
 * @returns Organization data or null
 */
export async function getCurrentOrganization() {
  try {
    const supabase = await createClient();
    
    // Get current user's organization_id
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return null;
    }
    
    // Get user's organization_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .eq('is_deleted', false)
      .single();
    
    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      return null;
    }
    
    // Fetch organization - RLS ensures access
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userData.organization_id)
      .single();
    
    if (error) {
      console.error('Error fetching organization:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in getCurrentOrganization:', error);
    return null;
  }
}

/**
 * Get organization statistics
 * 
 * Returns counts of users, projects, tasks, etc. in the organization
 * 
 * @returns Organization statistics
 */
export async function getOrganizationStats() {
  try {
    const supabase = await createClient();
    
    // All these queries are automatically filtered by RLS
    const [
      usersResult,
      projectsResult,
      tasksResult,
      internsResult
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false),
      supabase
        .from('intern_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
    ]);
    
    return {
      totalUsers: usersResult.count || 0,
      totalProjects: projectsResult.count || 0,
      totalTasks: tasksResult.count || 0,
      totalInterns: internsResult.count || 0
    };
  } catch (error) {
    console.error('Unexpected error in getOrganizationStats:', error);
    return {
      totalUsers: 0,
      totalProjects: 0,
      totalTasks: 0,
      totalInterns: 0
    };
  }
}

/**
 * Get all departments in the current user's organization
 * 
 * RLS ensures only departments from user's organization are returned
 * 
 * @returns Array of departments
 */
export async function getDepartments() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getDepartments:', error);
    return [];
  }
}

/**
 * Get all roles accessible to the current user
 * 
 * RLS ensures:
 * - Global roles are visible to all
 * - Organization-specific roles are visible only to that org
 * 
 * @returns Array of roles
 */
export async function getRoles() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getRoles:', error);
    return [];
  }
}

/**
 * Get all permissions
 * 
 * Permissions are global and visible to all authenticated users
 * 
 * @returns Array of permissions
 */
export async function getPermissions() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module', { ascending: true });
    
    if (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getPermissions:', error);
    return [];
  }
}

/**
 * Get permissions for a specific role
 * 
 * @param roleId - UUID of the role
 * @returns Array of permissions
 */
export async function getRolePermissions(roleId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission:permissions (
          id,
          module,
          action
        )
      `)
      .eq('role_id', roleId);
    
    if (error) {
      console.error('Error fetching role permissions:', error);
      return [];
    }
    
    return data?.map(rp => rp.permission) || [];
  } catch (error) {
    console.error('Unexpected error in getRolePermissions:', error);
    return [];
  }
}
