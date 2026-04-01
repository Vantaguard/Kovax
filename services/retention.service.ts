/**
 * DATA RETENTION SERVICE — CONFIG-DRIVEN
 *
 * Manages data lifecycle for soft-deleted records.
 * Retention policies are read from the configurations table.
 *
 * CRITICAL: NO permanent deletion. Records are only MARKED for archival.
 *
 * Config keys (per org):
 *   retention_days_interns  — days before soft-deleted interns are flagged
 *   retention_days_projects — days before soft-deleted projects are flagged
 *   retention_days_tasks    — days before soft-deleted tasks are flagged
 *   retention_days_logs     — days before activity logs are flagged
 */

import { createClient } from '@/lib/supabase/server';
import { UnauthorizedError, DatabaseError, sanitizeError } from '@/lib/errors';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { logActivity, ENTITY_TYPES } from '@/services/log.service';

// ============================================
// TYPES
// ============================================

export interface RetentionPolicy {
  entity: string;
  retention_days: number;
  config_key: string;
}

export interface ExpiredRecord {
  entity_type: string;
  id: string;
  deleted_at: string;
  days_expired: number;
  status: 'pending_archival' | 'archived';
}

export interface RetentionSummary {
  policies: RetentionPolicy[];
  expired_counts: Record<string, number>;
  total_expired: number;
}

// Default retention periods (in days)
const DEFAULT_RETENTION: Record<string, number> = {
  retention_days_interns: 90,
  retention_days_projects: 180,
  retention_days_tasks: 60,
  retention_days_logs: 365,
};

const RETENTION_ENTITIES = [
  { entity: 'intern_profiles', config_key: 'retention_days_interns', entity_type: ENTITY_TYPES.INTERN_PROFILE },
  { entity: 'projects', config_key: 'retention_days_projects', entity_type: ENTITY_TYPES.PROJECT },
  { entity: 'tasks', config_key: 'retention_days_tasks', entity_type: ENTITY_TYPES.TASK },
];

// ============================================
// GET RETENTION POLICY
// ============================================

/**
 * Get retention policies for an organization.
 * Reads from configurations table, falls back to defaults.
 */
export async function getRetentionPolicy(orgId?: string): Promise<RetentionPolicy[]> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const organizationId = orgId || ctx.organizationId;
    const supabase = await createClient();

    // Load org-specific configs
    const { data: configs, error } = await supabase
      .from('configurations')
      .select('key, value')
      .eq('scope_type', 'organization')
      .eq('scope_id', organizationId)
      .in('key', Object.keys(DEFAULT_RETENTION));

    if (error) {
      console.error('Error fetching retention config:', error);
    }

    // Build policy map: org config overrides defaults
    const configMap = new Map<string, number>();
    (configs || []).forEach((c: any) => {
      const val = typeof c.value === 'number' ? c.value : parseInt(String(c.value).replace(/"/g, ''), 10);
      if (!isNaN(val)) configMap.set(c.key, val);
    });

    // Also check global configs as fallback
    const { data: globalConfigs } = await supabase
      .from('configurations')
      .select('key, value')
      .eq('scope_type', 'global')
      .is('scope_id', null)
      .in('key', Object.keys(DEFAULT_RETENTION));

    (globalConfigs || []).forEach((c: any) => {
      if (!configMap.has(c.key)) {
        const val = typeof c.value === 'number' ? c.value : parseInt(String(c.value).replace(/"/g, ''), 10);
        if (!isNaN(val)) configMap.set(c.key, val);
      }
    });

    return RETENTION_ENTITIES.map((re) => ({
      entity: re.entity,
      config_key: re.config_key,
      retention_days: configMap.get(re.config_key) ?? DEFAULT_RETENTION[re.config_key] ?? 90,
    }));
  } catch (error) {
    throw sanitizeError(error);
  }
}

// ============================================
// GET EXPIRED DATA
// ============================================

/**
 * Find soft-deleted records that have exceeded their retention period.
 * Does NOT delete them — only identifies them.
 */
export async function getExpiredData(orgId?: string): Promise<RetentionSummary> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const organizationId = orgId || ctx.organizationId;
    const policies = await getRetentionPolicy(organizationId);
    const supabase = await createClient();

    const expiredCounts: Record<string, number> = {};
    let totalExpired = 0;

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

      const { count, error } = await supabase
        .from(policy.entity)
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', true)
        .lt('deleted_at', cutoffDate.toISOString());

      if (error) {
        console.error(`Error checking expired ${policy.entity}:`, error);
        expiredCounts[policy.entity] = 0;
        continue;
      }

      expiredCounts[policy.entity] = count || 0;
      totalExpired += count || 0;
    }

    return {
      policies,
      expired_counts: expiredCounts,
      total_expired: totalExpired,
    };
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Get detailed list of expired records for a specific entity type.
 */
export async function getExpiredRecords(
  entityTable: string,
  limit: number = 50
): Promise<ExpiredRecord[]> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const policies = await getRetentionPolicy(ctx.organizationId);
    const policy = policies.find((p) => p.entity === entityTable);
    if (!policy) return [];

    const supabase = await createClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

    const { data, error } = await supabase
      .from(entityTable)
      .select('id, deleted_at')
      .eq('is_deleted', true)
      .lt('deleted_at', cutoffDate.toISOString())
      .order('deleted_at', { ascending: true })
      .limit(limit);

    if (error || !data) return [];

    const now = Date.now();
    return data.map((record: any) => ({
      entity_type: entityTable,
      id: record.id,
      deleted_at: record.deleted_at,
      days_expired: Math.floor((now - new Date(record.deleted_at).getTime()) / (1000 * 60 * 60 * 24)),
      status: 'pending_archival' as const,
    }));
  } catch (error) {
    throw sanitizeError(error);
  }
}

