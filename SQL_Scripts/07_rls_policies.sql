-- ============================================
-- 07_RLS_POLICIES.SQL
-- All Row Level Security policies (FINAL STATE)
-- ============================================
-- Consolidates: Phase2.sql policies, 17_rls_policies.sql,
-- fix_admin_rls.sql, 19_activity_logs.sql, 21_phase6_configuration.sql
--
-- All policies use the FINAL function names (current_user_org_id, is_admin, etc.)
-- and include admin write access for configurations/toggles/role_permissions.

-- ============================================
-- USERS
-- ============================================

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id AND is_deleted = FALSE);

CREATE POLICY "users_select_same_org"
  ON users FOR SELECT
  USING (organization_id = public.current_user_org_id() AND is_deleted = FALSE);

-- Admin can see all users in org including deleted
CREATE POLICY "users_select_admin"
  ON users FOR SELECT
  USING (public.is_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND organization_id = public.current_user_org_id());

CREATE POLICY "users_insert_admin"
  ON users FOR INSERT
  WITH CHECK (public.is_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "users_update_admin"
  ON users FOR UPDATE
  USING (public.is_admin() AND organization_id = public.current_user_org_id())
  WITH CHECK (public.is_admin() AND organization_id = public.current_user_org_id());

-- ============================================
-- ORGANIZATIONS
-- ============================================

CREATE POLICY "organizations_select_own"
  ON organizations FOR SELECT
  USING (id = public.current_user_org_id());

CREATE POLICY "organizations_select_super_admin"
  ON organizations FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "organizations_insert_super_admin"
  ON organizations FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "organizations_update_org_admin"
  ON organizations FOR UPDATE
  USING (id = public.current_user_org_id() AND public.is_admin())
  WITH CHECK (id = public.current_user_org_id() AND public.is_admin());

-- ============================================
-- DEPARTMENTS
-- ============================================

CREATE POLICY "departments_select_same_org"
  ON departments FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "departments_insert_admin"
  ON departments FOR INSERT
  WITH CHECK (public.is_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "departments_update_admin"
  ON departments FOR UPDATE
  USING (public.is_admin() AND organization_id = public.current_user_org_id())
  WITH CHECK (public.is_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "departments_delete_admin"
  ON departments FOR DELETE
  USING (public.is_admin() AND organization_id = public.current_user_org_id());

-- ============================================
-- ROLES
-- ============================================

CREATE POLICY "roles_select_accessible"
  ON roles FOR SELECT
  USING (organization_id IS NULL OR organization_id = public.current_user_org_id());

CREATE POLICY "roles_insert_org_admin"
  ON roles FOR INSERT
  WITH CHECK (
    public.is_admin() AND (
      organization_id = public.current_user_org_id()
      OR (organization_id IS NULL AND public.is_super_admin())
    )
  );

CREATE POLICY "roles_update_org_admin"
  ON roles FOR UPDATE
  USING (
    public.is_admin() AND (
      organization_id = public.current_user_org_id()
      OR (organization_id IS NULL AND public.is_super_admin())
    )
  )
  WITH CHECK (
    public.is_admin() AND (
      organization_id = public.current_user_org_id()
      OR (organization_id IS NULL AND public.is_super_admin())
    )
  );

CREATE POLICY "roles_delete_org_admin"
  ON roles FOR DELETE
  USING (
    public.is_admin() AND (
      organization_id = public.current_user_org_id()
      OR (organization_id IS NULL AND public.is_super_admin())
    )
  );

-- ============================================
-- PERMISSIONS
-- ============================================

CREATE POLICY "permissions_select_all"
  ON permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "permissions_insert_super_admin"
  ON permissions FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "permissions_update_super_admin"
  ON permissions FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "permissions_delete_super_admin"
  ON permissions FOR DELETE
  USING (public.is_super_admin());

-- ============================================
-- ROLE_PERMISSIONS
-- ============================================

CREATE POLICY "role_permissions_select_all"
  ON role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "role_permissions_insert_admin"
  ON role_permissions FOR INSERT
  WITH CHECK (
    public.is_admin() AND EXISTS (
      SELECT 1 FROM roles r WHERE r.id = role_id
      AND (r.organization_id = public.current_user_org_id()
           OR (r.organization_id IS NULL AND public.is_super_admin()))
    )
  );

CREATE POLICY "role_permissions_delete_admin"
  ON role_permissions FOR DELETE
  USING (
    public.is_admin() AND EXISTS (
      SELECT 1 FROM roles r WHERE r.id = role_id
      AND (r.organization_id = public.current_user_org_id()
           OR (r.organization_id IS NULL AND public.is_super_admin()))
    )
  );

-- Admin full management of org role permissions (from Phase 6)
CREATE POLICY "Admins manage org role permissions"
  ON role_permissions FOR ALL
  USING (
    public.is_admin() AND EXISTS (
      SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id
      AND (r.organization_id = public.current_user_org_id()
           OR (r.organization_id IS NULL AND public.is_super_admin()))
    )
  )
  WITH CHECK (
    public.is_admin() AND EXISTS (
      SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id
      AND (r.organization_id = public.current_user_org_id()
           OR (r.organization_id IS NULL AND public.is_super_admin()))
    )
  );

-- ============================================
-- INTERN PROFILES (includes fix_admin_rls.sql)
-- ============================================

CREATE POLICY "Users can view intern profiles in their organization"
  ON intern_profiles FOR SELECT
  USING (
    organization_id = public.current_user_org_id() 
    AND (is_deleted = FALSE OR public.is_admin())
  );

CREATE POLICY "Users can insert their own intern profile"
  ON intern_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id = public.current_user_org_id());

CREATE POLICY "Users can update their own intern profile"
  ON intern_profiles FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (public.is_admin() AND organization_id = public.current_user_org_id())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (public.is_admin() AND organization_id = public.current_user_org_id())
  );

CREATE POLICY "Admins can manage intern profiles in their organization"
  ON intern_profiles FOR ALL
  USING (public.is_admin() AND organization_id = public.current_user_org_id())
  WITH CHECK (public.is_admin() AND organization_id = public.current_user_org_id());

-- ============================================
-- PROFILE FIELDS
-- ============================================

CREATE POLICY "Users can view profile fields in their organization"
  ON profile_fields FOR SELECT
  USING (organization_id = public.current_user_org_id() AND is_active = TRUE);

-- ============================================
-- PROFILE FIELD VALUES
-- ============================================

CREATE POLICY "Users can view profile field values in their organization"
  ON profile_field_values FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM intern_profiles ip
    WHERE ip.id = profile_field_values.profile_id
    AND ip.organization_id = public.current_user_org_id()
  ));

