/**
 * Paid.ai Outcome-Based Billing — Telemetry Billing Service
 *
 * Wraps paidClient.trace() to implement outcome-based billing for
 * the Aegis surgical agent. A charge is ONLY recorded when:
 *
 *   1. A FHIR Observation passes validation (fhirValidation.ts)
 *   2. The observation is persisted (or would be persisted in production)
 *
 * If validation fails, the trace is recorded with outcome='failure',
 * billedAmount=0, and NO Stripe/Solana transaction is triggered.
 *
 * COMPLIANCE:
 *   • All trace events are immutable and audit-logged
 *   • Cost breakdown follows CostBreakdown schema (financial.ts)
 *   • Failed traces preserve the error reason for regulatory review
 */

import type { FhirObservation } from './fhir';
import type { PaidAiTrace, CostBreakdown } from '../types/financial';
import { validateFhirResource } from '../utils/fhirValidation';
import { logger } from '../utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TraceWorkflowInput {
  /** The workflow that produced this observation */
  workflowId: string;
  /** The FHIR Observation to validate & bill for */
  observation: FhirObservation;
  /** Hospital-side billed amount for a successful outcome (€) */
  billedAmount: number;
  /** Vendor API costs incurred producing this observation (€) */
  costs: CostBreakdown;
  /** Arbitrary metadata for audit trail */
  metadata?: Record<string, string>;
}

export interface TraceResult {
  /** The Paid.ai trace record */
  trace: PaidAiTrace;
  /** Whether the observation passed FHIR validation */
  validationPassed: boolean;
  /** Validation issues (empty if passed) */
  validationIssues: string[];
  /** Whether a Stripe/Solana settlement should be triggered */
  shouldSettle: boolean;
}

// ─── Paid.ai Client Abstraction ──────────────────────────────────────────────

/**
 * Minimal interface for Paid.ai's trace API.
 * In production this would be the real SDK; here we provide a
 * default in-memory implementation for the hackathon.
 */
export interface PaidClient {
  trace(event: PaidTraceEvent): Promise<PaidTraceResponse>;
}

export interface PaidTraceEvent {
  traceId: string;
  workflowId: string;
  outcome: 'success' | 'failure' | 'pending';
  billedAmount: number;
  costAmount: number;
  metadata: Record<string, string>;
}

export interface PaidTraceResponse {
  accepted: boolean;
  traceId: string;
  error?: string;
}

// ─── Default In-Memory Paid Client ───────────────────────────────────────────

/** Trace store accessible for testing and for the financial dashboard */
let _traceStore: PaidAiTrace[] = [];

/**
 * Returns a snapshot of all recorded traces.
 * Used by useFinancialData to feed the dashboard in real time.
 */
export function getTraceStore(): PaidAiTrace[] {
  return [..._traceStore];
}

/** Clears the trace store (useful in tests) */
export function resetTraceStore(): void {
  _traceStore = [];
}

/**
 * Appends a trace to the in-memory store.
 * Exposed so that external subscribers (e.g. useTelemetry) can
 * listen for new billing events.
 */
type TraceListener = (trace: PaidAiTrace) => void;
const _listeners: Set<TraceListener> = new Set();

export function onTraceRecorded(listener: TraceListener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

function notifyListeners(trace: PaidAiTrace): void {
  for (const fn of _listeners) {
    try {
      fn(trace);
    } catch {
      // listener errors must never break the billing pipeline
    }
  }
}

/**
 * Default in-memory Paid.ai client for hackathon / devnet usage.
 * Records traces locally and notifies subscribers.
 */
export const defaultPaidClient: PaidClient = {
  async trace(event: PaidTraceEvent): Promise<PaidTraceResponse> {
    const now = new Date().toISOString();
    const record: PaidAiTrace = {
      traceId: event.traceId,
      workflowId: event.workflowId,
      outcome: event.outcome,
      billedAmount: event.billedAmount,
      costAmount: event.costAmount,
      startedAt: now,
      completedAt: event.outcome !== 'pending' ? now : undefined,
      metadata: event.metadata,
    };
    _traceStore.push(record);
    notifyListeners(record);
    return { accepted: true, traceId: event.traceId };
  },
};

// ─── Trace ID Generation ─────────────────────────────────────────────────────

let _traceSeq = 0;

function generateTraceId(): string {
  _traceSeq++;
  const ts = Date.now().toString(36);
  const seq = _traceSeq.toString(36).padStart(4, '0');
  return `trace-${ts}-${seq}`;
}

// ─── Core Billing Function ───────────────────────────────────────────────────

/**
 * Records a Paid.ai trace for an observation workflow.
 *
 * BILLING RULE:
 *   • If the FHIR Observation passes validation → outcome='success',
 *     billedAmount is set to the hospital rate, shouldSettle=true
 *     (triggers downstream Stripe checkout + Solana micropayment).
 *   • If validation fails → outcome='failure', billedAmount=0,
 *     shouldSettle=false. No blockchain transaction is created.
 *
 * @param input   — workflow context and the observation to validate
 * @param client  — Paid.ai client (defaults to in-memory for hackathon)
 * @returns TraceResult with the trace record and settlement flag
 */
export async function traceObservationWorkflow(
  input: TraceWorkflowInput,
  client: PaidClient = defaultPaidClient,
): Promise<TraceResult> {
  const traceId = generateTraceId();

  // ── Step 1: Validate the FHIR Observation ──────────────────────────────
  const validation = validateFhirResource(input.observation);

  const outcome: 'success' | 'failure' = validation.valid ? 'success' : 'failure';
  const effectiveBilled = validation.valid ? input.billedAmount : 0;
  const effectiveCost = validation.valid ? input.costs.total : 0;
  const shouldSettle = validation.valid;

  // ── Step 2: Record the trace via Paid.ai ───────────────────────────────
  const metadata: Record<string, string> = {
    ...input.metadata,
    observationId: input.observation.id ?? 'unknown',
    resourceType: input.observation.resourceType,
  };

  if (!validation.valid) {
    metadata.validationErrors = validation.issues.join('; ');
    metadata.failureReason = 'fhir_validation_failed';
  }

  try {
    const response = await client.trace({
      traceId,
      workflowId: input.workflowId,
      outcome,
      billedAmount: effectiveBilled,
      costAmount: effectiveCost,
      metadata,
    });

    if (!response.accepted) {
      logger.error('Paid.ai rejected trace', {
        traceId,
        error: response.error,
      });
    } else {
      logger.info('Paid.ai trace recorded', {
        traceId,
        outcome,
        billedAmount: effectiveBilled,
        shouldSettle,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Paid.ai error';
    logger.error('Paid.ai trace failed', { traceId, error: message });
    // Billing pipeline failure must not crash the clinical workflow.
    // The trace is still returned so the caller can retry or log.
  }

  const trace: PaidAiTrace = {
    traceId,
    workflowId: input.workflowId,
    outcome,
    billedAmount: effectiveBilled,
    costAmount: effectiveCost,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    metadata,
  };

  return {
    trace,
    validationPassed: validation.valid,
    validationIssues: validation.issues,
    shouldSettle,
  };
}
