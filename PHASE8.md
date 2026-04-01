# Phase 8 — Intelligence Layer

> Event-driven, proactive SaaS platform with dynamic workflows, smart notifications, secure exports, and rule-based recommendations.

---

## 📦 What Was Added

### New Service Files

| File | Purpose |
|------|---------|
| `services/workflow-engine.service.ts` | Dynamic workflow engine — evaluates DB-driven rules against events |
| `services/notification.service.ts` | Smart notification system — role-based, event-driven delivery |
| `services/export.service.ts` | Secure data export — CSV/JSON with privacy masking |
| `services/recommendation.service.ts` | Rule-based recommendations and admin insights |

### New API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/notifications` | `GET`, `POST` | Fetch notifications + mark as read |
| `/api/exports` | `POST` | Trigger data export (CSV/JSON) |
| `/api/recommendations` | `GET` | Fetch recommendations + admin insights |

### New UI Components

| File | Purpose |
|------|---------|
| `components/dashboard/NotificationBell.tsx` | Notification bell dropdown in navbar with unread badge |

### SQL Migration

| File | Purpose |
|------|---------|
| `SQL_Scripts/11_intelligence.sql` | RLS policies for notifications, exports, workflows + example data |

---

## 🔧 What Was Modified

### Service Layer Integration (Workflow Engine Triggers)

| File | Changes |
|------|---------|
| `services/intern.service.v2.ts` | Added workflow triggers on `createIntern`, `updateIntern`, `deleteIntern` |
| `services/project.service.v2.ts` | Added workflow triggers on `createProject`, `updateProject`, `deleteProject` |
| `services/task.service.v2.ts` | Added workflow triggers on `createTask`, `updateTask`, `deleteTask` |
| `services/workflow.service.ts` | Added workflow triggers on `approveIntern`, `rejectIntern` |
| `app/(public)/login/actions.ts` | Added workflow trigger on `processLoginSuccess` |
| `services/log.service.ts` | Added new LOG_ACTIONS and ENTITY_TYPES for Phase 8 |
| `components/dashboard/Navbar.tsx` | Added NotificationBell component |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Service Layer                     │
│  intern.service │ project.service │ task.service     │
│  workflow.service │ login actions                    │
│──────────────────────┬──────────────────────────────│
│                      │                              │
│              evaluateWorkflows()                    │
│                      │                              │
│              ┌───────┴────────┐                     │
│              │ Workflow Engine │                     │
│              │  (DB-driven)   │                     │
│              └───────┬────────┘                     │
│                      │                              │
│        ┌─────────────┼─────────────┐                │
│        │             │             │                │
│   send_notification  log_event  update_field       │
│        │                                            │
│   ┌────┴─────┐                                      │
│   │Notification│                                    │
│   │ Service   │                                     │
│   └──────────┘                                      │
│                                                     │
│   ┌──────────┐     ┌──────────────┐                 │
│   │ Export   │     │Recommendation│                 │
│   │ Service  │     │   Service    │                 │
│   └──────────┘     └──────────────┘                 │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 How to Test

### Prerequisites

1. Run the SQL migration:
   ```sql
   -- Execute in Supabase SQL Editor:
   -- Contents of SQL_Scripts/11_intelligence.sql
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

---

### 1. Test Workflow Engine

#### Insert a test workflow in Supabase SQL Editor:

```sql
-- Replace YOUR_ORG_ID with your actual organization UUID
-- Find it with: SELECT id, name FROM organizations;

INSERT INTO workflows (organization_id, trigger_event, conditions, actions, is_active)
VALUES (
  'YOUR_ORG_ID',
  'intern.created',
  NULL,
  '[
    {
      "type": "send_notification",
      "config": {
        "title": "🆕 New Intern Profile Created",
        "message": "A new intern profile has been created and may need review.",
        "notification_type": "approval"
      }
    },
    {
      "type": "log_event",
      "config": {
        "action_name": "workflow.intern.onboarding",
        "message": "Intern onboarding workflow triggered"
      }
    }
  ]'::jsonb,
  true
);
```

#### Verify:
1. Create a new intern profile through the UI
2. Check the notification bell in the navbar → you should see a "New Intern Profile Created" notification
3. Check `activity_logs` table → you should see a `workflow.intern.onboarding` log entry

#### More workflow examples:

```sql
-- Notify on task completion
INSERT INTO workflows (organization_id, trigger_event, conditions, actions, is_active)
VALUES (
  'YOUR_ORG_ID',
  'task.status_updated',
  '[{"field": "status", "operator": "equals", "value": "completed"}]'::jsonb,
  '[
    {
      "type": "send_notification",
      "config": {
        "title": "✅ Task Completed",
        "message": "A task has been marked as completed.",
        "notification_type": "task"
      }
    }
  ]'::jsonb,
  true
);

-- Alert on urgent task creation
INSERT INTO workflows (organization_id, trigger_event, conditions, actions, is_active)
VALUES (
  'YOUR_ORG_ID',
  'task.created',
  '[{"field": "priority", "operator": "equals", "value": "urgent"}]'::jsonb,
  '[
    {
      "type": "send_notification",
      "config": {
        "title": "⚠️ Urgent Task Created",
        "message": "An urgent task has been created. Immediate attention required.",
        "notification_type": "alert"
      }
    }
  ]'::jsonb,
  true
);
```

---

### 2. Test Notifications

#### From the UI:
1. **Log in** to the dashboard
2. **Look at the Navbar** → you should see a 🔔 bell icon next to your profile
3. If there are unread notifications, an **amber badge** shows the count
4. **Click the bell** → a dropdown shows your notifications
5. **Click a notification** → marks it as read
6. **Click "Mark all read"** → clears all unread

#### Test via API (browser console or curl):

```javascript
// Fetch notifications
fetch('/api/notifications').then(r => r.json()).then(console.log);

