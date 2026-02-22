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
import { isBillingHalted, getHaltContext } from './reliability-agents';
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
 * Returns acceptance without any network call.
 */
export const defaultPaidClient: PaidClient = {
    async trace(event: PaidTraceEvent): Promise<PaidTraceResponse> {
        return { accepted: true, traceId: event.traceId };
    },
};

// ─── Live Paid.ai Client ─────────────────────────────────────────────────────

/** Paid.ai base URL — override via VITE_PAID_AI_BASE_URL for staging. */
const PAID_API_BASE = import.meta.env.VITE_PAID_AI_BASE_URL ?? 'https://api.paid.ai';

/**
 * Reads the aegis_paid API key from the environment.
 *
 * IMPORTANT: Vite only exposes env vars that start with `VITE_` to the
 * browser bundle. The key MUST be stored as `VITE_PAID_AI_API_KEY` in
 * your .env file — a plain `PAID_AI_API_KEY` will NOT be available at
 * runtime in the React frontend.
 */
function getPaidApiKey(): string | undefined {
    // Vite strictly requires the VITE_ prefix for client-side access.
    // We read VITE_PAID_AI_API_KEY first (frontend), then fall back to
    // PAID_AI_API_KEY for server-side / CI / test runner contexts.
    return (
        (import.meta.env.VITE_PAID_AI_API_KEY as string | undefined) ??
        (import.meta.env.PAID_AI_API_KEY as string | undefined)
    );
}

/**
 * Live Paid.ai client that sends a real POST to the Paid.ai Traces API.
 *
 * • Reads `PAID_AI_API_KEY` from the environment (the aegis_paid key).
 * • Sends `Authorization: Bearer <key>` on every request.
 * • Wrapped in a robust try/catch — network failures are logged but
 *   NEVER crash the app.
 */
export const livePaidClient: PaidClient = {
    async trace(event: PaidTraceEvent): Promise<PaidTraceResponse> {
        const apiKey = getPaidApiKey();
        if (!apiKey) {
            logger.error('livePaidClient: PAID_AI_API_KEY is not set — cannot call Paid.ai');
            return { accepted: false, traceId: event.traceId, error: 'Missing API key' };
        }

        try {
            const response = await fetch(`${PAID_API_BASE}/v1/traces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    trace_id: event.traceId,
                    workflow_id: event.workflowId,
                    outcome: event.outcome,
                    billed_amount: event.billedAmount,
                    cost_amount: event.costAmount,
                    metadata: event.metadata,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'Unable to read response body');
                logger.error('Paid.ai API returned non-OK status', {
                    traceId: event.traceId,
                    status: response.status,
                    body: errorBody,
                });
                return {
                    accepted: false,
                    traceId: event.traceId,
                    error: `HTTP ${response.status}: ${errorBody}`,
                };
            }

            const data = await response.json().catch(() => ({}));
            logger.info('Paid.ai API accepted trace', {
                traceId: event.traceId,
                responseId: data?.id,
            });
            return { accepted: true, traceId: event.traceId };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown network error';
            logger.error('livePaidClient: fetch to Paid.ai failed', {
                traceId: event.traceId,
                error: message,
            });
            // MUST NOT crash — return a graceful failure
            return { accepted: false, traceId: event.traceId, error: message };
        }
    },
};

/**
 * Auto-selects the correct Paid.ai client based on the environment.
 *
 * If `PAID_AI_API_KEY` is set → livePaidClient (real API calls).
 * Otherwise → defaultPaidClient (in-memory, tests keep working).
 */
export function getActivePaidClient(): PaidClient {
    return getPaidApiKey() ? livePaidClient : defaultPaidClient;
}

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
    client: PaidClient = getActivePaidClient(),
): Promise<TraceResult> {
    const traceId = generateTraceId();

    // ── Step 0: Circuit-breaker — Incident Commander can halt billing ──────
    if (isBillingHalted()) {
        const ctx = getHaltContext();
        logger.warn('Billing halted by Incident Commander — trace rejected', {
            traceId,
            reason: ctx.reason,
            haltedAt: ctx.haltedAt,
        });

        const haltedTrace: PaidAiTrace = {
            traceId,
            workflowId: input.workflowId,
            outcome: 'failure',
            billedAmount: 0,
            costAmount: 0,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            metadata: {
                ...input.metadata,
                observationId: input.observation.id ?? 'unknown',
                resourceType: input.observation.resourceType,
                failureReason: 'billing_halted_by_incident_commander',
                haltReason: ctx.reason,
            },
        };

        return {
            trace: haltedTrace,
            validationPassed: false,
            validationIssues: [`Billing halted: ${ctx.reason}`],
            shouldSettle: false,
        };
    }

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

    // ── Step 3: Always append to the in-memory store & notify listeners ────
    // This runs regardless of which PaidClient was used (live or default),
    // ensuring the React FinancialDashboard stays updated in real time.
    _traceStore.push(trace);
    notifyListeners(trace);

    return {
        trace,
        validationPassed: validation.valid,
        validationIssues: validation.issues,
        shouldSettle,
    };
}