CREATE POLICY "Users can manage their own profile field values"
  ON profile_field_values FOR ALL
  USING (EXISTS (
    SELECT 1 FROM intern_profiles ip
    WHERE ip.id = profile_field_values.profile_id AND ip.user_id = auth.uid()
  ));

-- ============================================
-- PROJECTS
-- ============================================

CREATE POLICY "Users can view projects in their organization"
  ON projects FOR SELECT
  USING (
    organization_id = public.current_user_org_id() 
    AND (is_deleted = FALSE OR public.is_admin())
  );

CREATE POLICY "Users can create projects in their organization"
  ON projects FOR INSERT
  WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY "Admins can manage projects in their organization"
  ON projects FOR ALL
  USING (public.is_admin() AND organization_id = public.current_user_org_id())
  WITH CHECK (public.is_admin() AND organization_id = public.current_user_org_id());

-- ============================================
-- TASKS
-- ============================================

CREATE POLICY "Users can view tasks in their organization"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND p.organization_id = public.current_user_org_id()
    )
    AND (is_deleted = FALSE OR public.is_admin())
  );

CREATE POLICY "Users can update tasks assigned to them"
  ON tasks FOR UPDATE
  USING (assigned_to = auth.uid());

CREATE POLICY "Admins can manage tasks in their organization"
  ON tasks FOR ALL
  USING (
    public.is_admin() 
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND p.organization_id = public.current_user_org_id()
    )
  )
  WITH CHECK (
    public.is_admin() 
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND p.organization_id = public.current_user_org_id()
    )
  );

-- ============================================
-- TASK EVENTS
-- ============================================

CREATE POLICY "Users can view task events in their organization"
  ON task_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_events.task_id AND p.organization_id = public.current_user_org_id()
  ));

-- ============================================
-- WORK LOGS
-- ============================================

CREATE POLICY "Users can view work logs in their organization"
  ON work_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t JOIN projects p ON t.project_id = p.id
    WHERE t.id = work_logs.task_id AND p.organization_id = public.current_user_org_id()
  ));

CREATE POLICY "Users can create their own work logs"
  ON work_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- ATTENDANCE & LEAVE
-- ============================================

CREATE POLICY "Users can view attendance in their organization"
  ON attendance FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can manage their own attendance"
  ON attendance FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view leave requests in their organization"
  ON leave_requests FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can create their own leave requests"
  ON leave_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id = public.current_user_org_id());

-- ============================================
-- EVALUATIONS, CERTIFICATES, FEEDBACKS
-- ============================================

CREATE POLICY "Users can view evaluations in their organization"
  ON evaluations FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can view certificates in their organization"
  ON certificates FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can view feedbacks in their organization"
  ON feedbacks FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can create their own feedback"
  ON feedbacks FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id = public.current_user_org_id());

-- ============================================
-- BADGES
-- ============================================

