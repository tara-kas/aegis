import { useState, useEffect, useCallback } from 'react';
import type { FhirResource, FhirOperationOutcome } from '../api/fhir';
import { isOperationOutcome } from '../utils/fhirValidation';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

interface UseFhirResourceOptions<T> {
  fetcher: () => Promise<T>;
  fallback: T;
  resourceType: string;
  autoFetch?: boolean;
}

interface UseFhirResourceReturn<T> {
  data: T;
  loading: boolean;
  error: FhirOperationOutcome | null;
  refetch: () => Promise<void>;
}

const log = logger.withContext('FHIR');

export function useFhirResource<T extends FhirResource | FhirResource[]>(
  options: UseFhirResourceOptions<T>,
): UseFhirResourceReturn<T> {
  const { fetcher, fallback, resourceType, autoFetch = true } = options;

  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FhirOperationOutcome | null>(null);

  const refetch = useCallback(async () => {
    const stopTimer = metrics.startTimer('fhir.fetch_duration', { resourceType });
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      metrics.increment('fhir.fetch_success', { resourceType });
      log.info(`Fetched ${resourceType}`);
    } catch (err) {
      if (isOperationOutcome(err)) {
        setError(err);
        log.error(`FHIR error fetching ${resourceType}`, { issues: err.issue });
      } else {
        const outcome: FhirOperationOutcome = {
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'exception', diagnostics: (err as Error).message }],
        };
        setError(outcome);
        log.error(`Exception fetching ${resourceType}`, { error: (err as Error).message });
      }
      metrics.increment('fhir.fetch_error', { resourceType });
      log.info(`Using fallback data for ${resourceType}`);
      setData(fallback);
    } finally {
      setLoading(false);
      stopTimer();
    }
  }, [fetcher, fallback, resourceType]);

  useEffect(() => {
    if (autoFetch) {
      refetch();
    }
  }, [autoFetch, refetch]);

  return { data, loading, error, refetch };
}
