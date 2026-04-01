/**
 * DYNAMIC FORM BUILDER SERVICE
 *
 * DB-driven form schema — NO hardcoded fields.
 * Uses: profile_fields, profile_field_values
 *
 * All form rendering is driven by the organization's field configuration.
 */

import { createClient } from '@/lib/supabase/server';
import { ValidationError, DatabaseError, NotFoundError, UnauthorizedError, sanitizeError } from '@/lib/errors';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { logActivity, LOG_ACTIONS, ENTITY_TYPES } from '@/services/log.service';

// ============================================
// TYPES
// ============================================

export type FieldType = 'text' | 'email' | 'date' | 'dropdown' | 'textarea' | 'number' | 'phone' | 'url';

export interface ProfileField {
  id: string;
  organization_id: string;
  field_name: string;
  field_type: FieldType;
  is_required: boolean;
  is_active: boolean;
  order_index: number;
  options?: string[];       // For dropdown fields (stored in DB as JSON, parsed here)
  placeholder?: string;
  created_at: string;
}

export interface ProfileFieldValue {
  id: string;
  profile_id: string;
  field_id: string;
  value: string | null;
}

export interface ProfileFieldWithValue extends ProfileField {
  value: string | null;
  field_value_id: string | null;
}

export interface DynamicFormSchema {
  fields: ProfileField[];
  organization_id: string;
}

// ============================================
// FIELD SCHEMA FUNCTIONS
// ============================================

/**
 * Get the dynamic profile schema for an organization.
 * Returns only active fields, ordered by order_index.
 */
export async function getProfileSchema(orgId: string): Promise<DynamicFormSchema> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profile_fields')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching profile schema:', error);
      throw new DatabaseError('Failed to fetch profile schema');
    }

    return {
      fields: (data || []) as ProfileField[],
      organization_id: orgId,
    };
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Get filled profile values for a given intern profile.
 * Returns fields merged with their current values.
 */
export async function getProfileValues(
  profileId: string,
  orgId?: string
): Promise<ProfileFieldWithValue[]> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const organizationId = orgId || ctx.organizationId;
    const supabase = await createClient();

    // Get the schema
    const schema = await getProfileSchema(organizationId);

    // Get existing values for this profile
    const { data: values, error } = await supabase
      .from('profile_field_values')
      .select('*')
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error fetching profile values:', error);
      throw new DatabaseError('Failed to fetch profile values');
    }

    // Merge schema with values
    const valueMap = new Map<string, ProfileFieldValue>();
    (values || []).forEach((v: ProfileFieldValue) => {
      valueMap.set(v.field_id, v);
    });

    return schema.fields.map((field) => {
      const fieldValue = valueMap.get(field.id);
      return {
        ...field,
        value: fieldValue?.value ?? null,
        field_value_id: fieldValue?.id ?? null,
      };
    });
  } catch (error) {
    throw sanitizeError(error);
  }
}

// ============================================
// DYNAMIC FIELD VALIDATION
// ============================================

/**
 * Validate dynamic field values against the DB schema.
 * NO hardcoded validation — everything is driven by the schema.
 */
