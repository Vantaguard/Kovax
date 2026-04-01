-- ============================================
-- 10_VERIFICATION.SQL
-- Verify the database was set up correctly
-- ============================================
-- Run this after all scripts to confirm everything is in order.
-- All queries should return expected results.

-- ============================================
-- 1. VERIFY EXTENSIONS
-- ============================================
SELECT '1. Extensions' as check_name;
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- ============================================
-- 2. VERIFY ALL TABLES EXIST
-- ============================================
SELECT '2. Tables' as check_name;
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 3. VERIFY RLS IS ENABLED ON ALL TABLES
-- ============================================
SELECT '3. RLS Status' as check_name;
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = FALSE
ORDER BY tablename;
-- ^ Should return 0 rows (all tables have RLS enabled)

-- ============================================
-- 4. VERIFY HELPER FUNCTIONS EXIST
-- ============================================
SELECT '4. Functions' as check_name;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'current_user_org_id',
    'user_organization_id',
    'current_user_role_id',
    'current_user_role_name',
    'user_has_permission',
    'has_permission',
    'is_admin',
    'is_super_admin',
    'get_current_user_profile',
    'is_same_organization',
    'check_user_exists',
    'get_default_org_id',
    'get_default_role_id',
    'handle_new_user',
    'update_updated_at_column',
    'create_task_event',
    'soft_delete',
    'sync_intern_status_to_users',
    'log_activity'
  )
ORDER BY routine_name;

-- ============================================
-- 5. VERIFY AUTH TRIGGER EXISTS
-- ============================================
SELECT '5. Auth Trigger' as check_name;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth' OR event_object_table = 'users';

-- ============================================
-- 6. VERIFY DEFAULT ORGANIZATION
-- ============================================
SELECT '6. Default Org' as check_name;
SELECT id, name, slug FROM organizations WHERE slug = 'default-org';

-- ============================================
-- 7. VERIFY GLOBAL ROLES
-- ============================================
SELECT '7. Global Roles' as check_name;
SELECT name FROM roles WHERE organization_id IS NULL ORDER BY name;
-- Should return: intern, mentor, org_admin, super_admin

-- ============================================
-- 8. VERIFY PERMISSIONS
-- ============================================
SELECT '8. Permissions' as check_name;
SELECT module, COUNT(*) as action_count
FROM permissions
GROUP BY module
ORDER BY module;

-- ============================================
-- 9. VERIFY GLOBAL CONFIGURATIONS
-- ============================================
SELECT '9. Config' as check_name;
SELECT key, value FROM configurations WHERE scope_type = 'global' ORDER BY key;

-- ============================================
-- 10. VERIFY DATA CLASSIFICATIONS
-- ============================================
SELECT '10. Privacy Classifications' as check_name;
SELECT name FROM data_classifications ORDER BY name;

-- ============================================
-- 11. COUNT RLS POLICIES
-- ============================================
SELECT '11. RLS Policy Count' as check_name;
SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';

-- ============================================
-- 12. VERIFY INDEXES
-- ============================================
SELECT '12. Index Count' as check_name;
SELECT COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public';

-- ============================================
-- SUMMARY
-- ============================================
SELECT 'Database verification complete!' as status,
       'Check each section above for expected results.' as note;
