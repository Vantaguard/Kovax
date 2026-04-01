import { ForbiddenError } from '@/lib/errors';
import { FEATURE_TO_PERMISSION_MODULE, type FeatureModuleName } from '@/lib/phase6/keys';
import { isModuleEnabled } from '@/services/feature-toggle.service';
import { hasPermission } from '@/services/permission.service';
import { getServerAuthContext } from '@/lib/phase6/auth-context';

export type CrudAction = 'view' | 'create' | 'update' | 'delete' | 'read';

/**
 * Throws ForbiddenError if module feature is off for the org.
 */
export async function assertModuleEnabled(
  organizationId: string,
  module: FeatureModuleName
): Promise<void> {
  const ok = await isModuleEnabled(organizationId, module);
  if (!ok) {
    throw new ForbiddenError('This module is disabled for your organization');
  }
}

/**
 * Throws ForbiddenError if user lacks permission (dynamic matrix).
 */
export async function assertPermission(
  userId: string,
  module: string,
  action: CrudAction
): Promise<void> {
  const act = action === 'read' ? 'view' : action;
  const allowed = await hasPermission(userId, module, act);
  if (!allowed) {
    throw new ForbiddenError('You do not have permission to perform this action');
  }
}

/**
 * Feature toggle + permission for a core module CRUD operation.
 */
export async function assertModuleAndPermission(
  organizationId: string,
  feature: FeatureModuleName,
  action: CrudAction
): Promise<void> {
  await assertModuleEnabled(organizationId, feature);
  const ctx = await getServerAuthContext();
  if (!ctx) throw new ForbiddenError('Authentication required');
  const mod = FEATURE_TO_PERMISSION_MODULE[feature];
  await assertPermission(ctx.userId, mod, action);
}

/**
 * Convenience: current org from auth context.
 */
export async function assertCurrentUserModule(
  feature: FeatureModuleName,
  action: CrudAction
): Promise<{ organizationId: string; userId: string }> {
  const ctx = await getServerAuthContext();
  if (!ctx) throw new ForbiddenError('Authentication required');
  await assertModuleAndPermission(ctx.organizationId, feature, action);
  return { organizationId: ctx.organizationId, userId: ctx.userId };
}
