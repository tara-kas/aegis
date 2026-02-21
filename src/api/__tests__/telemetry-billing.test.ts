/**
 * Unit Tests for Paid.ai Telemetry Billing Service
 *
 * FAILSAFE CHECK: Proves that a failed FHIR validation results in:
 *   1. outcome = 'failure'
 *   2. billedAmount = $0
 *   3. shouldSettle = false (no Stripe/Solana transaction triggered)
 *
 * Also verifies the success path and the Paid.ai client abstraction layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  traceObservationWorkflow,
  defaultPaidClient,
  getTraceStore,
  resetTraceStore,
  onTraceRecorded,
  type PaidClient,
  type TraceWorkflowInput,
} from '../telemetry-billing';
import type { FhirObservation } from '../fhir';
import type { CostBreakdown } from '../../types/financial';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validObservation: FhirObservation = {
  resourceType: 'Observation',
  id: 'obs-test-001',
  meta: { versionId: '1', lastUpdated: '2026-02-21T10:00:00Z' },
  status: 'final',
  category: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs',
        },
      ],
    },
  ],
  code: {
    coding: [
      {
        system: 'http://loinc.org',
        code: '8867-4',
        display: 'Heart rate',
      },
    ],
    text: 'Heart Rate',
  },
  subject: { reference: 'Patient/patient-001' },
  effectiveDateTime: '2026-02-21T10:00:00Z',
  valueQuantity: {
    value: 72,
    unit: 'beats/minute',
    system: 'http://unitsofmeasure.org',
    code: '/min',
  },
};

/** Deliberately invalid — missing required fields for Observation */
const invalidObservation: FhirObservation = {
  resourceType: 'Observation',
  id: '', // empty → fails 'Missing resource id'
  meta: { versionId: '', lastUpdated: '' }, // empty → fails meta checks
  status: '' as any, // empty → fails 'Observation must have a status'
  category: [], // empty → fails 'must have at least one category'
  code: { coding: [] }, // empty → fails 'must have a code with coding'
  subject: { reference: '' }, // empty → fails 'must reference a subject'
  effectiveDateTime: '', // empty → fails 'must have an effectiveDateTime'
};

const sampleCosts: CostBreakdown = {
  crusoeInference: 18.40,
  elevenLabsVoice: 3.20,
  googleHaiDef: 8.50,
  supabaseStorage: 0.15,
  solanaFees: 0.003,
  total: 30.253,
};

