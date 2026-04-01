/**
 * EXPORT SERVICE — PHASE 8
 *
 * Secure data export with privacy enforcement.
 *
 * ARCHITECTURE:
 * 1. User requests export for entity type + filters
 * 2. Service enforces RBAC via assertModuleAndPermission()
 * 3. Data is fetched respecting RLS and soft-delete
 * 4. Privacy masking is applied BEFORE export
 * 5. Export record is created in `exports` table
 * 6. Data returned as CSV or JSON
 *
 * CRITICAL RULES:
 * - RBAC enforced before any data access
 * - Privacy masking applied BEFORE export (never raw data)
 * - Soft-deleted records excluded
 * - RLS filters scope to organization
 * - All exports logged in activity_logs
 */

import { createClient } from '@/lib/supabase/server';
import { getServerAuthContext, isInternRole, getAssignedProjectIdsForUser } from '@/lib/phase6/auth-context';
import { assertModuleAndPermission } from '@/lib/phase6/guards';
import { FEATURE_MODULES } from '@/lib/phase6/keys';
import { UnauthorizedError, ForbiddenError, sanitizeError } from '@/lib/errors';
import { logActivity, ENTITY_TYPES } from '@/services/log.service';
import { maskEmail } from '@/services/privacy.service';

// ============================================
// TYPES
// ============================================

export type ExportEntityType = 'interns' | 'projects' | 'tasks';
export type ExportFormat = 'csv' | 'json';

export interface ExportFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
}

export interface ExportResult {
  data: string;
  filename: string;
  mimeType: string;
  recordCount: number;
  exportId: string;
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

/**
 * Export data for a given entity type with filters and format.
 * Enforces RBAC, privacy masking, and soft-delete filtering.
 */
export async function exportData(
  entityType: ExportEntityType,
  filters: ExportFilters = {},
  format: ExportFormat = 'csv'
): Promise<ExportResult> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    // Enforce module permission
    const featureModule = {
      interns: FEATURE_MODULES.INTERNS,
      projects: FEATURE_MODULES.PROJECTS,
      tasks: FEATURE_MODULES.TASKS,
    }[entityType];

    await assertModuleAndPermission(ctx.organizationId, featureModule, 'view');

    // Interns cannot export data
    if (isInternRole(ctx.roleName)) {
      throw new ForbiddenError('Interns do not have export permissions');
    }

    const supabase = await createClient();

    // Fetch data based on entity type
    let rawData: Record<string, any>[];

    switch (entityType) {
      case 'interns':
        rawData = await fetchInternsForExport(supabase, filters);
        break;
      case 'projects':
        rawData = await fetchProjectsForExport(supabase, filters);
        break;
      case 'tasks':
        rawData = await fetchTasksForExport(supabase, filters, ctx.userId, ctx.roleName);
        break;
      default:
        throw new ForbiddenError('Invalid export entity type');
    }

    // Apply privacy masking
    const maskedData = applyExportPrivacy(rawData, entityType);

    // Generate output
    let output: string;
    let mimeType: string;

    if (format === 'csv') {
      output = generateCSV(maskedData);
      mimeType = 'text/csv';
    } else {
      output = generateJSON(maskedData);
      mimeType = 'application/json';
    }

    const filename = `${entityType}_export_${new Date().toISOString().split('T')[0]}.${format}`;

    // Record export in exports table
    const { data: exportRecord, error: exportError } = await supabase
      .from('exports')
      .insert({
        user_id: ctx.userId,
        type: entityType,
        status: 'completed',
        filters: filters as any,
      })
      .select('id')
      .single();

    const exportId = exportRecord?.id || 'unknown';

    if (exportError) {
      console.warn('[ExportService] Failed to record export:', exportError);
    }

    // Log the export
    await logActivity({
      action: 'data.exported',
      entity_type: entityType,
      metadata: {
        export_id: exportId,
        entity_type: entityType,
        format,
        record_count: maskedData.length,
        filters,
      },
    });

