-- ============================================
-- 08_DEFAULT_DATA.SQL
-- Default organization, global roles, and permissions
-- ============================================
-- This creates the system defaults that MUST exist before users
-- can register. The auth trigger (handle_new_user) depends on these.

-- ============================================
-- PART 1: DEFAULT ORGANIZATION
-- ============================================

INSERT INTO organizations (id, name, slug, status)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Default Organization',
  'default-org',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 2: GLOBAL ROLES
-- ============================================

INSERT INTO roles (name, organization_id) VALUES
  ('super_admin', NULL),
  ('org_admin', NULL),
  ('mentor', NULL),
  ('intern', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- ============================================
-- PART 3: PERMISSIONS (complete matrix)
-- ============================================
-- Includes all modules from 18_seed.sql, 21_phase6, and fix_permissions.sql

INSERT INTO permissions (module, action) VALUES
  -- User management
  ('users', 'view'), ('users', 'create'), ('users', 'update'), ('users', 'delete'),
  -- Projects
  ('projects', 'view'), ('projects', 'create'), ('projects', 'update'), ('projects', 'delete'),
  -- Tasks
  ('tasks', 'view'), ('tasks', 'create'), ('tasks', 'update'), ('tasks', 'delete'),
  -- Interns (Phase 6)
  ('interns', 'view'), ('interns', 'create'), ('interns', 'update'), ('interns', 'delete'),
  -- Attendance & Leave
  ('attendance', 'view'), ('attendance', 'manage'),
  ('leave', 'view'), ('leave', 'create'), ('leave', 'approve'),
  ('leave_requests', 'view'), ('leave_requests', 'create'),
  -- Evaluations & Feedback
  ('evaluations', 'view'), ('evaluations', 'create'),
  ('feedback', 'view'), ('feedback', 'create'),
  -- Documents
  ('documents', 'view'), ('documents', 'upload'), ('documents', 'approve'),
  -- Reports
  ('reports', 'view'), ('reports', 'export'),
  -- Certificates & Badges
  ('certificates', 'view'), ('badges', 'view'),
  -- Notifications
  ('notifications', 'view'),
  -- Config & Features (admin)
  ('config', 'manage'), ('features', 'manage')
ON CONFLICT (module, action) DO NOTHING;

-- ============================================
-- PART 4: DATA CLASSIFICATIONS (privacy system)
-- ============================================

INSERT INTO data_classifications (name) VALUES
  ('public'), ('internal'), ('confidential'), ('restricted')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 5: BADGES
-- ============================================

INSERT INTO badges (name, description) VALUES
  ('Early Bird', 'Awarded for consistent early attendance'),
  ('Team Player', 'Awarded for excellent collaboration'),
  ('Quick Learner', 'Awarded for rapid skill acquisition'),
  ('Problem Solver', 'Awarded for innovative solutions'),
  ('Code Master', 'Awarded for exceptional code quality'),
  ('Mentor', 'Awarded for helping other interns')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 6: DEFAULT INTERN PERMISSIONS
-- ============================================
-- Interns get view-only on core modules (applies to global 'intern' role)

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE LOWER(r.name) = 'intern'
  AND r.organization_id IS NULL
  AND p.module IN ('projects', 'tasks', 'interns', 'attendance', 'leave_requests',
                   'evaluations', 'certificates', 'feedback', 'badges', 'notifications')
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 7: DEFAULT MENTOR PERMISSIONS
-- ============================================
-- Mentors get view + create + update on management modules, view on others

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE LOWER(r.name) = 'mentor'
  AND r.organization_id IS NULL
  AND (
    (p.module IN ('interns', 'attendance', 'leave_requests', 'evaluations', 'feedback')
     AND p.action IN ('view', 'create', 'update'))
    OR (p.module IN ('projects', 'tasks', 'badges', 'notifications')
     AND p.action = 'view')
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 8: GLOBAL UI CONFIGURATION
-- ============================================

INSERT INTO configurations (scope_type, scope_id, key, value) VALUES
  ('global', NULL, 'app.display_name', '"Kovax"'),
  ('global', NULL, 'theme.primary', '"#f59e0b"'),
  ('global', NULL, 'theme.accent', '"#38bdf8"'),
  ('global', NULL, 'defaults.pagination_limit', '10'),
  ('global', NULL, 'defaults.show_stats', 'true'),
  ('global', NULL, 'system_name', '"Intern Management System"'),
  ('global', NULL, 'max_leave_days', '20'),
  ('global', NULL, 'work_hours_per_day', '8'),
  -- Phase 7: Data Retention defaults (in days)
  ('global', NULL, 'retention_days_interns', '90'),
  ('global', NULL, 'retention_days_projects', '180'),
  ('global', NULL, 'retention_days_tasks', '60'),
  ('global', NULL, 'retention_days_logs', '365')
ON CONFLICT (scope_type, scope_id, key) DO NOTHING;
