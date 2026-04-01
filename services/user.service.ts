/**
 * USER SERVICE
 * 
 * Production-grade service layer for user operations
 * All queries rely on RLS - NO manual filtering by organization
 * 
 * SECURITY PRINCIPLES:
 * 1. Never bypass RLS
 * 2. Never use service role key in frontend
 * 3. Let PostgreSQL enforce access control
 * 4. Always check is_deleted flag
 */

import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/types/auth';

/**
 * Get the current authenticated user's profile
 * 
 * RLS automatically ensures:
 * - User can only see their own data
 * - Organization isolation is enforced
 * 
 * @returns UserProfile or null if not found
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return null;
    }
    
    // Fetch user profile - RLS ensures user can only see their own data
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        organization_id,
        department_id,
        role_id,
        status,
        last_login,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .eq('is_deleted', false)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in getCurrentUserProfile:', error);
    return null;
  }
}

/**
 * Get the current user's complete profile with related data
 * 
 * Includes:
 * - Organization details
 * - Role details
 * - Department details
 * 
 * @returns Extended user profile or null
 */
export async function getCurrentUserProfileExtended() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return null;
    }
    
    // Fetch with joins - RLS on each table ensures proper access
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        status,
        last_login,
        created_at,
        organization:organizations (
          id,
          name,
          slug,
          status
        ),
        role:roles (
          id,
          name
        ),
        department:departments (
          id,
          name
        )
      `)
      .eq('id', user.id)
      .eq('is_deleted', false)
      .single();
    
    if (error) {
      console.error('Error fetching extended profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in getCurrentUserProfileExtended:', error);
    return null;
  }
}

/**
 * Get all users in the current user's organization
 * 
 * RLS automatically ensures:
 * - Only users from the same organization are returned
 * - Soft-deleted users are excluded
 * 
 * @returns Array of UserProfile
 */
export async function getUsersInOrganization(): Promise<UserProfile[]> {
  try {
    const supabase = await createClient();
    
    // RLS policy "users_select_same_org" automatically filters by organization
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        organization_id,
        department_id,
        role_id,
        status,
        last_login,
        created_at,
        updated_at
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users in organization:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getUsersInOrganization:', error);
    return [];
  }
}

/**
 * Get users in organization with extended details
 * 
 * Includes role and department information
 * 
 * @returns Array of users with related data
 */
export async function getUsersInOrganizationExtended() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        status,
        last_login,
        created_at,
        role:roles (
          id,
          name
        ),
        department:departments (
          id,
          name
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users with details:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getUsersInOrganizationExtended:', error);
    return [];
  }
}

/**
 * Get a specific user by ID
 * 
 * RLS ensures:
 * - User must be in the same organization
 * - User must not be deleted
 * 
 * @param userId - UUID of the user to fetch
 * @returns UserProfile or null
 */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();
    
    // RLS will block access if user is not in same organization
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        organization_id,
        department_id,
        role_id,
        status,
        last_login,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .eq('is_deleted', false)
      .single();
    
    if (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in getUserById:', error);
    return null;
  }
}

/**
 * Update the current user's profile
 * 
 * RLS ensures:
 * - User can only update their own profile
 * - Cannot change organization_id or role_id
 * 
 * @param updates - Partial user data to update
 * @returns Updated UserProfile or null
 */
export async function updateCurrentUserProfile(
  updates: Partial<Pick<UserProfile, 'email' | 'status'>>
): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return null;
    }
    
    // RLS policy "users_update_own" ensures user can only update themselves
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .eq('is_deleted', false)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in updateCurrentUserProfile:', error);
    return null;
  }
}

/**
 * Update last login timestamp for current user
 * 
 * Called after successful authentication
 * 
 * @returns boolean indicating success
 */
export async function updateLastLogin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }
    
    const { error } = await supabase
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (error) {
      console.error('Error updating last login:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error in updateLastLogin:', error);
    return false;
  }
}

/**
 * Get user's permissions
 * 
 * Returns all permissions assigned to the user's role
 * 
 * @returns Array of permissions
 */
export async function getCurrentUserPermissions() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return [];
    }
    
    // Get user's role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', user.id)
      .eq('is_deleted', false)
      .single();
    
    if (userError || !userData?.role_id) {
      return [];
    }
    
    // Get permissions for the role
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission:permissions (
          id,
          module,
          action
        )
      `)
      .eq('role_id', userData.role_id);
    
    if (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
    
    return data?.map(rp => rp.permission) || [];
  } catch (error) {
    console.error('Unexpected error in getCurrentUserPermissions:', error);
    return [];
  }
}



/**
 * Check if current user is an admin
 * 
 * @returns boolean indicating if user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('is_admin');
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Unexpected error in isAdmin:', error);
    return false;
  }
}

/**
 * Check if current user is a super admin
 * 
 * @returns boolean indicating if user has super_admin role
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('is_super_admin');
    
    if (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Unexpected error in isSuperAdmin:', error);
    return false;
  }
}
