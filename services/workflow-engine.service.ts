/**
 * WORKFLOW ENGINE SERVICE — PHASE 8
 *
 * Dynamic, DB-driven workflow engine for event-driven automation.
 *
 * ARCHITECTURE:
 * 1. Events fire from service layer (intern.created, task.updated, etc.)
 * 2. Engine queries `workflows` table for matching trigger_event + org
 * 3. Conditions are evaluated against the event context
 * 4. Matching workflow actions execute (notify, log, update_field, block_action)
 *
 * CRITICAL RULES:
 * - No hardcoded workflows — everything is DB-driven
 * - All side-effects are logged via logActivity()
 * - RBAC and RLS are never bypassed (uses existing createClient())
 * - Organization-scoped: workflows only fire within their own org
 */

import { createClient } from '@/lib/supabase/server';
import { logActivity, LOG_ACTIONS, ENTITY_TYPES } from '@/services/log.service';
import { sanitizeError } from '@/lib/errors';

// ============================================
// TYPES
// ============================================

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value: any;
}

export interface WorkflowAction {
  type: 'send_notification' | 'log_event' | 'update_field' | 'block_action';
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  organization_id: string;
  trigger_event: string;
  conditions: WorkflowCondition[] | null;
  actions: WorkflowAction[];
  is_active: boolean;
}

export interface WorkflowContext {
  organizationId: string;
  userId: string;
  entityType: string;
  entityId?: string;
  data: Record<string, any>;
  previousData?: Record<string, any>;
}

export interface WorkflowResult {
  workflowId: string;
  triggered: boolean;
  actionsExecuted: string[];
  blocked: boolean;
  errors: string[];
}

// ============================================
// EVENT CONSTANTS
// ============================================

export const WORKFLOW_EVENTS = {
  // Intern events
  INTERN_CREATED: 'intern.created',
  INTERN_UPDATED: 'intern.updated',
  INTERN_APPROVED: 'intern.approved',
  INTERN_REJECTED: 'intern.rejected',
  INTERN_DELETED: 'intern.deleted',

  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',

  // Task events
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_ASSIGNED: 'task.assigned',
  TASK_STATUS_UPDATED: 'task.status_updated',
  TASK_DELETED: 'task.deleted',

  // User events
  USER_LOGIN: 'user.login',
  USER_CREATED: 'user.created',
} as const;

// ============================================
// CORE ENGINE
// ============================================

/**
 * Evaluate all active workflows for a given event type + org.
 * Returns an array of results (one per matching workflow).
 *
 * If any workflow has a block_action, the caller MUST abort the operation.
 */
export async function evaluateWorkflows(
  eventType: string,
  context: WorkflowContext
): Promise<WorkflowResult[]> {
  try {
    const supabase = await createClient();

    // Fetch active workflows for this event in this org
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', context.organizationId)
      .eq('trigger_event', eventType)
      .eq('is_active', true);

    if (error) {
      console.error('[WorkflowEngine] Error fetching workflows:', error);
      return [];
    }

    if (!workflows || workflows.length === 0) {
      return [];
    }

    const results: WorkflowResult[] = [];

    for (const workflow of workflows as Workflow[]) {
      const result: WorkflowResult = {
        workflowId: workflow.id,
        triggered: false,
        actionsExecuted: [],
        blocked: false,
        errors: [],
      };

      try {
        // Evaluate conditions
        const conditionsMet = matchConditions(workflow.conditions, context);

        if (!conditionsMet) {
          results.push(result);
          continue;
        }

        result.triggered = true;

        // Execute actions
        const actionResults = await executeActions(workflow.actions, context, workflow.id);
        result.actionsExecuted = actionResults.executed;
        result.blocked = actionResults.blocked;
        result.errors = actionResults.errors;
      } catch (wfError: any) {
        result.errors.push(wfError?.message || 'Unknown error');
        console.error(`[WorkflowEngine] Error processing workflow ${workflow.id}:`, wfError);
      }

      results.push(result);
    }

    // Log workflow evaluation
    await logActivity({
      action: 'workflow.evaluated',
      entity_type: 'workflow',
      entity_id: context.entityId,
      metadata: {
        event_type: eventType,
        workflows_matched: results.filter((r) => r.triggered).length,
        workflows_blocked: results.filter((r) => r.blocked).length,
        total_workflows: results.length,
      },
    });

    return results;
  } catch (error) {
    console.error('[WorkflowEngine] Fatal error in evaluateWorkflows:', error);
    return [];
  }
}

// ============================================
// CONDITION MATCHING
// ============================================

/**
 * Evaluate a set of conditions against the event context.
 * All conditions must be met (AND logic).
 * If conditions is null/empty, the workflow always matches.
 */
export function matchConditions(
  conditions: WorkflowCondition[] | null,
  context: WorkflowContext
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) => evaluateCondition(condition, context));
}

/**
 * Evaluate a single condition against the context data.
 */
