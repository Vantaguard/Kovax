/**
 * Database-driven application configuration (global + organization merge).
 */
import { createClient } from '@/lib/supabase/server';
import { CONFIG_KEYS } from '@/lib/phase6/keys';
import { sanitizeError } from '@/lib/errors';

export interface MergedUiConfig {
  displayName: string;
  themePrimary: string;
  themeAccent: string;
  paginationLimit: number;
  showStats: boolean;
}

function parseJsonValue<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return (raw as T) ?? fallback;
    }
  }
  return raw as T;
}

/**
 * Single config value (first match: org override → global).
 */
export async function getConfig(key: string, organizationId?: string | null): Promise<unknown | null> {
  try {
    const supabase = await createClient();
    if (organizationId) {
      const { data: orgRow } = await supabase
        .from('configurations')
        .select('value')
        .eq('scope_type', 'organization')
        .eq('scope_id', organizationId)
        .eq('key', key)
        .maybeSingle();
      if (orgRow?.value !== undefined && orgRow?.value !== null) return orgRow.value;
    }
    const { data: globalRow } = await supabase
      .from('configurations')
      .select('value')
      .eq('scope_type', 'global')
      .is('scope_id', null)
      .eq('key', key)
      .maybeSingle();
    return globalRow?.value ?? null;
  } catch (error) {
    console.error('getConfig', error);
    return null;
  }
}

/**
 * All key/value pairs for an organization scope + inherited global keys.
 */
export async function getOrgConfig(organizationId: string): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const out: Record<string, unknown> = {};

  const { data: globalRows } = await supabase
    .from('configurations')
    .select('key, value')
    .eq('scope_type', 'global')
    .is('scope_id', null);

  for (const row of globalRows || []) {
    out[row.key] = row.value;
  }

  const { data: orgRows } = await supabase
    .from('configurations')
    .select('key, value')
    .eq('scope_type', 'organization')
    .eq('scope_id', organizationId);

  for (const row of orgRows || []) {
    out[row.key] = row.value;
  }

  return out;
}

export async function setConfig(
  key: string,
  value: unknown,
  scopeType: 'global' | 'organization',
  scopeId: string | null
): Promise<boolean> {
  try {
    const supabase = await createClient();
    let q = supabase
      .from('configurations')
      .select('id')
      .eq('scope_type', scopeType)
      .eq('key', key);
    q = scopeId === null ? q.is('scope_id', null) : q.eq('scope_id', scopeId);
    const { data: existing } = await q.maybeSingle();

    const safeValue = typeof value === 'string' ? JSON.stringify(value) : value;

    if (existing?.id) {
      const { error } = await supabase
        .from('configurations')
        .update({ value: safeValue as never })
        .eq('id', existing.id);
      if (error) {
        console.error('setConfig update', error);
        throw new Error(error.message);
      }
      return true;
    }

    const { error } = await supabase.from('configurations').insert({
      scope_type: scopeType,
      scope_id: scopeId,
      key,
      value: safeValue as never,
    });
    if (error) {
      console.error('setConfig insert', error);
      throw new Error(error.message);
    }
    return true;
  } catch (error) {
    console.error('setConfig', error);
    throw sanitizeError(error);
  }
}

/**
 * Typed UI config for layout/branding (merged org + global).
 */
export async function getMergedUiConfig(organizationId: string | null): Promise<MergedUiConfig> {
  const orgId = organizationId || undefined;

  const displayRaw = await getConfig(CONFIG_KEYS.APP_DISPLAY_NAME, orgId);
  const primaryRaw = await getConfig(CONFIG_KEYS.THEME_PRIMARY, orgId);
  const accentRaw = await getConfig(CONFIG_KEYS.THEME_ACCENT, orgId);
  const pageRaw = await getConfig(CONFIG_KEYS.DEFAULTS_PAGINATION_LIMIT, orgId);
  const statsRaw = await getConfig(CONFIG_KEYS.DEFAULTS_SHOW_STATS, orgId);

  return {
    displayName: parseJsonValue(displayRaw, 'Kovax') as string,
    themePrimary: parseJsonValue(primaryRaw, '#f59e0b') as string,
    themeAccent: parseJsonValue(accentRaw, '#38bdf8') as string,
    paginationLimit: Number(parseJsonValue(pageRaw, 10)) || 10,
    showStats: Boolean(parseJsonValue(statsRaw, true)),
  };
}