export function validateDynamicFields(
  schema: DynamicFormSchema,
  values: Record<string, string | null>
): { valid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};

  for (const field of schema.fields) {
    if (!field.is_active) continue;

    const value = values[field.id] ?? values[field.field_name] ?? null;
    const fieldErrors: string[] = [];

    // Required check
    if (field.is_required && (!value || value.trim() === '')) {
      fieldErrors.push(`${field.field_name} is required`);
    }

    // Type validation (only if value is provided)
    if (value && value.trim() !== '') {
      switch (field.field_type) {
        case 'email': {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            fieldErrors.push(`${field.field_name} must be a valid email address`);
          }
          break;
        }
        case 'date': {
          const dateVal = new Date(value);
          if (isNaN(dateVal.getTime())) {
            fieldErrors.push(`${field.field_name} must be a valid date`);
          }
          break;
        }
        case 'number': {
          if (isNaN(Number(value))) {
            fieldErrors.push(`${field.field_name} must be a valid number`);
          }
          break;
        }
        case 'phone': {
          const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
          if (!phoneRegex.test(value)) {
            fieldErrors.push(`${field.field_name} must be a valid phone number`);
          }
          break;
        }
        case 'url': {
          try {
            new URL(value);
          } catch {
            fieldErrors.push(`${field.field_name} must be a valid URL`);
          }
          break;
        }
        case 'text':
        case 'textarea':
        case 'dropdown':
          // No specific type validation for these
          if (value.length > 2000) {
            fieldErrors.push(`${field.field_name} must be less than 2000 characters`);
          }
          break;
      }
    }

    if (fieldErrors.length > 0) {
      errors[field.id] = fieldErrors;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// SAVE PROFILE VALUES
// ============================================

/**
 * Save dynamic profile field values.
 * Upserts values — creates new or updates existing.
 * Validates against schema before saving.
 */
export async function saveProfileValues(
  profileId: string,
  values: Record<string, string | null>
): Promise<ProfileFieldWithValue[]> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const supabase = await createClient();

    // Verify the profile exists and get its org
    const { data: profile, error: profileError } = await supabase
      .from('intern_profiles')
      .select('id, organization_id, user_id')
      .eq('id', profileId)
      .eq('is_deleted', false)
      .single();

    if (profileError || !profile) {
      throw new NotFoundError('Intern profile');
    }

    // Get the schema for validation
    const schema = await getProfileSchema(profile.organization_id);

    // Validate
    const validation = validateDynamicFields(schema, values);
    if (!validation.valid) {
      throw new ValidationError('Dynamic field validation failed', validation.errors);
    }

    // Upsert values
    const upserts: { profile_id: string; field_id: string; value: string | null }[] = [];

    for (const field of schema.fields) {
      const value = values[field.id] ?? values[field.field_name] ?? null;
      // Only save fields that have a value or are being explicitly cleared
      if (value !== undefined) {
        upserts.push({
          profile_id: profileId,
          field_id: field.id,
          value: value?.trim() || null,
        });
      }
    }

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('profile_field_values')
        .upsert(upserts, {
          onConflict: 'profile_id,field_id',
        });

      if (upsertError) {
        console.error('Error saving profile values:', upsertError);
        throw new DatabaseError('Failed to save profile values');
      }
    }

    // Log activity
    await logActivity({
      action: LOG_ACTIONS.INTERN_UPDATED,
      entity_type: ENTITY_TYPES.INTERN_PROFILE,
      entity_id: profileId,
      metadata: {
        dynamic_fields_updated: Object.keys(values).length,
        fields: Object.keys(values),
      },
    });

    // Return updated values
    return getProfileValues(profileId, profile.organization_id);
  } catch (error) {
    throw sanitizeError(error);
  }
}

// ============================================
// ADMIN: MANAGE SCHEMA FIELDS
// ============================================

/**
 * Admin: Create a new profile field for an organization.
 */
export async function createProfileField(input: {
  field_name: string;
  field_type: FieldType;
  is_required: boolean;
  order_index?: number;
}): Promise<ProfileField> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const supabase = await createClient();

    // Get max order_index for auto-ordering
    const { data: existing } = await supabase
      .from('profile_fields')
      .select('order_index')
      .eq('organization_id', ctx.organizationId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = input.order_index ?? ((existing?.[0]?.order_index ?? -1) + 1);

    const { data, error } = await supabase
      .from('profile_fields')
      .insert({
        organization_id: ctx.organizationId,
        field_name: input.field_name,
        field_type: input.field_type,
        is_required: input.is_required,
        is_active: true,
        order_index: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile field:', error);
      throw new DatabaseError(`Failed to create profile field: ${error.message}`);
    }

    await logActivity({
      action: 'field.created',
      entity_type: 'profile_field',
      entity_id: data.id,
      metadata: { field_name: input.field_name, field_type: input.field_type },
    });

    return data;
  } catch (error) {
    throw sanitizeError(error);
  }
}

/**
 * Admin: Update a profile field (toggle active, change required, reorder).
 */
export async function updateProfileField(
  fieldId: string,
  input: Partial<{ field_name: string; is_required: boolean; is_active: boolean; order_index: number }>
): Promise<ProfileField> {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) throw new UnauthorizedError();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profile_fields')
      .update(input)
      .eq('id', fieldId)
      .eq('organization_id', ctx.organizationId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundError('Profile field');
    }

    await logActivity({
      action: 'field.updated',
      entity_type: 'profile_field',
      entity_id: fieldId,
      metadata: { updated_fields: Object.keys(input) },
    });

    return data;
  } catch (error) {
    throw sanitizeError(error);
  }
}