    return {
      data: output,
      filename,
      mimeType,
      recordCount: maskedData.length,
      exportId,
    };
  } catch (error) {
    throw sanitizeError(error);
  }
}

// ============================================
// DATA FETCHERS (RLS-safe, soft-delete filtered)
// ============================================

async function fetchInternsForExport(
  supabase: any,
  filters: ExportFilters
): Promise<Record<string, any>[]> {
  let query = supabase
    .from('intern_profiles')
    .select(`
      id,
      status,
      tenure_start,
      tenure_end,
      created_at,
      updated_at,
      user:users!intern_profiles_user_id_fkey (
        email,
        status
      )
    `)
    .eq('is_deleted', false);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[ExportService] Error fetching interns:', error);
    return [];
  }

  return (data || []).map((row: any) => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    return {
      id: row.id,
      email: user?.email || '',
      intern_status: row.status,
      user_status: user?.status || '',
      tenure_start: row.tenure_start || '',
      tenure_end: row.tenure_end || '',
      created_at: row.created_at,
    };
  });
}

async function fetchProjectsForExport(
  supabase: any,
  filters: ExportFilters
): Promise<Record<string, any>[]> {
  let query = supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      status,
      created_at,
      creator:users!projects_created_by_fkey (
        email
      )
    `)
    .eq('is_deleted', false);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[ExportService] Error fetching projects:', error);
    return [];
  }

  return (data || []).map((row: any) => {
    const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator;
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      status: row.status,
      created_by: creator?.email || '',
      created_at: row.created_at,
    };
  });
}

async function fetchTasksForExport(
  supabase: any,
  filters: ExportFilters,
  userId: string,
  roleName: string | null
): Promise<Record<string, any>[]> {
  let query = supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      deadline,
      created_at,
      project:projects!tasks_project_id_fkey (
        name
      ),
      assigned_user:users!tasks_assigned_to_fkey (
        email
      )
    `)
    .eq('is_deleted', false);

  // Intern scoping handled by RBAC check above (interns are blocked)
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId);
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[ExportService] Error fetching tasks:', error);
    return [];
  }

  return (data || []).map((row: any) => {
    const project = Array.isArray(row.project) ? row.project[0] : row.project;
    const assignedUser = Array.isArray(row.assigned_user) ? row.assigned_user[0] : row.assigned_user;
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      status: row.status,
      priority: row.priority,
      deadline: row.deadline || '',
      project_name: project?.name || '',
      assigned_to: assignedUser?.email || '',
      created_at: row.created_at,
    };
  });
}

// ============================================
// PRIVACY MASKING FOR EXPORTS
// ============================================

/**
 * Apply privacy masking to export data.
 * Masks emails and any PII fields BEFORE generating the file.
 */
function applyExportPrivacy(
  data: Record<string, any>[],
  entityType: ExportEntityType
): Record<string, any>[] {
  return data.map((row) => {
    const masked = { ...row };

    // Mask email fields
    if (masked.email) {
      masked.email = maskEmail(masked.email);
    }
    if (masked.assigned_to && masked.assigned_to.includes('@')) {
      masked.assigned_to = maskEmail(masked.assigned_to);
    }
    if (masked.created_by && masked.created_by.includes('@')) {
      masked.created_by = maskEmail(masked.created_by);
    }

    // Remove internal IDs from exports (keep only business-relevant data)
    // Users get UUIDs stripped for cleaner exports
    delete masked.id;

    return masked;
  });
}

// ============================================
// FORMAT GENERATORS
// ============================================

/**
 * Generate CSV string from array of objects.
 * Uses proper escaping for commas and quotes.
 */
export function generateCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvLines: string[] = [];

  // Header row
  csvLines.push(headers.map(escapeCSVField).join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      return escapeCSVField(String(val));
    });
    csvLines.push(values.join(','));
  }

  return csvLines.join('\n');
}

/**
 * Escape a CSV field (handle commas, quotes, newlines).
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate pretty-printed JSON output.
 */
export function generateJSON(data: Record<string, any>[]): string {
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      record_count: data.length,
      data,
    },
    null,
    2
  );
}
