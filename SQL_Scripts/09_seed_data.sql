-- ============================================
-- 09_SEED_DATA.SQL
-- Sample organization with demo users, projects, and full data
-- ============================================
-- This is OPTIONAL. It creates a demo "TechCorp Inc" organization
-- with sample interns, projects, tasks, evaluations, etc.
-- Skip this file if you want a clean database.
--
-- NOTE: The user IDs here reference auth.users rows. For this seed
-- to work, those auth users must exist in Supabase Auth first.
-- (Create them via the Supabase dashboard or Auth API)

-- ============================================
-- PART 1: SAMPLE ORGANIZATION
-- ============================================

INSERT INTO organizations (id, name, slug, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'TechCorp Inc', 'techcorp', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (id, organization_id, name) VALUES
  ('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Engineering'),
  ('d2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Design')
ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (name, organization_id) VALUES
  ('Admin', '11111111-1111-1111-1111-111111111111'),
  ('Intern', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (name, organization_id) DO NOTHING;

-- Admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Admin' AND r.organization_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

-- Org-scoped Intern gets view-only on core modules
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Intern'
  AND r.organization_id = '11111111-1111-1111-1111-111111111111'
  AND p.module IN ('interns', 'projects', 'tasks')
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 2: SAMPLE USERS
-- ============================================
-- These reference real auth.users IDs (create them in Supabase Auth first)

INSERT INTO users (id, organization_id, department_id, role_id, email, status, last_login) VALUES
  ('c78bba89-bd2c-4e42-9c32-56030c180726', '11111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111',
   (SELECT id FROM roles WHERE name = 'Admin' AND organization_id = '11111111-1111-1111-1111-111111111111'),
   'admin@kovax.com', 'active', NOW()),
  ('dc7666b8-7b2b-498c-93ea-667d2048d11f', '11111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111',
   (SELECT id FROM roles WHERE name = 'Intern' AND organization_id = '11111111-1111-1111-1111-111111111111'),
   'vatsalj2005@gmail.com', 'active', NOW()),
  ('49ebeb12-3f77-4cbd-96c7-d6b65a882ee3', '11111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222',
   (SELECT id FROM roles WHERE name = 'Intern' AND organization_id = '11111111-1111-1111-1111-111111111111'),
   'anamisa1303@gmail.com', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 3: INTERN PROFILES & DYNAMIC FIELDS
-- ============================================

INSERT INTO intern_profiles (user_id, organization_id, status, approved_by, approved_at, tenure_start, tenure_end)
SELECT 'dc7666b8-7b2b-498c-93ea-667d2048d11f', '11111111-1111-1111-1111-111111111111', 'approved',
       'c78bba89-bd2c-4e42-9c32-56030c180726', NOW() - INTERVAL '30 days', '2024-01-15', '2024-07-15'
WHERE NOT EXISTS (SELECT 1 FROM intern_profiles WHERE user_id = 'dc7666b8-7b2b-498c-93ea-667d2048d11f');

INSERT INTO intern_profiles (user_id, organization_id, status, approved_by, approved_at, tenure_start, tenure_end)
SELECT '49ebeb12-3f77-4cbd-96c7-d6b65a882ee3', '11111111-1111-1111-1111-111111111111', 'approved',
       'c78bba89-bd2c-4e42-9c32-56030c180726', NOW() - INTERVAL '25 days', '2024-02-01', '2024-08-01'
WHERE NOT EXISTS (SELECT 1 FROM intern_profiles WHERE user_id = '49ebeb12-3f77-4cbd-96c7-d6b65a882ee3');

-- Profile Fields (Combined from Phase 7 path + original)
INSERT INTO profile_fields (organization_id, field_name, field_type, is_required, is_active, order_index) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Full Name', 'text', true, true, 0),
  ('11111111-1111-1111-1111-111111111111', 'Email', 'text', false, true, 1),
  ('11111111-1111-1111-1111-111111111111', 'Phone Number', 'phone', true, true, 2),
  ('11111111-1111-1111-1111-111111111111', 'Date of Birth', 'date', false, true, 3),
  ('11111111-1111-1111-1111-111111111111', 'University', 'text', true, true, 4),
  ('11111111-1111-1111-1111-111111111111', 'Degree', 'text', true, true, 5),
  ('11111111-1111-1111-1111-111111111111', 'Skills', 'textarea', false, true, 6),
  ('11111111-1111-1111-1111-111111111111', 'LinkedIn URL', 'url', false, true, 7),
  ('11111111-1111-1111-1111-111111111111', 'Emergency Contact', 'phone', true, true, 8),
  ('11111111-1111-1111-1111-111111111111', 'Address', 'textarea', false, true, 9)
ON CONFLICT (organization_id, field_name) DO NOTHING;

-- Profile Field Values for Intern 1
INSERT INTO profile_field_values (profile_id, field_id, value)
SELECT ip.id, pf.id, CASE pf.field_name
    WHEN 'Full Name' THEN 'Vatsal J.'
    WHEN 'Phone Number' THEN '+91-9876543210'
    WHEN 'University' THEN 'Indian Institute of Technology'
    WHEN 'Degree' THEN 'Computer Science'
    WHEN 'Skills' THEN 'JavaScript, React, Node.js, Python'
  END
FROM intern_profiles ip
CROSS JOIN profile_fields pf
WHERE ip.user_id = 'dc7666b8-7b2b-498c-93ea-667d2048d11f'
  AND pf.organization_id = '11111111-1111-1111-1111-111111111111'
  AND pf.field_name IN ('Full Name', 'Phone Number', 'University', 'Degree', 'Skills')
ON CONFLICT (profile_id, field_id) DO NOTHING;

-- ============================================
-- PART 4: PROJECTS & TASKS
-- ============================================

INSERT INTO projects (organization_id, name, description, status, created_by)
SELECT '11111111-1111-1111-1111-111111111111', 'Mobile App Redesign', 'Complete redesign of mobile app', 'active', 'c78bba89-bd2c-4e42-9c32-56030c180726'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Mobile App Redesign');

INSERT INTO tasks (project_id, assigned_to, title, description, status, priority, deadline)
SELECT p.id, 'dc7666b8-7b2b-498c-93ea-667d2048d11f', 'Design login screen', 'Create mockups', 'completed', 'high', NOW() + INTERVAL '5 days'
FROM projects p WHERE p.name = 'Mobile App Redesign'
AND NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Design login screen');

-- ============================================
-- PART 5: COMPLIANCE SEED (Phase 7 Merge)
-- ============================================

-- Auto-consent for existing active users
INSERT INTO consents (user_id, organization_id, consent_type, accepted_at, is_active)
SELECT u.id, u.organization_id, ct.consent_type, NOW(), true
FROM users u
CROSS JOIN (
  VALUES ('terms_of_service'), ('privacy_policy'), ('data_processing')
) AS ct(consent_type)
WHERE u.is_deleted = false
  AND u.status = 'active'
ON CONFLICT DO NOTHING;

-- Log the auto-consent
INSERT INTO consent_logs (user_id, action, timestamp)
SELECT u.id, 'consent.auto_seeded.terms_of_service', NOW() FROM users u WHERE u.is_deleted = false AND u.status = 'active';

INSERT INTO consent_logs (user_id, action, timestamp)
SELECT u.id, 'consent.auto_seeded.privacy_policy', NOW() FROM users u WHERE u.is_deleted = false AND u.status = 'active';

INSERT INTO consent_logs (user_id, action, timestamp)
SELECT u.id, 'consent.auto_seeded.data_processing', NOW() FROM users u WHERE u.is_deleted = false AND u.status = 'active';

-- ============================================
-- SUCCESS
-- ============================================
SELECT '09_seed_data.sql: TechCorp demo org with Kovax branding and Stage 7 data created successfully!' as message;
