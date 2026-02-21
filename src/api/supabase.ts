/**
 * Supabase client with RLS-aware queries.
 *
 * Row Level Security policies assumed (to be enforced in production):
 * - fhir_patients: SELECT WHERE auth.role() = 'clinician'
 * - fhir_encounters: SELECT WHERE auth.uid() IN (SELECT user_id FROM care_team WHERE encounter_id = id)
 * - fhir_observations: SELECT WHERE auth.role() IN ('clinician', 'nurse')
 * - audit_log: INSERT for all authenticated, SELECT for admin only
 *
 * Currently uses mock fallback when SUPABASE_URL is not configured.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logger.warn('Supabase not configured — using mock data fallback');
    return null;
  }
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
    db: { schema: 'public' },
  });
  return client;
}

export interface SupabaseQueryOptions {
  table: string;
  select?: string;
  filters?: Record<string, string | number | boolean>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export async function supabaseQuery<T>(options: SupabaseQueryOptions): Promise<{ data: T[] | null; error: string | null }> {
  const supabase = getClient();
  if (!supabase) {
    logger.info('Supabase query bypassed (no client)', { table: options.table });
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    let query = supabase.from(options.table).select(options.select ?? '*');

    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        query = query.eq(key, value);
      }
    }
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit ?? 10) - 1);

    const { data, error } = await query;

    if (error) {
      logger.error('Supabase query failed', { table: options.table, error: error.message });
      return { data: null, error: error.message };
    }

    return { data: data as T[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Supabase query exception', { table: options.table, error: message });
    return { data: null, error: message };
  }
}

export async function supabaseInsert<T extends Record<string, unknown>>(
  table: string,
  record: T,
): Promise<{ data: T | null; error: string | null }> {
  const supabase = getClient();
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { data, error } = await supabase.from(table).insert(record).select().single();
  if (error) {
    logger.error('Supabase insert failed', { table, error: error.message });
    return { data: null, error: error.message };
  }
  return { data: data as T, error: null };
}

/** PHI access audit stub — logs every read/write touching patient data */
export async function logPhiAccess(
  action: 'read' | 'create' | 'update' | 'delete',
  resourceType: string,
  resourceId: string,
  userId: string,
): Promise<void> {
  logger.audit(`PHI ${action}: ${resourceType}/${resourceId}`, resourceType, resourceId, userId);

  const supabase = getClient();
  if (!supabase) return;

  await supabase.from('audit_log').insert({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    user_id: userId,
    timestamp: new Date().toISOString(),
    phi_accessed: true,
  });
}

export { getClient };