CREATE POLICY "Users can view all badges"
  ON badges FOR SELECT
  USING (true);

CREATE POLICY "Users can view user badges in their organization"
  ON user_badges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = user_badges.user_id
    AND u.organization_id = public.current_user_org_id()
  ));

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE POLICY "Users can view documents in their organization"
  ON documents FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can upload their own documents"
  ON documents FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id = public.current_user_org_id());

-- ============================================
-- COMMENTS
-- ============================================

CREATE POLICY "Users can view comments in their organization"
  ON comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t JOIN projects p ON t.project_id = p.id
    WHERE t.id = comments.task_id AND p.organization_id = public.current_user_org_id()
  ));

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- RESOURCES
-- ============================================

CREATE POLICY "Users can view resources in their organization"
  ON resources FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can view resource progress in their organization"
  ON resource_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = resource_progress.user_id
    AND u.organization_id = public.current_user_org_id()
  ));

CREATE POLICY "Users can manage their own resource progress"
  ON resource_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- CONFIGURATIONS (includes Phase 6 admin write policies)
-- ============================================

CREATE POLICY "Users can view configurations for their scope"
  ON configurations FOR SELECT
  USING (
    (scope_type = 'global') OR
    (scope_type = 'organization' AND scope_id = public.current_user_org_id()) OR
    (scope_type = 'user' AND scope_id = auth.uid())
  );

CREATE POLICY "Admins insert organization configurations"
  ON configurations FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND scope_type = 'organization'
    AND scope_id = public.current_user_org_id()
  );

CREATE POLICY "Admins update organization configurations"
  ON configurations FOR UPDATE
  USING (public.is_admin() AND scope_type = 'organization' AND scope_id = public.current_user_org_id())
  WITH CHECK (public.is_admin() AND scope_type = 'organization' AND scope_id = public.current_user_org_id());

CREATE POLICY "Admins delete organization configurations"
  ON configurations FOR DELETE
  USING (public.is_admin() AND scope_type = 'organization' AND scope_id = public.current_user_org_id());

CREATE POLICY "Super admins manage global configurations"
  ON configurations FOR ALL
  USING (public.is_super_admin() AND scope_type = 'global')
  WITH CHECK (public.is_super_admin() AND scope_type = 'global');

-- ============================================
-- FEATURE TOGGLES (includes Phase 6 admin write policies)
-- ============================================

CREATE POLICY "Users can view feature toggles in their organization"
  ON feature_toggles FOR SELECT
  USING (organization_id = public.current_user_org_id() OR organization_id IS NULL);

CREATE POLICY "Admins insert org feature toggles"
  ON feature_toggles FOR INSERT
  WITH CHECK (public.is_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "Admins update org feature toggles"
  ON feature_toggles FOR UPDATE
  USING (public.is_admin() AND organization_id = public.current_user_org_id())
  WITH CHECK (public.is_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "Admins delete org feature toggles"
  ON feature_toggles FOR DELETE
  USING (public.is_admin() AND organization_id = public.current_user_org_id());

-- ============================================
-- WORKFLOWS
-- ============================================

CREATE POLICY "Users can view workflows in their organization"
  ON workflows FOR SELECT
  USING (organization_id = public.current_user_org_id());

-- ============================================
-- PRIVACY SYSTEM
-- ============================================

CREATE POLICY "Users can view data classifications"
  ON data_classifications FOR SELECT
  USING (true);

CREATE POLICY "Users can view field privacy rules"
  ON field_privacy_rules FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own consents"
  ON consents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own consents"
  ON consents FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND organization_id = public.current_user_org_id());

CREATE POLICY "Users can view their own consent logs"
  ON consent_logs FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- ACTIVITY LOGS (includes 19_activity_logs.sql policies)
-- ============================================

CREATE POLICY "Users can view activity logs in their organization"
  ON activity_logs FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can insert activity logs for their organization"
  ON activity_logs FOR INSERT
  WITH CHECK (organization_id = public.current_user_org_id());

-- ============================================
-- ACCESS LOGS & SESSIONS
-- ============================================

CREATE POLICY "Users can view access logs in their organization"
  ON access_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = access_logs.user_id
    AND u.organization_id = public.current_user_org_id()
  ));

CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- EXPORTS & WEBHOOKS
-- ============================================

CREATE POLICY "Users can view their own exports"
  ON exports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own exports"
  ON exports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view webhooks in their organization"
  ON webhooks FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can view webhook logs in their organization"
  ON webhook_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM webhooks w WHERE w.id = webhook_logs.webhook_id
    AND w.organization_id = public.current_user_org_id()
  ));

-- ============================================
-- ANALYTICS & PREFERENCES
-- ============================================

CREATE POLICY "Users can view analytics cache for their organization"
  ON analytics_cache FOR SELECT
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can manage their own preferences"
  ON user_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