// ============================================
// MARK FOR RETENTION (ARCHIVAL SIMULATION)
// ============================================

/**
 * Mark expired records for archival.
 * In production, this would trigger an archival pipeline.
 * Here, we log the action as an audit trail.
 */
export async function markForRetention(entityTable?: string): Promise<{
  marked_count: number;
  entities_processed: string[];
}> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const policies = await getRetentionPolicy(ctx.organizationId);
    const supabase = await createClient();

    let totalMarked = 0;
    const processed: string[] = [];

    const targetPolicies = entityTable
      ? policies.filter((p) => p.entity === entityTable)
      : policies;

    for (const policy of targetPolicies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

      // Count expired records
      const { count, error } = await supabase
        .from(policy.entity)
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', true)
        .lt('deleted_at', cutoffDate.toISOString());

      if (error) {
        console.error(`Error marking ${policy.entity} for retention:`, error);
        continue;
      }

      const expiredCount = count || 0;
      totalMarked += expiredCount;
      processed.push(policy.entity);

      // Log the retention action
      if (expiredCount > 0) {
        await logActivity({
          action: 'retention.marked',
          entity_type: policy.entity,
          metadata: {
            expired_count: expiredCount,
            retention_days: policy.retention_days,
            cutoff_date: cutoffDate.toISOString(),
          },
        });
      }
    }

    return {
      marked_count: totalMarked,
      entities_processed: processed,
    };
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Set a retention policy for an organization via configurations table.
 */
export async function setRetentionPolicy(
  configKey: string,
  retentionDays: number
): Promise<void> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    if (!Object.keys(DEFAULT_RETENTION).includes(configKey)) {
      throw new Error(`Invalid retention config key: ${configKey}`);
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('configurations')
      .upsert({
        scope_type: 'organization',
        scope_id: ctx.organizationId,
        key: configKey,
        value: retentionDays,
      }, {
        onConflict: 'scope_type,scope_id,key',
      });

    if (error) {
      throw new DatabaseError(`Failed to set retention policy: ${error.message}`);
    }

    await logActivity({
      action: 'retention.policy_updated',
      entity_type: 'configuration',
      metadata: { key: configKey, retention_days: retentionDays },
    });
  } catch (error) {
    throw sanitizeError(error);
  }
}
