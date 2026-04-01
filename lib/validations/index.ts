/**
 * VALIDATION SCHEMAS
 * 
 * Zod schemas for frontend and backend validation
 * All inputs must be validated before database operations
 */

import { z } from 'zod';
import { ValidationError } from '@/lib/errors';

// ============================================
// COMMON SCHEMAS
// ============================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email format').min(1, 'Email is required');

export const dateSchema = z.string().datetime('Invalid date format').or(z.date());

export const optionalDateSchema = z.string().datetime('Invalid date format').or(z.date()).nullable().optional();

// ============================================
// ENUM SCHEMAS
// ============================================

export const userStatusSchema = z.enum(['active', 'inactive', 'pending', 'suspended'], {
  errorMap: () => ({ message: 'Invalid user status' }),
});

export const internStatusSchema = z.enum(
  ['draft', 'pending', 'active', 'inactive', 'approved', 'rejected', 'completed'],
  {
    errorMap: () => ({ message: 'Invalid intern status' }),
  }
);

export const projectStatusSchema = z.enum(['active', 'completed', 'on_hold', 'cancelled'], {
  errorMap: () => ({ message: 'Invalid project status' }),
});

export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked'], {
  errorMap: () => ({ message: 'Invalid task status' }),
});

export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: 'Invalid task priority' }),
});

// ============================================
// PAGINATION SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// SEARCH SCHEMAS
// ============================================

export const searchSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  status: z.string().optional(),
});

// ============================================
// INTERN SCHEMAS
// ============================================

export const createInternSchema = z.object({
  user_id: uuidSchema,
  status: internStatusSchema.default('draft'),
  tenure_start: optionalDateSchema,
  tenure_end: optionalDateSchema,
  department_id: uuidSchema,
}).refine(
  (data) => {
    if (data.tenure_start && data.tenure_end) {
      return new Date(data.tenure_start) < new Date(data.tenure_end);
    }
    return true;
  },
  {
    message: 'Tenure end date must be after start date',
    path: ['tenure_end'],
  }
);

export const updateInternSchema = z.object({
  status: internStatusSchema.optional(),
  tenure_start: optionalDateSchema,
  tenure_end: optionalDateSchema,
  approved_by: uuidSchema.nullable().optional(),
  approved_at: optionalDateSchema,
  department_id: uuidSchema,
}).refine(
  (data) => {
    if (data.tenure_start && data.tenure_end) {
      return new Date(data.tenure_start) < new Date(data.tenure_end);
    }
    return true;
  },
  {
    message: 'Tenure end date must be after start date',
    path: ['tenure_end'],
  }
);

export const searchInternsSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  status: internStatusSchema.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export type CreateInternInput = z.infer<typeof createInternSchema>;
export type UpdateInternInput = z.infer<typeof updateInternSchema>;
export type SearchInternsInput = z.infer<typeof searchInternsSchema>;

// ============================================
// PROJECT SCHEMAS
// ============================================

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long'),
  description: z.string().max(1000, 'Description too long').nullable().optional(),
  status: projectStatusSchema.default('active'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long').optional(),
  description: z.string().max(1000, 'Description too long').nullable().optional(),
  status: projectStatusSchema.optional(),
});

export const searchProjectsSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  status: projectStatusSchema.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type SearchProjectsInput = z.infer<typeof searchProjectsSchema>;

// ============================================
// TASK SCHEMAS
// ============================================

export const createTaskSchema = z.object({
  project_id: uuidSchema,
  assigned_to: uuidSchema.nullable().optional(),
  title: z.string().min(1, 'Task title is required').max(200, 'Task title too long'),
  description: z.string().max(2000, 'Description too long').nullable().optional(),
  status: taskStatusSchema.default('pending'),
  priority: taskPrioritySchema.default('medium'),
  deadline: optionalDateSchema,
}).refine(
  (data) => {
    if (data.deadline) {
      return new Date(data.deadline) > new Date();
    }
    return true;
  },
  {
    message: 'Deadline must be in the future',
    path: ['deadline'],
  }
);

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Task title too long').optional(),
  description: z.string().max(2000, 'Description too long').nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  deadline: optionalDateSchema,
  assigned_to: uuidSchema.nullable().optional(),
}).refine(
  (data) => {
    if (data.deadline) {
      return new Date(data.deadline) > new Date();
    }
    return true;
  },
  {
    message: 'Deadline must be in the future',
    path: ['deadline'],
  }
);

export const searchTasksSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  project_id: uuidSchema.optional(),
  assigned_to: uuidSchema.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type SearchTasksInput = z.infer<typeof searchTasksSchema>;

// ============================================
// USER SCHEMAS
// ============================================

export const updateUserProfileSchema = z.object({
  email: emailSchema.optional(),
  status: userStatusSchema.optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

// ============================================

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      throw new ValidationError('Validation failed', errors);
    }
    throw error;
  }
}

export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _general: ['Validation failed'] } };
  }
}