function evaluateCondition(condition: WorkflowCondition, context: WorkflowContext): boolean {
  const { field, operator, value } = condition;

  // Resolve the field value from context.data (supports dot notation)
  const fieldValue = resolveFieldValue(field, context);

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'not_equals':
      return fieldValue !== value;
    case 'contains':
      if (typeof fieldValue === 'string') return fieldValue.includes(String(value));
      if (Array.isArray(fieldValue)) return fieldValue.includes(value);
      return false;
    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > Number(value);
    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < Number(value);
    case 'gte':
      return typeof fieldValue === 'number' && fieldValue >= Number(value);
    case 'lte':
      return typeof fieldValue === 'number' && fieldValue <= Number(value);
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue);
    case 'is_null':
      return fieldValue === null || fieldValue === undefined;
    case 'is_not_null':
      return fieldValue !== null && fieldValue !== undefined;
    default:
      console.warn(`[WorkflowEngine] Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Resolve a field path from the workflow context.
 * Supports dot notation for nested access: "data.status", "previousData.status"
 */
function resolveFieldValue(field: string, context: WorkflowContext): any {
  // First try context.data directly
  if (field in context.data) {
    return context.data[field];
  }

  // Support dot notation (e.g., "previous.status" or "data.user.email")
  const parts = field.split('.');
  let current: any = context;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }

  return current;
}

// ============================================
// ACTION EXECUTION
// ============================================

/**
 * Execute a list of workflow actions.
 * Returns the list of successfully executed action types and whether a block occurred.
 */
async function executeActions(
  actions: WorkflowAction[],
  context: WorkflowContext,
  workflowId: string
): Promise<{ executed: string[]; blocked: boolean; errors: string[] }> {
  const executed: string[] = [];
  const errors: string[] = [];
  let blocked = false;

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'block_action':
          blocked = true;
          executed.push('block_action');
          await logActivity({
            action: 'workflow.action.blocked',
            entity_type: 'workflow',
            entity_id: context.entityId,
            metadata: {
              workflow_id: workflowId,
              reason: action.config?.reason || 'Blocked by workflow rule',
              context_data: { entityType: context.entityType },
            },
          });
          break;

        case 'send_notification':
          await executeNotificationAction(action.config, context, workflowId);
          executed.push('send_notification');
          break;

        case 'log_event':
          await executeLogAction(action.config, context, workflowId);
          executed.push('log_event');
          break;

        case 'update_field':
          await executeUpdateFieldAction(action.config, context, workflowId);
          executed.push('update_field');
          break;

        default:
          console.warn(`[WorkflowEngine] Unknown action type: ${action.type}`);
          errors.push(`Unknown action type: ${action.type}`);
      }
    } catch (actionError: any) {
      errors.push(`Action ${action.type} failed: ${actionError?.message || 'Unknown error'}`);
      console.error(`[WorkflowEngine] Action ${action.type} failed:`, actionError);
    }
  }

  return { executed, blocked, errors };
}

/**
 * Send a notification via the notification service.
 * Lazy import to avoid circular dependencies.
 */
async function executeNotificationAction(
  config: Record<string, any>,
  context: WorkflowContext,
  workflowId: string
): Promise<void> {
  // Dynamically import to avoid circular dep with notification.service
  const { createNotification } = await import('@/services/notification.service');

  const targetUserId = config.target_user_id || context.userId;
  const title = interpolateTemplate(config.title || 'Workflow Notification', context);
  const message = interpolateTemplate(config.message || 'A workflow action was triggered.', context);
  const type = config.notification_type || 'workflow';

  await createNotification(targetUserId, title, message, type, context.organizationId);
}

/**
 * Log a custom event via the log service.
 */
async function executeLogAction(
  config: Record<string, any>,
  context: WorkflowContext,
  workflowId: string
): Promise<void> {
  const action = config.action_name || 'workflow.custom_event';
  const message = interpolateTemplate(config.message || '', context);

  await logActivity({
    action,
    entity_type: context.entityType,
    entity_id: context.entityId,
    metadata: {
      workflow_id: workflowId,
      message,
      ...config.extra_metadata,
    },
  });
}

/**
 * Update a field on the entity that triggered the workflow.
 * IMPORTANT: Uses createClient() — respects RLS.
 */
async function executeUpdateFieldAction(
  config: Record<string, any>,
  context: WorkflowContext,
  workflowId: string
): Promise<void> {
  const { table, field, value } = config;
  if (!table || !field || !context.entityId) {
    console.warn('[WorkflowEngine] update_field: missing table, field, or entityId');
    return;
  }

  // Only allow known tables (whitelist for safety)
  const allowedTables = ['intern_profiles', 'projects', 'tasks', 'users'];
  if (!allowedTables.includes(table)) {
    console.warn(`[WorkflowEngine] update_field: table "${table}" not allowed`);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('id', context.entityId);

  if (error) {
    console.error(`[WorkflowEngine] update_field failed:`, error);
    throw new Error(`Failed to update field: ${error.message}`);
  }

  await logActivity({
    action: 'workflow.action.update_field',
    entity_type: context.entityType,
    entity_id: context.entityId,
    metadata: {
      workflow_id: workflowId,
      table,
      field,
      new_value: value,
    },
  });
}

// ============================================
// TEMPLATE INTERPOLATION
// ============================================

/**
 * Replace {{field}} placeholders in templates with context data.
 */
function interpolateTemplate(template: string, context: WorkflowContext): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, field) => {
    const value = resolveFieldValue(field, context);
    return value !== undefined && value !== null ? String(value) : match;
  });
}

// ============================================
// WORKFLOW MANAGEMENT (CRUD for admin)
// ============================================

/**
 * Get all workflows for an organization (admin view).
 */
export async function getWorkflows(organizationId: string): Promise<Workflow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', organizationId)
      .order('trigger_event', { ascending: true });

    if (error) {
      console.error('[WorkflowEngine] Error fetching workflows:', error);
      return [];
    }

    return (data || []) as Workflow[];
  } catch (error) {
    console.error('[WorkflowEngine] Unexpected error:', error);
    return [];
  }
}

/**
 * Check if any workflow would block an event.
 * Call this BEFORE the actual operation to pre-check.
 */
export async function wouldBlock(
  eventType: string,
  context: WorkflowContext
): Promise<{ blocked: boolean; reason?: string }> {
  const results = await evaluateWorkflows(eventType, context);
  const blockResult = results.find((r) => r.blocked);

  if (blockResult) {
    return { blocked: true, reason: 'Operation blocked by workflow rule' };
  }

  return { blocked: false };
}
