/**
 * CONSENT SERVICE — BLOCKING CONSENT ENFORCEMENT
 *
 * CRITICAL: Users MUST consent before accessing the system.
 * Every consent action is logged in consent_logs (immutable trail).
 *
 * Uses: consents, consent_logs tables
 *
 * Integration points:
 * - Middleware: redirects to /consent if not consented
 * - Service layer: requireConsent() blocks API calls
 * - UI: /consent page with accept button
 */

import { createClient } from '@/lib/supabase/server';
import { UnauthorizedError, ForbiddenError, DatabaseError, sanitizeError } from '@/lib/errors';
import { getServerAuthContext } from '@/lib/phase6/auth-context';

// ============================================
// TYPES
// ============================================

export type ConsentType = 'terms_of_service' | 'privacy_policy' | 'data_processing';

export interface ConsentRecord {
  id: string;
  user_id: string;
  organization_id: string;
  consent_type: ConsentType;
  accepted_at: string;
  is_active: boolean;
}

export interface ConsentStatus {
  has_consented: boolean;
  missing_consents: ConsentType[];
  consents: ConsentRecord[];
}

// Required consent types for system access
const REQUIRED_CONSENTS: ConsentType[] = [
  'terms_of_service',
  'privacy_policy',
  'data_processing',
];

// ============================================
// CHECK CONSENT
// ============================================

/**
 * Check if a user has all required active consents.
 */
export async function hasUserConsented(userId: string, orgId?: string): Promise<ConsentStatus> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('consents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking consent:', error);
      return {
        has_consented: false,
        missing_consents: REQUIRED_CONSENTS,
        consents: [],
      };
    }

    const consents = (data || []) as ConsentRecord[];
    const consentedTypes = new Set(consents.map((c) => c.consent_type));
    const missing = REQUIRED_CONSENTS.filter((t) => !consentedTypes.has(t));

    return {
      has_consented: missing.length === 0,
      missing_consents: missing,
      consents,
    };
  } catch (error) {
    console.error('Unexpected error checking consent:', error);
    return {
      has_consented: false,
      missing_consents: REQUIRED_CONSENTS,
      consents: [],
    };
  }
}

/**
 * Lightweight check for middleware (no auth context needed, uses raw userId).
 */
export async function hasUserConsentedLightweight(
  userId: string,
  orgId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('consents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .in('consent_type', REQUIRED_CONSENTS);

    if (error) return false;
    return (count || 0) >= REQUIRED_CONSENTS.length;
  } catch {
    return false;
  }
}

// ============================================
// RECORD CONSENT
// ============================================

/**
 * Record user consent for specific types.
 * Each consent action is also logged in consent_logs.
 */
export async function recordConsent(
  consentTypes?: ConsentType[]
): Promise<ConsentRecord[]> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const supabase = await createClient();
    const types = consentTypes || REQUIRED_CONSENTS;
    const now = new Date().toISOString();

    const records: ConsentRecord[] = [];

    for (const consentType of types) {
      // Upsert consent (deactivate old, create new)
      // First, deactivate any existing consent of this type
      await supabase
        .from('consents')
        .update({ is_active: false })
        .eq('user_id', ctx.userId)
        .eq('organization_id', ctx.organizationId)
        .eq('consent_type', consentType);

      // Create new active consent
      const { data, error } = await supabase
        .from('consents')
        .insert({
          user_id: ctx.userId,
          organization_id: ctx.organizationId,
          consent_type: consentType,
          accepted_at: now,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error(`Error recording consent (${consentType}):`, error);
        throw new DatabaseError(`Failed to record consent: ${error.message}`);
      }

      records.push(data as ConsentRecord);

      // Log the consent action (immutable audit trail)
      await logConsentAction(ctx.userId, `consent.accepted.${consentType}`);
    }

    return records;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Withdraw a specific consent (GDPR right to withdraw).
 * Does NOT delete the record — just deactivates it.
 */
export async function withdrawConsent(consentType: ConsentType): Promise<void> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const supabase = await createClient();

    const { error } = await supabase
      .from('consents')
      .update({ is_active: false })
      .eq('user_id', ctx.userId)
      .eq('organization_id', ctx.organizationId)
      .eq('consent_type', consentType)
      .eq('is_active', true);

    if (error) {
      throw new DatabaseError(`Failed to withdraw consent: ${error.message}`);
    }

    // Log withdrawal
    await logConsentAction(ctx.userId, `consent.withdrawn.${consentType}`);
  } catch (error) {
    throw sanitizeError(error);
  }
}

// ============================================
// REQUIRE CONSENT (BLOCKING)
// ============================================

/**
 * Require consent before allowing system access.
 * Throws ForbiddenError if user has not consented.
 *
 * This should be called at the start of service layer functions.
 */
export async function requireConsent(): Promise<void> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const status = await hasUserConsented(ctx.userId, ctx.organizationId);

    if (!status.has_consented) {
      throw new ForbiddenError(
        `Consent required. Missing: ${status.missing_consents.join(', ')}`
      );
    }
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      throw error;
    }
    throw sanitizeError(error);
  }
}

// ============================================
// CONSENT LOGGING (IMMUTABLE)
// ============================================

/**
 * Log a consent action to the consent_logs table.
 * These logs are NEVER deleted (GDPR compliance proof).
 */
async function logConsentAction(userId: string, action: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('consent_logs')
      .insert({
        user_id: userId,
        action,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      // Log but don't throw — consent logging failure should not block the operation
      console.error('Error logging consent action:', error);
    }
  } catch (error) {
    console.error('Unexpected error logging consent action:', error);
  }
}

/**
 * Get consent history for a user (admin or self).
 */
export async function getConsentHistory(userId?: string): Promise<any[]> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const targetUserId = userId || ctx.userId;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('consent_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching consent history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in getConsentHistory:', error);
    return [];
  }
}
