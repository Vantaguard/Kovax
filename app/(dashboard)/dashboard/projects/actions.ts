'use server';

import { createProject, updateProject, deleteProject, restoreProject } from '@/services/project.service.v2';
import { CreateProjectInput, UpdateProjectInput } from '@/lib/validations';
import { sanitizeInput } from '@/lib/security/sanitize';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { revalidatePath } from 'next/cache';

export async function createNewProject(data: CreateProjectInput) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const rateLimit = checkRateLimit(auth.userId, RATE_LIMITS.create);
    if (!rateLimit.allowed) {
      return { success: false, error: 'Rate limit exceeded. Please try again later.' };
    }

    const safeData = {
      ...data,
      name: sanitizeInput(data.name),
      description: data.description ? sanitizeInput(data.description) : undefined,
    };
    const project = await createProject(safeData as any);
    revalidatePath('/dashboard/projects');
    return { success: true, data: project };
  } catch (error: any) {
    console.error('Failed to create project:', error);
    return { success: false, error: error.message || 'Failed to create project' };
  }
}

export async function updateExistingProject(id: string, data: UpdateProjectInput) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const rateLimit = checkRateLimit(auth.userId, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return { success: false, error: 'Rate limit exceeded.' };
    }

    const safeData = {
      ...data,
      name: data.name ? sanitizeInput(data.name) : undefined,
      description: data.description ? sanitizeInput(data.description) : undefined,
    };
    const project = await updateProject(id, safeData as any);
    revalidatePath('/dashboard/projects');
    revalidatePath(`/dashboard/projects/${id}`);
    return { success: true, data: project };
  } catch (error: any) {
    console.error('Failed to update project:', error);
    return { success: false, error: error.message || 'Failed to update project' };
  }
}

export async function deleteExistingProject(id: string) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const rateLimit = checkRateLimit(auth.userId, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return { success: false, error: 'Rate limit exceeded.' };
    }

    const result = await deleteProject(id);
    revalidatePath('/dashboard/projects');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to delete project:', error);
    return { success: false, error: error.message || 'Failed to delete project' };
  }
}

export async function restoreExistingProject(id: string) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const result = await restoreProject(id);
    revalidatePath('/dashboard/projects');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to restore project:', error);
    return { success: false, error: error.message || 'Failed to restore project' };
  }
}
