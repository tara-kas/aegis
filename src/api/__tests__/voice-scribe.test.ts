/**
 * Unit Tests for Medical Voice Scribe
 *
 * Verifies the end-to-end pipeline:
 *   1. Mock ElevenLabs transcript is returned correctly
 *   2. Transcript parses into a valid FHIR R4 Observation
 *   3. Observation passes validateFhirResource()
 *   4. Paid.ai billing trace fires with $125.00 and correct workflowId
 *   5. Vital sign extraction works for known clinical patterns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    transcribeAudioMock,
    transcribeAudioLive,
    transcriptToFhirObservation,
    extractVitalsFromTranscript,
    processScribeObservation,
    SCRIBE_WORKFLOW_ID,
    SCRIBE_BILLED_AMOUNT,
    SCRIBE_COSTS,
} from '../voice-scribe';
import { validateFhirResource } from '../../utils/fhirValidation';
import { resetTraceStore, getTraceStore } from '../telemetry-billing';
import { _resetForTesting as resetIncidentCommander } from '../reliability-agents';

// ─── Setup ───────────────────────────────────────────────────────────────────

describe('Medical Voice Scribe', () => {
    beforeEach(() => {
        resetTraceStore();
        resetIncidentCommander();
    });

    // ─── Mock Transcript ────────────────────────────────────────────────────

    describe('transcribeAudioMock()', () => {
        it('should return a realistic surgical transcript', async () => {
            const result = await transcribeAudioMock();

            expect(result.transcript).toContain('heart rate');
            expect(result.transcript).toContain('110 bpm');
            expect(result.transcript).toContain('robotic incision');
            expect(result.confidence).toBeGreaterThan(0.9);
            expect(result.durationSec).toBeGreaterThan(0);
            expect(result.isLive).toBe(false);
        });
    });

    // ── transcribeAudioLive ─────────────────────────────────────────────────

    describe('transcribeAudioLive()', () => {
        it('should fall back to mock transcript when API key is not set', async () => {
            const blob = new Blob(['test-audio-data'], { type: 'audio/webm' });
            const result = await transcribeAudioLive(blob);

            expect(result.isLive).toBe(false);
            expect(result.transcript).toContain('heart rate');
            expect(result.transcript).toContain('110 bpm');
            expect(result.confidence).toBeGreaterThan(0.9);
        });

        it('should return a valid TranscribeResult shape', async () => {
            const blob = new Blob(['test-audio-data'], { type: 'audio/webm' });
            const result = await transcribeAudioLive(blob);

            expect(result).toHaveProperty('transcript');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('durationSec');
            expect(result).toHaveProperty('isLive');
            expect(typeof result.transcript).toBe('string');
            expect(typeof result.confidence).toBe('number');
            expect(typeof result.durationSec).toBe('number');
            expect(typeof result.isLive).toBe('boolean');
        });

        it('should gracefully handle any blob type without crashing', async () => {
            const emptyBlob = new Blob([], { type: 'audio/webm' });
            const result = await transcribeAudioLive(emptyBlob);

            // Without API key, falls back to mock — app should never crash
            expect(result.transcript.length).toBeGreaterThan(0);
        });
    });

    // ─── Vital Sign Extraction ──────────────────────────────────────────────

    describe('extractVitalsFromTranscript()', () => {
        it('should extract heart rate from transcript', () => {
            const vital = extractVitalsFromTranscript('Patient heart rate is elevated at 110 bpm.');

            expect(vital).not.toBeNull();
            expect(vital!.code).toBe('8867-4');
            expect(vital!.display).toBe('Heart rate');
            expect(vital!.value).toBe(110);
            expect(vital!.unit).toBe('beats/minute');
        });

        it('should extract SpO2 from transcript', () => {
            const vital = extractVitalsFromTranscript('SpO2 is at 98%.');

            expect(vital).not.toBeNull();
            expect(vital!.code).toBe('2708-6');
            expect(vital!.value).toBe(98);
            expect(vital!.unit).toBe('%');
        });

        it('should extract temperature from transcript', () => {
            const vital = extractVitalsFromTranscript('Temperature is 37.2 celsius.');

            expect(vital).not.toBeNull();
            expect(vital!.code).toBe('8310-5');
            expect(vital!.value).toBe(37.2);
            expect(vital!.unit).toBe('°C');
        });

        it('should extract respiratory rate from transcript', () => {
            const vital = extractVitalsFromTranscript('Respiratory rate is 16.');

            expect(vital).not.toBeNull();
            expect(vital!.code).toBe('9279-1');
            expect(vital!.value).toBe(16);
        });

        it('should return null for transcript with no recognisable vitals', () => {
            const vital = extractVitalsFromTranscript('Proceeding with standard closure.');

            expect(vital).toBeNull();
        });
    });

    // ─── FHIR Observation Formatting ────────────────────────────────────────

    describe('transcriptToFhirObservation()', () => {
        it('should create a valid FHIR Observation from a transcript with vitals', () => {
            const obs = transcriptToFhirObservation(
                'Patient heart rate is elevated at 110 bpm. Proceeding with robotic incision.',
            );

            expect(obs.resourceType).toBe('Observation');
            expect(obs.status).toBe('final');
            expect(obs.category.length).toBeGreaterThan(0);
            expect(obs.code.coding![0].system).toBe('http://loinc.org');
            expect(obs.code.coding![0].code).toBe('8867-4');
            expect(obs.subject.reference).toBe('Patient/patient-001');
            expect(obs.effectiveDateTime).toBeDefined();
            expect(obs.valueQuantity).toBeDefined();
            expect(obs.valueQuantity!.value).toBe(110);
            expect(obs.valueQuantity!.unit).toBe('beats/minute');
            expect(obs.note![0].text).toContain('heart rate');
        });

        it('should pass validateFhirResource()', () => {
            const obs = transcriptToFhirObservation(
                'Patient heart rate is elevated at 110 bpm. Proceeding with robotic incision.',
            );
            const validation = validateFhirResource(obs);

            expect(validation.valid).toBe(true);
            expect(validation.issues).toEqual([]);
        });

        it('should handle transcript with no extractable vitals (clinical note fallback)', () => {
            const obs = transcriptToFhirObservation('Proceeding with standard closure.');

            expect(obs.code.coding![0].code).toBe('34109-9');
            expect(obs.valueString).toBe('Proceeding with standard closure.');
            expect(obs.valueQuantity).toBeUndefined();

            // Still valid FHIR
            const validation = validateFhirResource(obs);
            expect(validation.valid).toBe(true);
        });

        it('should accept a custom patient reference', () => {
            const obs = transcriptToFhirObservation('Heart rate at 72 bpm.', 'Patient/patient-002');

            expect(obs.subject.reference).toBe('Patient/patient-002');
        });
    });

    // ─── End-to-End Pipeline with Billing ───────────────────────────────────

    describe('processScribeObservation() — full pipeline', () => {
        it('should transcribe, parse, validate, and bill at $125.00', async () => {
            const result = await processScribeObservation(null);

            // Transcript was captured
            expect(result.transcript).toContain('110 bpm');

            // FHIR Observation is valid
            const validation = validateFhirResource(result.observation);
            expect(validation.valid).toBe(true);

            // Billing trace fired correctly
            expect(result.billing.validationPassed).toBe(true);
            expect(result.billing.shouldSettle).toBe(true);
            expect(result.billing.trace.workflowId).toBe(SCRIBE_WORKFLOW_ID);
            expect(result.billing.trace.billedAmount).toBe(125.00);
            expect(result.billing.trace.costAmount).toBe(SCRIBE_COSTS.total);
        });

        it('should use autonomous_scribe_observation as the workflowId', async () => {
            const result = await processScribeObservation(null);

            expect(result.billing.trace.workflowId).toBe('autonomous_scribe_observation');
        });

        it('should record exactly $0.006 as the elevenLabsVoice cost', () => {
            expect(SCRIBE_COSTS.elevenLabsVoice).toBe(0.006);
        });

        it('should append the trace to the in-memory store for FinancialDashboard', async () => {
            expect(getTraceStore()).toHaveLength(0);

            await processScribeObservation(null);

            const store = getTraceStore();
            expect(store).toHaveLength(1);
            expect(store[0].workflowId).toBe('autonomous_scribe_observation');
            expect(store[0].billedAmount).toBe(125.00);
            expect(store[0].outcome).toBe('success');
        });

        it('should include voice-scribe metadata in the trace', async () => {
            const result = await processScribeObservation(null);

            expect(result.billing.trace.metadata.source).toBe('voice-scribe');
            expect(result.billing.trace.metadata.confidence).toBeDefined();
            expect(result.billing.trace.metadata.isLive).toBe('false');
        });

        it('should accept a real audio blob and use transcribeAudioLive path', async () => {
            const blob = new Blob(['mock-audio-bytes'], { type: 'audio/webm' });
            const result = await processScribeObservation(blob);

            // Without API key, transcribeAudioLive falls back to mock
            expect(result.transcript).toContain('110 bpm');
            expect(result.observation.resourceType).toBe('Observation');
            expect(result.billing.trace.billedAmount).toBe(125.00);
            expect(result.billing.trace.workflowId).toBe('autonomous_scribe_observation');

            const validation = validateFhirResource(result.observation);
            expect(validation.valid).toBe(true);
        });
    });

    // ─── Constants ─────────────────────────────────────────────────────────

    describe('Billing constants', () => {
        it('should have the correct workflowId', () => {
            expect(SCRIBE_WORKFLOW_ID).toBe('autonomous_scribe_observation');
        });

        it('should bill exactly $125.00', () => {
            expect(SCRIBE_BILLED_AMOUNT).toBe(125.00);
        });

        it('should have elevenLabsVoice cost of $0.006', () => {
            expect(SCRIBE_COSTS.elevenLabsVoice).toBe(0.006);
        });
    });
});
