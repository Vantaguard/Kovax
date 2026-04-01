/**
 * PRIVACY SERVICE — FIELD-LEVEL ENFORCEMENT
 *
 * Privacy-by-design: field-level masking using field_privacy_rules + data_classifications.
 *
 * CRITICAL: Privacy is applied BEFORE data leaves the service layer.
 * This service is called by intern, project, task services before returning data.
 *
 * Classification hierarchy: public < internal < confidential < restricted
 *
 * Rules:
 * - If field is not visible to viewer's role → REMOVE the field entirely
 * - If field is masked for viewer's role → TRANSFORM the value
 * - Owner (self) always sees their own unmasked data
 */

import { createClient } from '@/lib/supabase/server';
import type { InternProfileExtended } from '@/services/intern.service.v2';

// ============================================
// MASKING CONSTANTS
// ============================================

const MASK_FULL = '••••••••';
const MASK_REDACTED = '[REDACTED]';

// ============================================
// TYPES
// ============================================

export interface FieldPrivacyRule {
  id: string;
  field_id: string;
  classification_id: string;
  visible_to_role: string | null;
  is_masked: boolean;
  field_name?: string;
  classification_name?: string;
}

interface PrivacyContext {
  maskedFields: Set<string>;
  hiddenFields: Set<string>;
}

// ============================================
// CLASSIFICATION HIERARCHY
// ============================================

const CLASSIFICATION_LEVELS: Record<string, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

// ============================================
// LOAD PRIVACY RULES
// ============================================

/**
 * Load all privacy rules for the viewer's role in this organization.
 * Returns sets of field names that should be masked or hidden.
 */
async function loadPrivacyContext(
  organizationId: string,
  viewerRoleId: string | null
): Promise<PrivacyContext> {
  if (!viewerRoleId) {
    return { maskedFields: new Set(), hiddenFields: new Set() };
  }

  const supabase = await createClient();

  // Get all privacy rules for fields in this org
  const { data: rules, error } = await supabase
    .from('field_privacy_rules')
    .select(`
      id,
      is_masked,
      visible_to_role,
      classification_id,
      profile_fields!field_privacy_rules_field_id_fkey (
        field_name,
        organization_id
      ),
      data_classifications!field_privacy_rules_classification_id_fkey (
        name
      )
    `)
    .not('visible_to_role', 'is', null);

  if (error || !rules) {
    return { maskedFields: new Set(), hiddenFields: new Set() };
  }

  const maskedFields = new Set<string>();
  const hiddenFields = new Set<string>();

  for (const rule of rules) {
    const field = rule.profile_fields as any;
    const fieldData = Array.isArray(field) ? field[0] : field;
    if (!fieldData?.field_name) continue;

    // Only apply rules for fields in this org
    if (fieldData.organization_id !== organizationId) continue;

    const fieldName = fieldData.field_name;

    // If this rule applies to the viewer's role
    if (rule.visible_to_role === viewerRoleId) {
      if (rule.is_masked) {
        maskedFields.add(fieldName);
      }
    } else {
      // If there's a rule for a different role but NOT for the viewer's role,
      // the field is hidden from the viewer
      // Only hide if there's no explicit rule for the viewer
      const hasViewerRule = rules.some(
        (r: any) => {
          const rf = Array.isArray(r.profile_fields) ? r.profile_fields[0] : r.profile_fields;
          return rf?.field_name === fieldName && r.visible_to_role === viewerRoleId;
        }
      );
      if (!hasViewerRule) {
        hiddenFields.add(fieldName);
      }
    }
  }

  return { maskedFields, hiddenFields };
}

// ============================================
// MASKING FUNCTIONS
// ============================================

/**
 * Mask an email address: john.doe@example.com → j***e@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return MASK_FULL;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Mask a phone number: +91-9876543210 → ****3210
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return MASK_FULL;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return MASK_FULL;
  return `****${digits.slice(-4)}`;
}

/**
 * Mask generic text: "Hello World" → "Hel••••••"
 */
export function maskText(text: string): string {
  if (!text || text.length <= 3) return MASK_FULL;
  const visible = Math.min(3, Math.floor(text.length / 3));
  return text.substring(0, visible) + MASK_FULL;
}

