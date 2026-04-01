/**
 * RECOMMENDATION SERVICE — PHASE 8
 *
 * Rule-based, lightweight intelligence using existing data.
 * No AI models — pure data-driven insights.
 *
 * ARCHITECTURE:
 * 1. Queries existing tables for patterns (overdue tasks, incomplete profiles, etc.)
 * 2. Returns actionable recommendations based on role
 * 3. Admin insights aggregate across the organization
 * 4. Intern recommendations are self-scoped
 *
 * CRITICAL RULES:
 * - No AI — rule-based only
 * - Uses existing data (no new data structures)
 * - Respects RBAC (admin vs intern)
 * - Organization-scoped
 */

import { createClient } from '@/lib/supabase/server';
import { getServerAuthContext, isInternRole } from '@/lib/phase6/auth-context';
import { UnauthorizedError, sanitizeError } from '@/lib/errors';

// ============================================
// TYPES
// ============================================

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';
export type RecommendationCategory = 'profile' | 'task' | 'activity' | 'compliance' | 'management';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface AdminInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  value: number;
  trend?: 'up' | 'down' | 'stable';
  actionUrl?: string;
}

// ============================================
// USER RECOMMENDATIONS
// ============================================

/**
 * Get personalized recommendations for a user.
 * Adapts based on role (intern vs admin).
 */
export async function getUserRecommendations(userId: string): Promise<Recommendation[]> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const supabase = await createClient();
    const recommendations: Recommendation[] = [];

    if (isInternRole(ctx.roleName)) {
      // Intern-specific recommendations
      const internRecs = await getInternRecommendations(supabase, ctx.userId, ctx.organizationId);
      recommendations.push(...internRecs);
    } else {
      // Admin/mentor recommendations
      const adminRecs = await getAdminRecommendations(supabase, ctx.organizationId);
      recommendations.push(...adminRecs);
    }

    // Sort by priority (critical > high > medium > low)
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

    return recommendations;
  } catch (error) {
    console.error('[RecommendationService] Error:', error);
    return [];
  }
}

// ============================================
// INTERN RECOMMENDATIONS
// ============================================

