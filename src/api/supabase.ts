/**
 * Supabase integration layer.
 *
 * Re-exports the typed Supabase client from the Lovable-generated integration
 * and provides higher-level helpers for generic queries, inserts, and PHI audit logging.
 *
 * Row Level Security policies:
 * - fhir_patients: CRUD for users with 'clinician' role
 * - fhir_encounters: CRUD for users with 'clinician' role
 * - fhir_observations: CRUD for users with 'clinician' role
 * - user_roles: SELECT own role for authenticated users
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '../utils/logger';

export { supabase };

export interface SupabaseQueryOptions {
  table: string;
  select?: string;
  filters?: Record<string, string | number | boolean>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export async function supabaseQuery<T>(options: SupabaseQueryOptions): Promise<{ data: T[] | null; error: string | null }> {
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
  const { data, error } = await supabase.from(table).insert(record).select().single();
  if (error) {
    logger.error('Supabase insert failed', { table, error: error.message });
    return { data: null, error: error.message };
  }
  return { data: data as T, error: null };
}

export async function logPhiAccess(
  action: 'read' | 'create' | 'update' | 'delete',
  resourceType: string,
  resourceId: string,
  userId: string,
): Promise<void> {
  logger.audit(`PHI ${action}: ${resourceType}/${resourceId}`, resourceType, resourceId, userId);
}
