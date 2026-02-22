/**
 * Unit Tests for Incident Commander — Reliability Agent
 *
 * FAILSAFE CHECKS:
 *   1. Latency > 200 ms → billing halted, incident created, alert emitted
 *   2. Anomaly detected → billing halted, incident created, alert emitted
 *   3. Billing pipeline refuses traces while halted
 *   4. Slack remediation payload is correctly formatted
 *   5. Normal frames do NOT trigger the commander
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    evaluateFrame,
    isBillingHalted,
    haltBilling,
    resumeBilling,
    getHaltContext,
    formatSlackRemediation,
    LATENCY_THRESHOLD_MS,
    ANOMALY_SCORE_THRESHOLD,
    _resetForTesting,
} from '../reliability-agents';
import { traceObservationWorkflow, resetTraceStore } from '../telemetry-billing';
import type { KinematicFrame } from '../../types/telemetry';
import type { FhirObservation } from '../fhir';
import type { CostBreakdown } from '../../types/financial';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFrame(overrides: Partial<KinematicFrame> = {}): KinematicFrame {
    return {
        timestamp: new Date().toISOString(),
        frameId: 1,
        deviceId: 'robot-arm-001',
        joints: [],
        endEffector: {
            position: { x: 200, y: 150, z: 100 },
            orientation: { roll: 0, pitch: 0, yaw: 0 },
            forceN: 1.2,
            gripperApertureMm: 8,
        },
        isAnomalous: false,
        anomalyScore: 0.05,
        ...overrides,
    };
}

const validObservation: FhirObservation = {
    resourceType: 'Observation',
    id: 'obs-test-cmd',
    meta: { versionId: '1', lastUpdated: '2026-02-21T10:00:00Z' },
    status: 'final',
    category: [{
        coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
        }],
    }],
    code: {
        coding: [{
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate',
        }],
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

const sampleCosts: CostBreakdown = {
    crusoeInference: 0.012,
    elevenLabsVoice: 0,
    googleHaiDef: 0.005,
    supabaseStorage: 0.001,
    solanaFees: 0.00001,
    total: 0.01801,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Incident Commander — Reliability Agent', () => {
    beforeEach(() => {
        _resetForTesting();
        resetTraceStore();
    });

    // ─── Normal Operation ────────────────────────────────────────────────────

    describe('Normal frames (no violations)', () => {
        it('should NOT trigger for a normal frame with low anomaly score', () => {
            const frame = makeFrame({ anomalyScore: 0.1, isAnomalous: false });
            const result = evaluateFrame(frame, null);

            expect(result.triggered).toBe(false);
            expect(result.incident).toBeNull();
            expect(result.alert).toBeNull();
            expect(result.slackPayload).toBeNull();
            expect(isBillingHalted()).toBe(false);
        });

        it('should NOT trigger when latency is within threshold', () => {
            const prevTs = new Date(Date.now() - 50).toISOString(); // 50ms ago
            const frame = makeFrame();
            const result = evaluateFrame(frame, prevTs);

            expect(result.triggered).toBe(false);
            expect(isBillingHalted()).toBe(false);
        });
    });

    // ─── Latency Breach ──────────────────────────────────────────────────────

    describe('Kinematic latency breach (> 200ms)', () => {
        it('should trigger and halt billing when latency exceeds threshold', () => {
            const prevTs = new Date(Date.now() - 350).toISOString(); // 350ms ago
            const frame = makeFrame({ frameId: 75 });
            const result = evaluateFrame(frame, prevTs);

            expect(result.triggered).toBe(true);
            expect(isBillingHalted()).toBe(true);
        });

        it('should create an incident with correct source and severity', () => {
            const prevTs = new Date(Date.now() - 350).toISOString();
            const frame = makeFrame({ frameId: 75 });
            const result = evaluateFrame(frame, prevTs);

            expect(result.incident).not.toBeNull();
            expect(result.incident!.source).toBe('api-latency');
            expect(result.incident!.status).toBe('open');
            expect(result.incident!.remediationSteps.length).toBeGreaterThan(0);
        });

        it('should create a critical alert for the anomaly banner', () => {
            const prevTs = new Date(Date.now() - 350).toISOString();
            const frame = makeFrame({ frameId: 75 });
            const result = evaluateFrame(frame, prevTs);

            expect(result.alert).not.toBeNull();
            expect(result.alert!.severity).toBe('critical');
            expect(result.alert!.source).toBe('telemetry');
            expect(result.alert!.acknowledged).toBe(false);
        });

        it('should produce a Slack remediation payload', () => {
            const prevTs = new Date(Date.now() - 350).toISOString();
            const frame = makeFrame({ frameId: 75 });
            const result = evaluateFrame(frame, prevTs);

            expect(result.slackPayload).not.toBeNull();
            expect(result.slackPayload!.channel).toBe('#aegis-incidents');
            expect(result.slackPayload!.blocks.length).toBeGreaterThan(0);
        });

        it('should escalate to critical severity when latency > 2x threshold', () => {
            const prevTs = new Date(Date.now() - 500).toISOString(); // 500ms = 2.5x threshold
            const frame = makeFrame({ frameId: 76 });
            const result = evaluateFrame(frame, prevTs);

            expect(result.incident!.severity).toBe('critical');
        });
    });

    // ─── Anomaly Detection ───────────────────────────────────────────────────

    describe('Kinematic anomaly detection', () => {
        it('should trigger when anomalyScore exceeds threshold', () => {
            const frame = makeFrame({
                frameId: 150,
                anomalyScore: 0.87,
                isAnomalous: true,
            });
            const result = evaluateFrame(frame, null);

            expect(result.triggered).toBe(true);
            expect(isBillingHalted()).toBe(true);
            expect(result.incident!.source).toBe('kinematic-anomaly');
        });

        it('should trigger when isAnomalous is true even with borderline score', () => {
            const frame = makeFrame({
                isAnomalous: true,
                anomalyScore: 0.71,
            });
            const result = evaluateFrame(frame, null);

            expect(result.triggered).toBe(true);
        });

        it('should include anomaly score in incident description', () => {
            const frame = makeFrame({
                isAnomalous: true,
                anomalyScore: 0.92,
                frameId: 150,
            });
            const result = evaluateFrame(frame, null);

            expect(result.incident!.description).toContain('0.920');
            expect(result.incident!.title).toContain('0.92');
        });
    });

    // ─── Billing Circuit-Breaker Integration ─────────────────────────────────

    describe('Billing circuit-breaker', () => {
        it('should block traceObservationWorkflow when billing is halted', async () => {
            haltBilling('Test: manual halt');
            expect(isBillingHalted()).toBe(true);

            const result = await traceObservationWorkflow({
                workflowId: 'surgical-obs',
                observation: validObservation,
                billedAmount: 125.0,
                costs: sampleCosts,
            });

            expect(result.trace.outcome).toBe('failure');
            expect(result.trace.billedAmount).toBe(0);
            expect(result.shouldSettle).toBe(false);
            expect(result.trace.metadata.failureReason).toBe('billing_halted_by_incident_commander');
        });

        it('should allow billing again after resumeBilling()', async () => {
            haltBilling('Test halt');
            expect(isBillingHalted()).toBe(true);

            resumeBilling();
            expect(isBillingHalted()).toBe(false);

            const result = await traceObservationWorkflow({
                workflowId: 'surgical-obs',
                observation: validObservation,
                billedAmount: 125.0,
                costs: sampleCosts,
            });

            expect(result.trace.outcome).toBe('success');
            expect(result.trace.billedAmount).toBe(125.0);
            expect(result.shouldSettle).toBe(true);
        });

        it('should provide halt context with reason and timestamp', () => {
            haltBilling('Latency spike detected');
            const ctx = getHaltContext();

            expect(ctx.halted).toBe(true);
            expect(ctx.reason).toBe('Latency spike detected');
            expect(ctx.haltedAt).not.toBeNull();
        });

        it('should clear halt context after resume', () => {
            haltBilling('Test');
            resumeBilling();
            const ctx = getHaltContext();

            expect(ctx.halted).toBe(false);
            expect(ctx.reason).toBe('');
            expect(ctx.haltedAt).toBeNull();
        });
    });

    // ─── Slack Payload Formatting ────────────────────────────────────────────

    describe('Slack remediation payload', () => {
        it('should format a valid Block Kit payload', () => {
            const frame = makeFrame({ isAnomalous: true, anomalyScore: 0.87, frameId: 150 });
            const result = evaluateFrame(frame, null);
            const payload = result.slackPayload!;

            expect(payload.username).toBe('Aegis Incident Commander');
            expect(payload.icon_emoji).toBe(':shield:');
            expect(payload.blocks[0].type).toBe('header');
            // Should contain EU AI Act reference
            const contextBlock = payload.blocks.find((b) => b.type === 'context');
            expect(contextBlock).toBeDefined();
        });

        it('should include remediation steps in the Slack message', () => {
            const frame = makeFrame({ isAnomalous: true, anomalyScore: 0.87, frameId: 150 });
            const result = evaluateFrame(frame, null);
            const payload = result.slackPayload!;

            const remediationBlock = payload.blocks.find(
                (b) => b.text?.text?.includes('Remediation Plan'),
            );
            expect(remediationBlock).toBeDefined();
            expect(remediationBlock!.text!.text).toContain('1.');
        });
    });

    // ─── Mock Data Integration ───────────────────────────────────────────────

    describe('Mock data anomaly injection', () => {
        it('generateKinematicFrame(150) should produce an anomalous frame', async () => {
            const { generateKinematicFrame } = await import('../../mock/data');
            const frame = generateKinematicFrame(150);

            expect(frame.isAnomalous).toBe(true);
            expect(frame.anomalyScore).toBe(0.87);
        });

        it('generateKinematicFrame(75) should inject a latency spike', async () => {
            const { generateKinematicFrame } = await import('../../mock/data');
            const frame74 = generateKinematicFrame(74);
            const frame75 = generateKinematicFrame(75);

            const ts74 = new Date(frame74.timestamp).getTime();
            const ts75 = new Date(frame75.timestamp).getTime();
            const diff = ts75 - ts74;

            // Frame 75 has an extra 500ms injected, so diff should be ~600ms
            // (100ms natural cadence + 500ms injection)
            expect(diff).toBeGreaterThan(LATENCY_THRESHOLD_MS);
        });

        it('Incident Commander should intercept the frame-150 anomaly', async () => {
            const { generateKinematicFrame } = await import('../../mock/data');
            const frame = generateKinematicFrame(150);
            const result = evaluateFrame(frame, null);

            expect(result.triggered).toBe(true);
            expect(isBillingHalted()).toBe(true);
            expect(result.incident!.source).toBe('kinematic-anomaly');
        });
    });

    // ─── Threshold Constants ─────────────────────────────────────────────────

    describe('Configuration', () => {
        it('should have a 200ms latency threshold', () => {
            expect(LATENCY_THRESHOLD_MS).toBe(200);
        });

        it('should have a 0.7 anomaly score threshold', () => {
            expect(ANOMALY_SCORE_THRESHOLD).toBe(0.7);
        });
    });
});