function makeInput(observation: FhirObservation, overrides?: Partial<TraceWorkflowInput>): TraceWorkflowInput {
  return {
    workflowId: 'surgical-obs',
    observation,
    billedAmount: 125.00,
    costs: sampleCosts,
    metadata: { patient: 'patient-001', encounter: 'encounter-001' },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Paid.ai Telemetry Billing', () => {
  beforeEach(() => {
    resetTraceStore();
  });

  // ─── FAILSAFE: Failed FHIR Validation ────────────────────────────────────

  describe('FAILSAFE: Failed FHIR validation', () => {
    it('should record outcome=failure with $0 billed when FHIR validation fails', async () => {
      const result = await traceObservationWorkflow(makeInput(invalidObservation));

      expect(result.validationPassed).toBe(false);
      expect(result.trace.outcome).toBe('failure');
      expect(result.trace.billedAmount).toBe(0);
      expect(result.trace.costAmount).toBe(0);
    });

    it('should set shouldSettle=false so no Stripe/Solana transaction is triggered', async () => {
      const result = await traceObservationWorkflow(makeInput(invalidObservation));

      expect(result.shouldSettle).toBe(false);
    });

    it('should include validation issues in the trace metadata', async () => {
      const result = await traceObservationWorkflow(makeInput(invalidObservation));

      expect(result.validationIssues.length).toBeGreaterThan(0);
      expect(result.trace.metadata.validationErrors).toBeDefined();
      expect(result.trace.metadata.failureReason).toBe('fhir_validation_failed');
    });

    it('should NOT call Paid.ai client with a success outcome for invalid data', async () => {
      const spyClient: PaidClient = {
        trace: vi.fn().mockResolvedValue({ accepted: true, traceId: 'mock' }),
      };

      await traceObservationWorkflow(makeInput(invalidObservation), spyClient);

      expect(spyClient.trace).toHaveBeenCalledTimes(1);
      const call = vi.mocked(spyClient.trace).mock.calls[0][0];
      expect(call.outcome).toBe('failure');
      expect(call.billedAmount).toBe(0);
      expect(call.costAmount).toBe(0);
    });

    it('should still produce a trace record even if the Paid.ai client throws', async () => {
      const brokenClient: PaidClient = {
        trace: vi.fn().mockRejectedValue(new Error('Paid.ai API down')),
      };

      const result = await traceObservationWorkflow(makeInput(invalidObservation), brokenClient);

      // Must not throw — billing failures must not crash clinical workflows
      expect(result.trace.outcome).toBe('failure');
      expect(result.trace.billedAmount).toBe(0);
      expect(result.shouldSettle).toBe(false);
    });
  });

  // ─── Success Path ────────────────────────────────────────────────────────

  describe('Successful FHIR validation', () => {
    it('should record outcome=success with correct billedAmount', async () => {
      const result = await traceObservationWorkflow(makeInput(validObservation));

      expect(result.validationPassed).toBe(true);
      expect(result.trace.outcome).toBe('success');
      expect(result.trace.billedAmount).toBe(125.00);
      expect(result.trace.costAmount).toBe(sampleCosts.total);
    });

    it('should set shouldSettle=true to trigger Stripe/Solana settlement', async () => {
      const result = await traceObservationWorkflow(makeInput(validObservation));

      expect(result.shouldSettle).toBe(true);
    });

    it('should have zero validation issues', async () => {
      const result = await traceObservationWorkflow(makeInput(validObservation));

      expect(result.validationIssues).toEqual([]);
      expect(result.trace.metadata.validationErrors).toBeUndefined();
      expect(result.trace.metadata.failureReason).toBeUndefined();
    });

    it('should include observation metadata in the trace', async () => {
      const result = await traceObservationWorkflow(makeInput(validObservation));

      expect(result.trace.metadata.observationId).toBe('obs-test-001');
      expect(result.trace.metadata.resourceType).toBe('Observation');
      expect(result.trace.metadata.patient).toBe('patient-001');
    });
  });

  // ─── In-Memory Trace Store ───────────────────────────────────────────────

  describe('Trace store & event bus', () => {
    it('should append successful traces to the store via defaultPaidClient', async () => {
      await traceObservationWorkflow(makeInput(validObservation));

      const store = getTraceStore();
      expect(store.length).toBe(1);
      expect(store[0].outcome).toBe('success');
      expect(store[0].billedAmount).toBe(125.00);
    });

    it('should append failed traces to the store with $0 billed', async () => {
      await traceObservationWorkflow(makeInput(invalidObservation));

      const store = getTraceStore();
      expect(store.length).toBe(1);
      expect(store[0].outcome).toBe('failure');
      expect(store[0].billedAmount).toBe(0);
    });

    it('should notify listeners when a new trace is recorded', async () => {
      const listener = vi.fn();
      const unsubscribe = onTraceRecorded(listener);

      await traceObservationWorkflow(makeInput(validObservation));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].outcome).toBe('success');

      unsubscribe();

      // After unsubscribe, listener should NOT fire
      await traceObservationWorkflow(makeInput(validObservation));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should reset store cleanly', async () => {
      await traceObservationWorkflow(makeInput(validObservation));
      expect(getTraceStore().length).toBe(1);

      resetTraceStore();
      expect(getTraceStore().length).toBe(0);
    });
  });

  // ─── Paid.ai Client Abstraction ──────────────────────────────────────────

  describe('Paid.ai client abstraction', () => {
    it('should accept a custom PaidClient implementation', async () => {
      const customClient: PaidClient = {
        trace: vi.fn().mockResolvedValue({ accepted: true, traceId: 'custom-001' }),
      };

      const result = await traceObservationWorkflow(makeInput(validObservation), customClient);

      expect(customClient.trace).toHaveBeenCalledTimes(1);
      expect(result.trace.outcome).toBe('success');
    });

    it('should handle Paid.ai rejection gracefully', async () => {
      const rejectingClient: PaidClient = {
        trace: vi.fn().mockResolvedValue({
          accepted: false,
          traceId: 'rejected-001',
          error: 'Rate limit exceeded',
        }),
      };

      // Must not throw
      const result = await traceObservationWorkflow(makeInput(validObservation), rejectingClient);
      expect(result.trace.outcome).toBe('success');
      expect(result.shouldSettle).toBe(true);
    });
  });
});
