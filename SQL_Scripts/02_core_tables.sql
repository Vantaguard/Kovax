-- ============================================
-- 02_CORE_TABLES.SQL
-- Organizations, Departments, Roles, Permissions, Users
-- ============================================
-- These are the foundation tables that every other table depends on.
-- ALL audit fields, soft-delete columns, and FK constraints reflect
-- the FINAL production state (no ALTER TABLE fixes needed later).

-- 1. Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);

-- 2. Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_departments_org ON departments(organization_id);

-- 3. Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, organization_id)
);

CREATE INDEX idx_roles_org ON roles(organization_id);

-- 4. Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    UNIQUE(module, action)
);

CREATE INDEX idx_permissions_module ON permissions(module);

-- 5. Role Permissions (junction table)
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- 6. Users (extends auth.users)
--    NOTE: last_login, updated_at, soft-delete columns included from the start.
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_deleted ON users(is_deleted) WHERE is_deleted = FALSE;
