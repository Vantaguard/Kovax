-- ============================================
-- 03_DOMAIN_TABLES.SQL
-- Intern Profiles, Projects, Tasks, and related tables
-- ============================================
-- All audit columns (created_by, updated_by, updated_at) are included
-- from the start. No ALTER TABLE patches needed.

-- ============================================
-- INTERN SYSTEM
-- ============================================

-- 7. Intern Profiles
CREATE TABLE intern_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    tenure_start DATE,
    tenure_end DATE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_intern_profiles_user ON intern_profiles(user_id);
CREATE INDEX idx_intern_profiles_org ON intern_profiles(organization_id);
CREATE INDEX idx_intern_profiles_status ON intern_profiles(status);
CREATE INDEX idx_intern_profiles_deleted ON intern_profiles(is_deleted) WHERE is_deleted = FALSE;

COMMENT ON COLUMN intern_profiles.created_by IS 'User who created this intern profile';
COMMENT ON COLUMN intern_profiles.updated_by IS 'User who last updated this intern profile';

-- 8. Profile Fields (dynamic schema per organization)
CREATE TABLE profile_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, field_name)
);

CREATE INDEX idx_profile_fields_org ON profile_fields(organization_id);
CREATE INDEX idx_profile_fields_active ON profile_fields(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_profile_fields_order ON profile_fields(organization_id, order_index);

-- 9. Profile Field Values
CREATE TABLE profile_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES intern_profiles(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES profile_fields(id) ON DELETE CASCADE,
    value TEXT,
    UNIQUE(profile_id, field_id)
);

CREATE INDEX idx_profile_field_values_profile ON profile_field_values(profile_id);
CREATE INDEX idx_profile_field_values_field ON profile_field_values(field_id);

-- ============================================
-- PROJECT & TASK SYSTEM
-- ============================================

-- 10. Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_deleted ON projects(is_deleted) WHERE is_deleted = FALSE;

COMMENT ON COLUMN projects.created_by IS 'User who created this project';
COMMENT ON COLUMN projects.updated_by IS 'User who last updated this project';

-- 11. Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    deadline TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_deleted ON tasks(is_deleted) WHERE is_deleted = FALSE;

COMMENT ON COLUMN tasks.created_by IS 'User who created this task';
COMMENT ON COLUMN tasks.updated_by IS 'User who last updated this task';

-- 12. Task Events (timeline tracking)
CREATE TABLE task_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_events_task ON task_events(task_id);
CREATE INDEX idx_task_events_user ON task_events(user_id);
CREATE INDEX idx_task_events_timestamp ON task_events(timestamp);

-- 13. Work Logs
CREATE TABLE work_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT,
    hours_spent NUMERIC(5,2) NOT NULL,
    status TEXT DEFAULT 'submitted',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_work_logs_task ON work_logs(task_id);
CREATE INDEX idx_work_logs_user ON work_logs(user_id);
CREATE INDEX idx_work_logs_status ON work_logs(status);
CREATE INDEX idx_work_logs_created ON work_logs(created_at);
