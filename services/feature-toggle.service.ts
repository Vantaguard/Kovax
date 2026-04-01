/**
 * Feature toggles — backend source of truth for module availability.
 */
import { createClient } from '@/lib/supabase/server';
import { FEATURE_MODULES, type FeatureModuleName } from '@/lib/phase6/keys';
import { sanitizeError } from '@/lib/errors';

export async function isFeatureEnabledForOrg(
  organizationId: string,
  featureName: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('feature_toggles')
      .select('is_enabled')
      .eq('organization_id', organizationId)
      .eq('feature_name', featureName)
      .maybeSingle();

    if (error) {
      console.error('isFeatureEnabledForOrg', error);
      return true;
    }
    if (!data) return true;
    return data.is_enabled === true;
  } catch (error) {
    console.error('isFeatureEnabledForOrg', error);
    return false;
  }
}

export async function isModuleEnabled(
  organizationId: string,
  module: FeatureModuleName
): Promise<boolean> {
  return isFeatureEnabledForOrg(organizationId, module);
}

export async function setFeatureToggle(
  organizationId: string,
  featureName: string,
  isEnabled: boolean
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('feature_toggles').upsert(
      {
        organization_id: organizationId,
        feature_name: featureName,
        is_enabled: isEnabled,
      },
      { onConflict: 'organization_id,feature_name' }
    );
    if (error) {
      console.error('setFeatureToggle', error);
      return false;
    }
    return true;
  } catch (error) {
    throw sanitizeError(error);
  }
}

export async function getAllFeatureTogglesForOrg(
  organizationId: string
): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('feature_toggles')
    .select('feature_name, is_enabled')
    .eq('organization_id', organizationId);

  if (error || !data) return {};
  const map: Record<string, boolean> = {};
  for (const row of data) {
    map[row.feature_name] = row.is_enabled === true;
  }
  return map;
}
