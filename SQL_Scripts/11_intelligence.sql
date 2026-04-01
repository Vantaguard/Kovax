-- ============================================
-- PHASE 8 — INTELLIGENCE LAYER MIGRATION
-- Notification RLS + Example Workflow Data
-- ============================================
-- Run this AFTER your existing SQL Scripts (01–10)

-- ============================================
-- 1. RLS POLICIES FOR NOTIFICATIONS
-- Users can only see/update their own notifications
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can UPDATE (mark as read) their own notifications
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can INSERT notifications for any user (workflow engine, system)
CREATE POLICY notifications_insert_service ON notifications
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 2. RLS POLICIES FOR EXPORTS
-- ============================================

ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Users can see their own exports
CREATE POLICY exports_select_own ON exports
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create exports
CREATE POLICY exports_insert_own ON exports
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 3. RLS POLICIES FOR WORKFLOWS
-- ============================================

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read workflows in their org
CREATE POLICY workflows_select_org ON workflows
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND is_deleted = false
    )
  );

-- Service role can INSERT/UPDATE workflows
CREATE POLICY workflows_insert_org ON workflows
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND is_deleted = false
    )
  );

CREATE POLICY workflows_update_org ON workflows
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND is_deleted = false
    )
  );

-- ============================================
-- 4. EXAMPLE WORKFLOW RULES
-- Replace 'YOUR_ORG_ID' with the actual org UUID
-- ============================================

-- Example: Notify admins when a new intern is created
-- INSERT INTO workflows (organization_id, trigger_event, conditions, actions, is_active)
-- VALUES (
--   'YOUR_ORG_ID',
--   'intern.created',
--   NULL,
--   '[
--     {
--       "type": "send_notification",
--       "config": {
--         "title": "🆕 New Intern Profile Created",
--         "message": "A new intern profile has been created and may need review.",
--         "notification_type": "approval"
--       }
--     },
--     {
--       "type": "log_event",
--       "config": {
--         "action_name": "workflow.intern.onboarding_started",
--         "message": "Intern onboarding workflow triggered"
--       }
--     }
--   ]'::jsonb,
--   true
-- );

-- Example: Block task creation with 'urgent' priority for interns
-- INSERT INTO workflows (organization_id, trigger_event, conditions, actions, is_active)
-- VALUES (
--   'YOUR_ORG_ID',
--   'task.created',
--   '[{"field": "priority", "operator": "equals", "value": "urgent"}]'::jsonb,
--   '[
--     {
--       "type": "send_notification",
--       "config": {
--         "title": "⚠️ Urgent Task Created",
--         "message": "An urgent task has been created: {{title}}",
--         "notification_type": "alert"
--       }
--     }
--   ]'::jsonb,
--   true
-- );

-- Example: Notify when task status changes to completed
-- INSERT INTO workflows (organization_id, trigger_event, conditions, actions, is_active)
-- VALUES (
--   'YOUR_ORG_ID',
--   'task.status_updated',
--   '[{"field": "status", "operator": "equals", "value": "completed"}]'::jsonb,
--   '[
--     {
--       "type": "send_notification",
--       "config": {
--         "title": "✅ Task Completed",
--         "message": "A task has been marked as completed.",
--         "notification_type": "task"
--       }
--     },
--     {
--       "type": "log_event",
--       "config": {
--         "action_name": "workflow.task.completed",
--         "message": "Task completion workflow fired"
--       }
--     }
--   ]'::jsonb,
--   true
-- );

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Verify notifications RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('notifications', 'exports', 'workflows') 
AND schemaname = 'public';

-- Verify policies exist
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('notifications', 'exports', 'workflows')
ORDER BY tablename, policyname;
