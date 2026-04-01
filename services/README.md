# Services Layer

Production-grade service layer for Kovax SaaS platform.

## Overview

All services follow these principles:
- **RLS-first**: Never bypass Row Level Security
- **Organization-scoped**: All queries automatically filtered by organization
- **No manual filtering**: Let PostgreSQL RLS handle access control
- **Type-safe**: Full TypeScript coverage
- **Error handling**: Comprehensive try-catch with logging

## Available Services

### 1. User Service (`user.service.ts`)
Handles user profile operations and permissions.

**Functions:**
- `getCurrentUserProfile()` - Get authenticated user's profile
- `getCurrentUserProfileExtended()` - Get profile with org/role/dept
- `getUsersInOrganization()` - List all users in org
- `getUserById(userId)` - Get specific user
- `updateCurrentUserProfile(updates)` - Update user profile
- `updateLastLogin()` - Track login timestamp
- `getCurrentUserPermissions()` - Get user's permissions
- `hasPermission(module, action)` - Check specific permission
- `isAdmin()` - Check if user is admin
- `isSuperAdmin()` - Check if user is super admin

### 2. Organization Service (`organization.service.ts`)
Handles organization data and statistics.

**Functions:**
- `getCurrentOrganization()` - Get user's organization
- `getOrganizationStats()` - Get org statistics
- `getDepartments()` - List departments
- `getRoles()` - List roles
- `getPermissions()` - List all permissions
- `getRolePermissions(roleId)` - Get role's permissions

### 3. Intern Service (`intern.service.ts`)
Handles intern profile management.

**Functions:**
- `getInterns()` - List all interns with details
- `getInternById(id)` - Get specific intern profile
- `createIntern(data)` - Create new intern profile
- `updateIntern(id, data)` - Update intern profile
- `deleteIntern(id)` - Soft delete intern
- `getInternStats()` - Get intern statistics by status

**Types:**
- `InternProfile` - Basic intern data
- `InternProfileExtended` - With user/department/approver details
- `CreateInternData` - Data for creating intern
- `UpdateInternData` - Data for updating intern

### 4. Project Service (`project.service.ts`)
Handles project management operations.

**Functions:**
- `getProjects()` - List all projects with details
- `getProjectById(id)` - Get specific project
- `createProject(data)` - Create new project
- `updateProject(id, data)` - Update project
- `deleteProject(id)` - Soft delete project
- `getProjectStats()` - Get project statistics by status
- `getProjectTasks(projectId)` - Get all tasks for a project

**Types:**
- `Project` - Basic project data
- `ProjectExtended` - With creator, task count, member count
- `CreateProjectData` - Data for creating project
- `UpdateProjectData` - Data for updating project

### 5. Task Service (`task.service.ts`)
Handles task assignment and tracking.

**Functions:**
- `getTasks()` - List all tasks with details
- `getTaskById(id)` - Get specific task
- `createTask(data)` - Create new task
- `updateTask(id, data)` - Update task
- `updateTaskStatus(id, status)` - Update task status only
- `deleteTask(id)` - Soft delete task
- `getTaskStats()` - Get task statistics by status/priority
- `getTasksByUser(userId)` - Get tasks assigned to user
- `getTasksByProject(projectId)` - Get tasks for project

**Types:**
- `Task` - Basic task data
- `TaskExtended` - With project and assignee details
- `CreateTaskData` - Data for creating task
- `UpdateTaskData` - Data for updating task

## Usage Examples

### Server Components (Recommended)
```typescript
import { getInterns } from '@/services/intern.service';

export default async function InternsPage() {
  const interns = await getInterns();
  
  return (
    <div>
      {interns.map(intern => (
        <div key={intern.id}>{intern.user?.email}</div>
      ))}
    </div>
  );
}
```

### Client Components (When Needed)
```typescript
'use client';

import { useEffect, useState } from 'react';

export default function ClientComponent() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // Call API route that uses service layer
    fetch('/api/interns')
      .then(res => res.json())
      .then(setData);
  }, []);
  
  return <div>{/* render data */}</div>;
}
```

## Security Notes

### ✅ DO
- Use service functions in server components
- Let RLS handle organization filtering
- Trust the service layer for data access
- Use proper TypeScript types

### ❌ DON'T
- Bypass RLS with service role key
- Filter data manually by organization_id
- Make direct database calls from components
- Hardcode user IDs or organization IDs

## RLS Enforcement

All services rely on Supabase RLS policies:

1. **Organization Isolation**: Users only see data from their organization
2. **Automatic Filtering**: No manual WHERE clauses needed
3. **Soft Deletes**: All queries filter `is_deleted = false`
4. **Permission Checks**: Use RLS helper functions for permissions

## Error Handling

All services follow this pattern:
```typescript
try {
  const supabase = await createClient();
  const { data, error } = await supabase.from('table').select();
  
  if (error) {
    console.error('Error:', error);
    return null; // or []
  }
  
  return data;
} catch (error) {
  console.error('Unexpected error:', error);
  return null; // or []
}
```

## Testing

Services can be tested by:
1. Creating test users in different organizations
2. Verifying RLS isolation works correctly
3. Checking that soft-deleted records are excluded
4. Ensuring proper error handling

## Future Services

Planned services:
- `attendance.service.ts` - Attendance tracking
- `evaluation.service.ts` - Performance evaluations
- `document.service.ts` - Document management
- `notification.service.ts` - Notification system
