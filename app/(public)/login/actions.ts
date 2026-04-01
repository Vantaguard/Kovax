'use server';

import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { updateLastLogin } from '@/services/user.service';
import { logActivity, LOG_ACTIONS, ENTITY_TYPES } from '@/services/log.service';
import { headers } from 'next/headers';

/**
 * Server-side check: verify user status allows login.
 * Admin roles bypass this check.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkUserStatus(): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { allowed: false, reason: 'Authentication failed.' };
  }

  // Fetch user record with role info
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('status, role:roles(name)')
    .eq('id', user.id)
    .eq('is_deleted', false)
    .single();

  if (userError || !userRecord) {
    // No user record means the trigger didn't fire — sign them out
    await supabase.auth.signOut();
    return { allowed: false, reason: 'Your account is not yet set up. Please contact your administrator.' };
  }

  // Admin roles always allowed
  const role = Array.isArray(userRecord.role) ? userRecord.role[0] : userRecord.role;
  const roleName = (role as { name?: string })?.name?.toLowerCase();
  if (roleName === 'super_admin' || roleName === 'org_admin') {
    return { allowed: true };
  }

  // Check user status
  const status = userRecord.status;

  if (status === 'draft') {
    await supabase.auth.signOut();
    return { allowed: false, reason: 'Your account is pending admin approval. Please wait for your administrator to activate your account.' };
  }

  if (status === 'inactive') {
    await supabase.auth.signOut();
    return { allowed: false, reason: 'This account is currently inactive. Please contact your administrator if you believe this is an error.' };
  }

  if (status === 'rejected') {
    await supabase.auth.signOut();
    return { allowed: false, reason: 'Your intern application has been rejected by the administrator.' };
  }

  if (status !== 'active') {
    await supabase.auth.signOut();
    return { allowed: false, reason: `Your account status is currently "${status}". Only active accounts can sign in.` };
  }

  return { allowed: true };
}

export async function processLoginSuccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await updateLastLogin();
    await logActivity({
      action: LOG_ACTIONS.USER_LOGIN,
      entity_type: ENTITY_TYPES.USER,
      entity_id: user.id,
    });
  }
}

export async function checkLoginRateLimit() {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(ip, RATE_LIMITS.login);
  if (!rateLimit.allowed) {
    return { error: 'Rate limit exceeded. Please try again later.' };
  }
  return { success: true };
}

export async function checkUserExists(email: string): Promise<boolean> {
  const supabase = await createClient();
  
  // Using RPC to call the SECURITY DEFINER function which can check existence on guest's behalf
  const { data, error } = await supabase.rpc('check_user_exists', { p_email: email });
  
  if (error) {
    console.error('RPC Error checking user existence:', error);
    return true; // Fail safe to true to avoid revealing existence on error or blocking valid logins
  }
  
  return !!data;
}

export async function processLogout() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await logActivity({
      action: LOG_ACTIONS.USER_LOGOUT,
      entity_type: ENTITY_TYPES.USER,
      entity_id: user.id,
    });
  }
}