/**
 * Apply the appropriate mask based on field type.
 */
export function applyMask(value: string, fieldType: string, fieldName: string): string {
  // Determine masking strategy based on field type or name
  const lowerName = fieldName.toLowerCase();

  if (fieldType === 'email' || lowerName.includes('email')) {
    return maskEmail(value);
  }
  if (fieldType === 'phone' || lowerName.includes('phone') || lowerName.includes('mobile')) {
    return maskPhone(value);
  }
  if (lowerName.includes('ssn') || lowerName.includes('national') || lowerName.includes('passport')) {
    return MASK_REDACTED;
  }
  // Default: partial text mask
  return maskText(value);
}

// ============================================
// APPLY PRIVACY TO DYNAMIC FIELD VALUES
// ============================================

/**
 * Apply field-level privacy to dynamic profile field values.
 * This is the core privacy enforcement function.
 *
 * @param fieldValues - Array of field values with field metadata
 * @param viewerUserId - The user viewing the data
 * @param ownerId - The user who owns the data
 * @param organizationId - Current org
 * @param viewerRoleId - Viewer's role ID
 */
export async function applyFieldLevelPrivacy<T extends { field_name: string; value: string | null; field_type?: string }>(
  fieldValues: T[],
  viewerUserId: string,
  ownerId: string,
  organizationId: string,
  viewerRoleId: string | null
): Promise<T[]> {
  // Owner always sees their own unmasked data
  if (viewerUserId === ownerId) {
    return fieldValues;
  }

  const privacyCtx = await loadPrivacyContext(organizationId, viewerRoleId);

  return fieldValues
    .filter((fv) => {
      // Remove hidden fields entirely
      return !privacyCtx.hiddenFields.has(fv.field_name);
    })
    .map((fv) => {
      // Mask fields that should be masked
      if (privacyCtx.maskedFields.has(fv.field_name) && fv.value) {
        return {
          ...fv,
          value: applyMask(fv.value, fv.field_type || 'text', fv.field_name),
        };
      }
      return fv;
    });
}

// ============================================
// APPLY PRIVACY TO INTERN PROFILES
// ============================================

/**
 * Apply privacy masking to an extended intern profile.
 * Masks user.email if "Email" field has masking rules.
 */
export async function applyPrivacyToInternProfileExtended(
  profile: InternProfileExtended,
  viewerUserId: string,
  viewerOrganizationId: string,
  viewerRoleId: string | null
): Promise<InternProfileExtended> {
  const privacyCtx = await loadPrivacyContext(viewerOrganizationId, viewerRoleId);

  const isSelf = profile.user?.id === viewerUserId;
  if (isSelf || (privacyCtx.maskedFields.size === 0 && privacyCtx.hiddenFields.size === 0)) {
    return profile;
  }

  let next = { ...profile };

  // Mask email if Email field has masking rules
  if (privacyCtx.maskedFields.has('Email') && next.user?.email) {
    next = {
      ...next,
      user: { ...next.user, email: maskEmail(next.user.email) },
    };
  }

  // Mask approver email too
  if (privacyCtx.maskedFields.has('Email') && next.approved_by_user?.email) {
    next = {
      ...next,
      approved_by_user: { ...next.approved_by_user, email: maskEmail(next.approved_by_user.email) },
    };
  }

  // If phone-related fields are hidden, we can handle that here too
  // (The dynamic field values are handled separately by applyFieldLevelPrivacy)

  return next;
}

/**
 * Apply privacy to a list of intern profiles.
 */
export async function applyPrivacyToInternList(
  profiles: InternProfileExtended[],
  viewerUserId: string,
  viewerOrganizationId: string,
  viewerRoleId: string | null
): Promise<InternProfileExtended[]> {
  // Load privacy context once for the entire list (performance optimization)
  const results: InternProfileExtended[] = [];
  for (const p of profiles) {
    results.push(
      await applyPrivacyToInternProfileExtended(p, viewerUserId, viewerOrganizationId, viewerRoleId)
    );
  }
  return results;
}