async function getInternRecommendations(
  supabase: any,
  userId: string,
  organizationId: string
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  // 1. Check for incomplete profile
  const { data: internProfile } = await supabase
    .from('intern_profiles')
    .select('id, status, tenure_start, tenure_end')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!internProfile) {
    recommendations.push({
      id: 'no-profile',
      title: 'Create Your Intern Profile',
      description: 'You haven\'t created your intern profile yet. Set it up to get started.',
      category: 'profile',
      priority: 'critical',
      actionUrl: '/dashboard/profile',
    });
  } else {
    if (internProfile.status === 'draft' || internProfile.status === 'pending') {
      recommendations.push({
        id: 'profile-pending',
        title: 'Profile Pending Approval',
        description: 'Your intern profile is awaiting admin approval. Ensure all fields are complete.',
        category: 'profile',
        priority: 'medium',
        actionUrl: '/dashboard/profile',
      });
    }

    if (!internProfile.tenure_start || !internProfile.tenure_end) {
      recommendations.push({
        id: 'missing-tenure',
        title: 'Set Your Tenure Dates',
        description: 'Your internship start or end date is missing. Update your profile.',
        category: 'profile',
        priority: 'high',
        actionUrl: '/dashboard/profile',
      });
    }
  }

  // 2. Check for overdue tasks
  const now = new Date().toISOString();
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, deadline')
    .eq('assigned_to', userId)
    .eq('is_deleted', false)
    .neq('status', 'completed')
    .lt('deadline', now)
    .not('deadline', 'is', null);

  if (overdueTasks && overdueTasks.length > 0) {
    recommendations.push({
      id: 'overdue-tasks',
      title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
      description: `You have ${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} past the deadline. Please update or complete them.`,
      category: 'task',
      priority: 'critical',
      actionUrl: '/dashboard/tasks',
      metadata: { count: overdueTasks.length, taskIds: overdueTasks.map((t: any) => t.id) },
    });
  }

  // 3. Check for unstarted tasks
  const { data: pendingTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .eq('is_deleted', false);

  if (pendingTasks && pendingTasks.length > 0) {
    recommendations.push({
      id: 'pending-tasks',
      title: `${pendingTasks.length} Task${pendingTasks.length > 1 ? 's' : ''} Not Started`,
      description: 'You have tasks that are still in pending status. Start working on them.',
      category: 'task',
      priority: 'medium',
      actionUrl: '/dashboard/tasks',
      metadata: { count: pendingTasks.length },
    });
  }

  // 4. Check for missing consent
  const requiredConsents = ['terms_of_service', 'privacy_policy', 'data_processing'];
  const { data: consents } = await supabase
    .from('consents')
    .select('consent_type')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('consent_type', requiredConsents);

  const consentedTypes = new Set((consents || []).map((c: any) => c.consent_type));
  const missingConsents = requiredConsents.filter((t) => !consentedTypes.has(t));

  if (missingConsents.length > 0) {
    recommendations.push({
      id: 'missing-consent',
      title: 'Complete Consent Forms',
      description: `You have ${missingConsents.length} consent form(s) pending. These are required for system access.`,
      category: 'compliance',
      priority: 'critical',
      actionUrl: '/dashboard/consent',
      metadata: { missing: missingConsents },
    });
  }

  // 5. Check for no recent activity (7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentActivity } = await supabase
    .from('activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo);

  if ((recentActivity || 0) === 0) {
    recommendations.push({
      id: 'no-activity',
      title: 'No Recent Activity',
      description: 'You haven\'t had any activity in the last 7 days. Stay engaged with your tasks.',
      category: 'activity',
      priority: 'medium',
      actionUrl: '/dashboard',
    });
  }

  return recommendations;
}

// ============================================
// ADMIN RECOMMENDATIONS
// ============================================

async function getAdminRecommendations(
  supabase: any,
  organizationId: string
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  // 1. Pending intern approvals
  const { count: pendingApprovals } = await supabase
    .from('intern_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .eq('is_deleted', false);

  if ((pendingApprovals || 0) > 0) {
    recommendations.push({
      id: 'pending-approvals',
      title: `${pendingApprovals} Intern${(pendingApprovals || 0) > 1 ? 's' : ''} Pending Approval`,
      description: `Review and approve pending intern profiles to allow system access.`,
      category: 'management',
      priority: 'high',
      actionUrl: '/dashboard/interns',
      metadata: { count: pendingApprovals },
    });
  }

  // 2. Overdue tasks across org
  const now = new Date().toISOString();
  const { data: orgOverdueTasks } = await supabase
    .from('tasks')
    .select(`
      id,
      project:projects!tasks_project_id_fkey (
        organization_id
      )
    `)
    .eq('is_deleted', false)
    .neq('status', 'completed')
    .lt('deadline', now)
    .not('deadline', 'is', null);

  const orgOverdue = (orgOverdueTasks || []).filter((t: any) => {
    const project = Array.isArray(t.project) ? t.project[0] : t.project;
    return project?.organization_id === organizationId;
  });

  if (orgOverdue.length > 0) {
    recommendations.push({
      id: 'org-overdue-tasks',
      title: `${orgOverdue.length} Overdue Task${orgOverdue.length > 1 ? 's' : ''} Across Org`,
      description: 'Multiple tasks have passed their deadline. Follow up with assigned members.',
      category: 'task',
      priority: 'high',
      actionUrl: '/dashboard/tasks',
      metadata: { count: orgOverdue.length },
    });
  }

  // 3. Inactive users (no login in 14 days)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: inactiveUsers } = await supabase
    .from('users')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_deleted', false)
    .eq('status', 'active')
    .or(`last_login.is.null,last_login.lt.${fourteenDaysAgo}`);

  if (inactiveUsers && inactiveUsers.length > 0) {
    recommendations.push({
      id: 'inactive-users',
      title: `${inactiveUsers.length} Inactive User${inactiveUsers.length > 1 ? 's' : ''}`,
      description: 'These users haven\'t logged in for over 14 days. Consider reaching out.',
      category: 'management',
      priority: 'medium',
      actionUrl: '/dashboard/admin',
      metadata: { count: inactiveUsers.length },
    });
  }

  // 4. Blocked tasks
  const { count: blockedTasks } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .eq('status', 'blocked');

  if ((blockedTasks || 0) > 0) {
    recommendations.push({
      id: 'blocked-tasks',
      title: `${blockedTasks} Blocked Task${(blockedTasks || 0) > 1 ? 's' : ''}`,
      description: 'Some tasks are blocked and need attention to unblock progress.',
      category: 'task',
      priority: 'high',
      actionUrl: '/dashboard/tasks',
      metadata: { count: blockedTasks },
    });
  }

  // 5. Projects with no tasks
  const { data: orgProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_deleted', false)
    .eq('status', 'active');

  if (orgProjects) {
    let emptyProjects = 0;
    for (const proj of orgProjects) {
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', proj.id)
        .eq('is_deleted', false);
      if ((count || 0) === 0) emptyProjects++;
    }

    if (emptyProjects > 0) {
      recommendations.push({
        id: 'empty-projects',
        title: `${emptyProjects} Project${emptyProjects > 1 ? 's' : ''} With No Tasks`,
        description: 'Active projects without tasks. Add tasks or archive unused projects.',
        category: 'management',
        priority: 'low',
        actionUrl: '/dashboard/projects',
        metadata: { count: emptyProjects },
      });
    }
  }

  return recommendations;
}

// ============================================
// ADMIN INSIGHTS (AGGREGATE STATS)
// ============================================

/**
 * Get aggregated admin insights for the organization dashboard.
 */
export async function getAdminInsights(orgId: string): Promise<AdminInsight[]> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    if (isInternRole(ctx.roleName)) {
      return []; // Interns don't get admin insights
    }

    const supabase = await createClient();
    const insights: AdminInsight[] = [];
    const now = new Date();

    // 1. Active interns count
    const { count: activeInterns } = await supabase
      .from('intern_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .in('status', ['active', 'approved'])
      .eq('is_deleted', false);

    insights.push({
      id: 'active-interns',
      title: 'Active Interns',
      description: 'Currently active intern profiles',
      category: 'team',
      value: activeInterns || 0,
      actionUrl: '/dashboard/interns',
    });

    // 2. Task completion rate
    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false);

    const { count: completedTasks } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('status', 'completed');

    const completionRate = (totalTasks || 0) > 0
      ? Math.round(((completedTasks || 0) / (totalTasks || 1)) * 100)
      : 0;

    insights.push({
      id: 'task-completion-rate',
      title: 'Task Completion Rate',
      description: 'Percentage of tasks completed',
      category: 'performance',
      value: completionRate,
      actionUrl: '/dashboard/tasks',
    });

    // 3. Activity this week
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: weekActivity } = await supabase
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('created_at', weekAgo);

    insights.push({
      id: 'weekly-activity',
      title: 'Weekly Activity',
      description: 'Actions logged in the last 7 days',
      category: 'engagement',
      value: weekActivity || 0,
      actionUrl: '/dashboard/activity',
    });

    // 4. Active projects
    const { count: activeProjects } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .eq('is_deleted', false);

    insights.push({
      id: 'active-projects',
      title: 'Active Projects',
      description: 'Currently active projects',
      category: 'projects',
      value: activeProjects || 0,
      actionUrl: '/dashboard/projects',
    });

    return insights;
  } catch (error) {
    console.error('[RecommendationService] Error in getAdminInsights:', error);
    return [];
  }
}
