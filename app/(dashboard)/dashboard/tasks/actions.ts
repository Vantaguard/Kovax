'use server';

import { createTask, updateTask, deleteTask, restoreTask } from '@/services/task.service.v2';
import { CreateTaskInput, UpdateTaskInput } from '@/lib/validations';
import { sanitizeInput } from '@/lib/security/sanitize';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { revalidatePath } from 'next/cache';

export async function createNewTask(data: CreateTaskInput) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const rateLimit = checkRateLimit(auth.userId, RATE_LIMITS.create);
    if (!rateLimit.allowed) {
      return { success: false, error: 'Rate limit exceeded. Please try again later.' };
    }

    const safeData = {
      ...data,
      title: sanitizeInput(data.title),
      description: data.description ? sanitizeInput(data.description) : undefined,
    };
    const task = await createTask(safeData as any);
    revalidatePath('/dashboard/tasks');
    return { success: true, data: task };
  } catch (error: any) {
    console.error('Failed to create task:', error);
    return { success: false, error: error.message || 'Failed to create task' };
  }
}

export async function updateExistingTask(id: string, data: UpdateTaskInput) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const rateLimit = checkRateLimit(auth.userId, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return { success: false, error: 'Rate limit exceeded.' };
    }

    const safeData = {
      ...data,
      title: data.title ? sanitizeInput(data.title) : undefined,
      description: data.description ? sanitizeInput(data.description) : undefined,
    };
    const task = await updateTask(id, safeData as any);
    revalidatePath('/dashboard/tasks');
    return { success: true, data: task };
  } catch (error: any) {
    console.error('Failed to update task:', error);
    return { success: false, error: error.message || 'Failed to update task' };
  }
}

export async function deleteExistingTask(id: string) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const rateLimit = checkRateLimit(auth.userId, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return { success: false, error: 'Rate limit exceeded.' };
    }

    const result = await deleteTask(id);
    revalidatePath('/dashboard/tasks');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to delete task:', error);
    return { success: false, error: error.message || 'Failed to delete task' };
  }
}

export async function restoreExistingTask(id: string) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const result = await restoreTask(id);
    revalidatePath('/dashboard/tasks');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to restore task:', error);
    return { success: false, error: error.message || 'Failed to restore task' };
  }
}
