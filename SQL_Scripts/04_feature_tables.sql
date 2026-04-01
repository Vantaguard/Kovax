-- ============================================
-- 04_FEATURE_TABLES.SQL
-- Attendance, Evaluations, Documents, Knowledge, Notifications,
-- Configuration, Workflows, Privacy, Logging, Exports, Analytics
-- ============================================
-- These tables support future modules. All FK constraints use the
-- correct ON DELETE behavior from the start (fixes from fix_user_deletion.sql
-- are already applied here).

-- ============================================
-- ATTENDANCE & LEAVE
-- ============================================

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'present',
    UNIQUE(user_id, date)
);

CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_org ON attendance(organization_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_org ON leave_requests(organization_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- ============================================
-- PERFORMANCE & EVALUATION
-- ============================================

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intern_id UUID NOT NULL REFERENCES intern_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evaluations_intern ON evaluations(intern_id);
CREATE INDEX idx_evaluations_org ON evaluations(organization_id);
CREATE INDEX idx_evaluations_created_by ON evaluations(created_by);
CREATE INDEX idx_evaluations_rating ON evaluations(rating);

CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_certificates_org ON certificates(organization_id);

CREATE TABLE feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedbacks_user ON feedbacks(user_id);
CREATE INDEX idx_feedbacks_org ON feedbacks(organization_id);
CREATE INDEX idx_feedbacks_rating ON feedbacks(rating);

CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- ============================================
-- DOCUMENTS & COLLABORATION
-- ============================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created ON comments(created_at);

-- ============================================
-- KNOWLEDGE HUB
-- ============================================

CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resources_org ON resources(organization_id);
CREATE INDEX idx_resources_type ON resources(type);

CREATE TABLE resource_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started',
    UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_resource_progress_user ON resource_progress(user_id);
CREATE INDEX idx_resource_progress_resource ON resource_progress(resource_id);
CREATE INDEX idx_resource_progress_status ON resource_progress(status);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at);

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    frequency TEXT DEFAULT 'immediate'
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- ============================================
-- CONFIGURATION SYSTEM
-- ============================================

CREATE TABLE configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'organization', 'user')),
    scope_id UUID,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    UNIQUE(scope_type, scope_id, key)
);

CREATE INDEX idx_configurations_scope ON configurations(scope_type, scope_id);
CREATE INDEX idx_configurations_key ON configurations(key);

CREATE TABLE feature_toggles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    UNIQUE(organization_id, feature_name)
);

CREATE INDEX idx_feature_toggles_org ON feature_toggles(organization_id);
CREATE INDEX idx_feature_toggles_enabled ON feature_toggles(is_enabled);

-- ============================================
-- WORKFLOW ENGINE
-- ============================================

CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    trigger_event TEXT NOT NULL,
    conditions JSONB,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_workflows_org ON workflows(organization_id);
CREATE INDEX idx_workflows_trigger ON workflows(trigger_event);
CREATE INDEX idx_workflows_active ON workflows(is_active) WHERE is_active = TRUE;

-- ============================================
-- PRIVACY SYSTEM
-- ============================================

CREATE TABLE data_classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE field_privacy_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES profile_fields(id) ON DELETE CASCADE,
    classification_id UUID NOT NULL REFERENCES data_classifications(id) ON DELETE CASCADE,
    visible_to_role UUID REFERENCES roles(id) ON DELETE CASCADE,
    is_masked BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_field_privacy_rules_field ON field_privacy_rules(field_id);
CREATE INDEX idx_field_privacy_rules_classification ON field_privacy_rules(classification_id);
CREATE INDEX idx_field_privacy_rules_role ON field_privacy_rules(visible_to_role);

CREATE TABLE consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_consents_user ON consents(user_id);
CREATE INDEX idx_consents_org ON consents(organization_id);
CREATE INDEX idx_consents_type ON consents(consent_type);
CREATE INDEX idx_consents_active ON consents(is_active) WHERE is_active = TRUE;

CREATE TABLE consent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consent_logs_user ON consent_logs(user_id);
CREATE INDEX idx_consent_logs_timestamp ON consent_logs(timestamp);

-- ============================================
-- LOGGING & SECURITY
-- ============================================
-- activity_logs: includes organization_id, ip_address, user_agent from the start.
-- user_id is NULLABLE with ON DELETE SET NULL so user deletion doesn't fail.

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_org ON activity_logs(organization_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_entity_id ON activity_logs(entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_org_created ON activity_logs(organization_id, created_at DESC);

COMMENT ON TABLE activity_logs IS 'Complete audit trail of all system actions';

CREATE TABLE access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    ip_address TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_logs_user ON access_logs(user_id);
CREATE INDEX idx_access_logs_status ON access_logs(status);
CREATE INDEX idx_access_logs_created ON access_logs(created_at);
CREATE INDEX idx_access_logs_ip ON access_logs(ip_address);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip TEXT,
    device TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- EXPORT & INTEGRATION
-- ============================================

CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    file_url TEXT,
    filters JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exports_user ON exports(user_id);
CREATE INDEX idx_exports_status ON exports(status);
CREATE INDEX idx_exports_type ON exports(type);
CREATE INDEX idx_exports_created ON exports(created_at);

CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    event TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX idx_webhooks_event ON webhooks(event);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;

CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at);

-- ============================================
-- ANALYTICS & PERSONALIZATION
-- ============================================

CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, metric)
);

CREATE INDEX idx_analytics_cache_org ON analytics_cache(organization_id);
CREATE INDEX idx_analytics_cache_metric ON analytics_cache(metric);
CREATE INDEX idx_analytics_cache_updated ON analytics_cache(updated_at);

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'light',
    layout TEXT DEFAULT 'default',
    settings JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
