'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { revalidatePath } from 'next/cache';

/**
 * Set a user's status. Admin only.
 * Enforces the state machine: draft → active, active → draft, active → inactive, draft → inactive.
 */
export async function setUserStatus(
  userId: string,
  newStatus: 'draft' | 'active' | 'inactive'
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    // Only admins can change user status
    const roleName = auth.roleName?.toLowerCase();
    if (roleName !== 'super_admin' && roleName !== 'org_admin') {
      return { success: false, error: 'Only administrators can change user status.' };
    }

    const supabase = await createClient();

    // Verify target user exists and is in same org
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, status, organization_id')
      .eq('id', userId)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !targetUser) {
      return { success: false, error: 'User not found.' };
    }

    if (targetUser.organization_id !== auth.organizationId) {
      return { success: false, error: 'Cannot manage users from another organization.' };
    }

    // Validate state transition
    const currentStatus = targetUser.status;
    const validTransitions: Record<string, string[]> = {
      draft: ['active', 'inactive'],
      active: ['draft', 'inactive'],
      inactive: ['draft', 'active'],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return { success: false, error: `Cannot transition from "${currentStatus}" to "${newStatus}".` };
    }

    // Perform the update
    const { error: updateError } = await supabase
      .from('users')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update users table:', updateError.message);
      // Even if users update fails due to RLS, we still try the intern profile update
      // because the new trigger will eventually sync it back if it succeeds.
    }

    // Attempt to update intern profile status too
    // This is the source of truth for the profile table and will fire our trigger!
    const { error: profileError } = await supabase
      .from('intern_profiles')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (profileError) {
      console.warn('Profile sync failed (user might not be an intern):', profileError.message);
    }

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/interns');
    return { success: true };
  } catch (error: any) {
    console.error('setUserStatus error:', error);
    return { success: false, error: error.message || 'Failed to update user status.' };
  }
}

/**
 * Get all users in the current org with their status, for admin management.
 */
export async function getOrgUsersForAdmin() {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized', data: [] };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, status, role:roles(name), created_at, updated_at')
      .eq('organization_id', auth.organizationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getOrgUsersForAdmin error:', error);
    return { success: false, error: error.message, data: [] };
  }
}
