'use server';

import { createIntern, updateIntern, deleteIntern, restoreIntern } from '@/services/intern.service.v2';
import { saveProfileValues } from '@/services/dynamic-form.service';
import { CreateInternInput, UpdateInternInput } from '@/lib/validations';
import { sanitizeInput } from '@/lib/security/sanitize';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { revalidatePath } from 'next/cache';

export async function createNewIntern(data: CreateInternInput) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const rateLimit = checkRateLimit(auth.userId, RATE_LIMITS.create);
    if (!rateLimit.allowed) {
      return { success: false, error: 'Rate limit exceeded. Please try again later.' };
    }

    // Sanitize any textual inputs if they exist in the future (currently standard fields handled by service)
    const intern = await createIntern(data);
    revalidatePath('/dashboard/interns');
    return { success: true, data: intern };
  } catch (error: any) {
    console.error('Failed to create intern:', error);
    return { success: false, error: error.message || 'Failed to create intern' };
  }
}

export async function approveInternProfile(internId: string) {
  try {
    const { approveIntern } = await import('@/services/workflow.service');
    const result = await approveIntern(internId);
    revalidatePath('/dashboard/interns');
    revalidatePath(`/dashboard/interns/${internId}`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to approve intern:', error);
    return { success: false, error: error.message || 'Failed to approve intern' };
  }
}

export async function rejectInternProfile(internId: string, reason?: string) {
  try {
    const { rejectIntern } = await import('@/services/workflow.service');
    const safeReason = reason ? sanitizeInput(reason) : undefined;
    const result = await rejectIntern(internId, undefined, safeReason);
    revalidatePath('/dashboard/interns');
    revalidatePath(`/dashboard/interns/${internId}`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to reject intern:', error);
    return { success: false, error: error.message || 'Failed to reject intern' };
  }
}

export async function updateExistingIntern(id: string, data: UpdateInternInput) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const rateLimit = checkRateLimit(auth.userId, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return { success: false, error: 'Rate limit exceeded.' };
    }

    const intern = await updateIntern(id, data);
    revalidatePath('/dashboard/interns');
    revalidatePath(`/dashboard/interns/${id}`);
    return { success: true, data: intern };
  } catch (error: any) {
    console.error('Failed to update intern:', error);
    return { success: false, error: error.message || 'Failed to update intern' };
  }
}

export async function deleteInternProfile(id: string) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const rateLimit = checkRateLimit(auth.userId, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return { success: false, error: 'Rate limit exceeded.' };
    }

    const result = await deleteIntern(id);
    revalidatePath('/dashboard/interns');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to delete intern:', error);
    return { success: false, error: error.message || 'Failed to delete intern' };
  }
}

export async function restoreInternProfile(id: string) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    const result = await restoreIntern(id);
    revalidatePath('/dashboard/interns');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to restore intern:', error);
    return { success: false, error: error.message || 'Failed to restore intern' };
  }
}

export async function saveDynamicProfileValues(
  profileId: string,
  values: Record<string, string | null>
) {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return { success: false, error: 'Unauthorized' };

    // Sanitize all string values
    const sanitized: Record<string, string | null> = {};
    for (const [key, val] of Object.entries(values)) {
      sanitized[key] = val ? sanitizeInput(val) : null;
    }

    await saveProfileValues(profileId, sanitized);
    revalidatePath(`/dashboard/interns/${profileId}`);
    revalidatePath('/dashboard/profile');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save profile values:', error);
    // If it's a validation error, pass the details back
    if (error.message?.includes('validation failed') && error.details) {
      return { success: false, error: JSON.stringify(error.details) };
    }
    return { success: false, error: error.message || 'Failed to save profile values' };
  }
}
