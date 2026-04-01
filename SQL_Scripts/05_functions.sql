-- ============================================
-- 05_FUNCTIONS.SQL
-- All helper functions, triggers, and stored procedures
-- ============================================
-- Consolidates: 16_triggers_functions.sql, Phase2.sql (helper functions),
-- fix_intern_lifecycle.sql, fix_orphan_users.sql, fix_registration_trigger.sql,
-- manual_sync.sql, public_auth_helpers.sql, and 21_phase6 (is_admin).
--
-- FINAL STATE: All functions reflect the latest production behavior.

-- ============================================
-- PART 1: RLS HELPER FUNCTIONS
-- ============================================

-- Get current user's organization ID
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.current_user_org_id() IS
'Returns the organization_id of the currently authenticated user. Used in RLS policies.';

-- Backward compatibility alias (used by old RLS policies from 17_rls_policies.sql)
CREATE OR REPLACE FUNCTION public.user_organization_id()
RETURNS UUID AS $$
  SELECT public.current_user_org_id();
$$ LANGUAGE SQL SECURITY DEFINER;

COMMENT ON FUNCTION public.user_organization_id() IS
'Alias for current_user_org_id() for backward compatibility.';

-- Get current user's role ID
CREATE OR REPLACE FUNCTION public.current_user_role_id()
RETURNS UUID AS $$
  SELECT role_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get current user's role name
CREATE OR REPLACE FUNCTION public.current_user_role_name()
RETURNS TEXT AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(module_name TEXT, action_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.role_permissions rp ON u.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE u.id = auth.uid()
      AND p.module = module_name
      AND p.action = action_name
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user has permission (original name from 17_rls_policies.sql)
CREATE OR REPLACE FUNCTION public.has_permission(module_name TEXT, action_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT public.user_has_permission(module_name, action_name);
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is admin
-- FINAL VERSION: includes super_admin, org_admin, AND org-scoped 'Admin' role name
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND u.is_deleted = FALSE
      AND (
        r.name IN ('super_admin', 'org_admin')
        OR r.name = 'Admin'
        OR (r.organization_id IS NOT NULL AND lower(r.name) = 'admin')
      )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin() IS
'True for super_admin, org_admin, or organization-scoped Admin role.';

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.name = 'super_admin'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get complete user profile
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  organization_id UUID,
  organization_name TEXT,
  role_id UUID,
  role_name TEXT,
  department_id UUID,
  status TEXT
) AS $$
  SELECT
    u.id,
    u.email,
    u.organization_id,
    o.name as organization_name,
    u.role_id,
    r.name as role_name,
    u.department_id,
    u.status
  FROM public.users u
  LEFT JOIN public.organizations o ON u.organization_id = o.id
  LEFT JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid()
    AND u.is_deleted = FALSE;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if target user is in same organization
CREATE OR REPLACE FUNCTION public.is_same_organization(target_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u1
    JOIN public.users u2 ON u1.organization_id = u2.organization_id
    WHERE u1.id = auth.uid()
      AND u2.id = target_user_id
      AND u1.is_deleted = FALSE
      AND u2.is_deleted = FALSE
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Public helper: check if user email exists (for login page feedback)
CREATE OR REPLACE FUNCTION public.check_user_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE LOWER(email) = LOWER(p_email)
      AND is_deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO authenticated;

-- Helper to get default organization ID
CREATE OR REPLACE FUNCTION public.get_default_org_id()
RETURNS UUID AS $$
  SELECT id FROM organizations WHERE slug = 'default-org' LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Helper to get default role ID
CREATE OR REPLACE FUNCTION public.get_default_role_id()
RETURNS UUID AS $$
  SELECT id FROM roles WHERE name = 'intern' AND organization_id IS NULL LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- PART 2: TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intern_profiles_updated_at
    BEFORE UPDATE ON intern_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create task events on task changes
CREATE OR REPLACE FUNCTION create_task_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO task_events (task_id, event_type, user_id)
        VALUES (NEW.id, 'created', auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO task_events (task_id, event_type, user_id)
            VALUES (NEW.id, 'status_changed', auth.uid());
        END IF;
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO task_events (task_id, event_type, user_id)
            VALUES (NEW.id, 'reassigned', auth.uid());
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER task_event_trigger
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION create_task_event();

-- Soft delete helper (for future use)
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_deleted = TRUE;
    NEW.deleted_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync intern_profiles.status → users.status
CREATE OR REPLACE FUNCTION public.sync_intern_status_to_users()
RETURNS TRIGGER AS $$
DECLARE
  v_mapped_status TEXT;
BEGIN
  IF NEW.status = 'approved' OR NEW.status = 'active' THEN
    v_mapped_status := 'active';
  ELSIF NEW.status = 'draft' THEN
    v_mapped_status := 'draft';
  ELSE
    v_mapped_status := NEW.status;
  END IF;

  UPDATE public.users
  SET status = v_mapped_status,
      updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_sync_intern_status_update
  AFTER UPDATE OF status ON public.intern_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_intern_status_to_users();

CREATE TRIGGER tr_sync_intern_status_insert
  AFTER INSERT ON public.intern_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_intern_status_to_users();

-- ============================================
-- PART 3: AUTH SYNC TRIGGER
-- ============================================
-- When a new user signs up in Supabase Auth, automatically create
-- a row in public.users with status='draft' and intern role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_role_id UUID;
BEGIN
  -- Smart Org Selection: try kovax -> default-org -> first available
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'kovax' LIMIT 1;
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'default-org' LIMIT 1;
  END IF;
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  END IF;

  -- Select the intern role
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'intern' AND organization_id IS NULL LIMIT 1;

  INSERT INTO public.users (
    id, organization_id, role_id, email, status, created_at, updated_at
  )
  VALUES (
    NEW.id, v_org_id, v_role_id, NEW.email,
    'draft',  -- New users start as draft, require admin approval
    NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user trigger warning: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Activity log trigger function (for future automated logging)
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, organization_id, action, entity_type, entity_id, metadata)
    VALUES (
        auth.uid(),
        public.current_user_org_id(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on activity_logs
GRANT SELECT, INSERT ON activity_logs TO authenticated;