// Mark all as read
fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'mark_all_read' })
}).then(r => r.json()).then(console.log);
```

---

### 3. Test Data Export

#### Via API:

```javascript
// Export interns as CSV
fetch('/api/exports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ entityType: 'interns', format: 'csv' })
}).then(r => r.text()).then(console.log);

// Export tasks as JSON
fetch('/api/exports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ entityType: 'tasks', format: 'json' })
}).then(r => r.text()).then(console.log);

// Export projects with filters
fetch('/api/exports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    entityType: 'projects',
    format: 'csv',
    filters: { status: 'active' }
  })
}).then(r => r.text()).then(console.log);
```

#### Verify:
- ✅ CSV output has proper headers and escaped fields
- ✅ Email addresses are **masked** (e.g., `j***e@example.com`)
- ✅ Internal IDs are removed from export
- ✅ Soft-deleted records are excluded
- ✅ An entry appears in the `exports` table with status = 'completed'
- ✅ An entry appears in `activity_logs` with action = 'data.exported'
- ❌ Interns role receives a 403 error (export is admin-only)

---

### 4. Test Recommendations

#### Via API:

```javascript
// Get user recommendations
fetch('/api/recommendations').then(r => r.json()).then(console.log);

// Get admin insights (admin only)
fetch('/api/recommendations?action=insights').then(r => r.json()).then(console.log);
```

#### What to verify:

**As an Intern:**
- Shows incomplete profile warnings
- Shows overdue task alerts
- Shows missing consent reminders
- Shows no-activity warnings

**As an Admin:**
- Shows pending approval counts
- Shows overdue tasks across org
- Shows inactive user counts
- Shows blocked tasks
- Shows empty projects

---

## 📋 Example Workflow JSON Structure

```json
{
  "trigger_event": "task.updated",
  "conditions": [
    {
      "field": "status",
      "operator": "equals",
      "value": "blocked"
    }
  ],
  "actions": [
    {
      "type": "send_notification",
      "config": {
        "title": "🚫 Task Blocked",
        "message": "Task '{{title}}' has been blocked. Please investigate.",
        "notification_type": "alert"
      }
    },
    {
      "type": "log_event",
      "config": {
        "action_name": "workflow.task.blocked",
        "message": "Blocked task detected by workflow"
      }
    }
  ]
}
```

### Supported Condition Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match | `{"field": "status", "operator": "equals", "value": "active"}` |
| `not_equals` | Not equal | `{"field": "status", "operator": "not_equals", "value": "draft"}` |
| `contains` | String/array contains | `{"field": "title", "operator": "contains", "value": "urgent"}` |
| `gt` / `lt` | Greater/less than | `{"field": "priority_score", "operator": "gt", "value": 5}` |
| `gte` / `lte` | Greater/less or equal | `{"field": "count", "operator": "gte", "value": 10}` |
| `in` | Value in array | `{"field": "status", "operator": "in", "value": ["active", "approved"]}` |
| `not_in` | Value not in array | `{"field": "status", "operator": "not_in", "value": ["draft"]}` |
| `is_null` | Field is null | `{"field": "assigned_to", "operator": "is_null", "value": null}` |
| `is_not_null` | Field is not null | `{"field": "deadline", "operator": "is_not_null", "value": null}` |

### Supported Action Types

| Action | Description | Config |
|--------|-------------|--------|
| `send_notification` | Creates an in-app notification | `{ title, message, notification_type, target_user_id? }` |
| `log_event` | Logs a custom event to activity_logs | `{ action_name, message, extra_metadata? }` |
| `update_field` | Updates a field on the triggering entity | `{ table, field, value }` |
| `block_action` | Blocks the triggering operation | `{ reason }` |

### Supported Trigger Events

| Event | Source |
|-------|--------|
| `intern.created` | createIntern() |
| `intern.updated` | updateIntern() |
| `intern.approved` | approveIntern() |
| `intern.rejected` | rejectIntern() |
| `intern.deleted` | deleteIntern() |
| `project.created` | createProject() |
| `project.updated` | updateProject() |
| `project.deleted` | deleteProject() |
| `task.created` | createTask() |
| `task.updated` | updateTask() |
| `task.assigned` | updateTask (assigned_to changed) |
| `task.status_updated` | updateTask (status changed) |
| `task.deleted` | deleteTask() |
| `user.login` | processLoginSuccess() |
| `user.created` | (future) |

---

## 🔒 Security Guarantees

- ✅ **RBAC**: All services check permissions via `assertModuleAndPermission()`
- ✅ **RLS**: Notifications, exports, workflows all have row-level security policies
- ✅ **Privacy**: Export data is masked BEFORE file generation (emails masked)
- ✅ **Soft Delete**: All queries filter out `is_deleted = true`
- ✅ **Logging**: Every workflow evaluation, notification, and export is logged
- ✅ **No Bypass**: Workflow engine uses `createClient()` which respects RLS
- ✅ **Org Isolation**: Workflows only fire within their own organization

---

## 🚀 Post-Phase 8 State

After this phase, the system is:

| Capability | Status |
|------------|--------|
| Event-driven | ✅ All CRUD operations fire workflow events |
| Dynamic workflows | ✅ DB-driven rules, conditions, and actions |
| Smart notifications | ✅ In-app with unread tracking and role delivery |
| Secure exports | ✅ Privacy-masked CSV/JSON with RBAC |
| Proactive insights | ✅ Role-based recommendations and admin insights |
| Audit trail | ✅ All side-effects logged |
