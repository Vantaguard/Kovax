import { createClient } from '@/lib/supabase/server';

export interface ServerAuthContext {
  userId: string;
  organizationId: string;
  roleId: string | null;
  roleName: string | null;
}

/**
 * Current request user + org + role (for visibility and privacy rules).
 */
export async function getServerAuthContext(): Promise<ServerAuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id,
      organization_id,
      role_id,
      role:roles (
        name
      )
    `
    )
    .eq('id', user.id)
    .eq('is_deleted', false)
    .single();

  if (error || !data) return null;

  const role = Array.isArray(data.role) ? data.role[0] : data.role;
  return {
    userId: data.id,
    organizationId: data.organization_id,
    roleId: data.role_id,
    roleName: role?.name ?? null,
  };
}

export function isInternRole(roleName: string | null): boolean {
  if (!roleName) return false;
  return roleName.toLowerCase() === 'intern';
}

/**
 * Project IDs the user is associated with via assigned tasks (visibility segmentation).
 */
export async function getAssignedProjectIdsForUser(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('assigned_to', userId)
    .eq('is_deleted', false);

  if (error || !data) return [];
  const ids = [...new Set(data.map((r) => r.project_id).filter(Boolean))] as string[];
  return ids;
}
