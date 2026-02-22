import { useState, useEffect, useCallback, useRef } from 'react';
import type { VitalSign, AnomalyAlert, KinematicFrame, ConnectionStatus } from '../types/telemetry';
import type { PaidAiTrace, CostBreakdown } from '../types/financial';
import type { FhirObservation } from '../api/fhir';
import { mockVitalSigns, mockAnomalyAlerts, tickVitalSigns, maybeGenerateAlert, generateKinematicFrame } from '../mock/data';
import { traceObservationWorkflow, onTraceRecorded, getTraceStore } from '../api/telemetry-billing';
import { evaluateFrame, onSafetyAlert } from '../api/reliability-agents';
import { validateFhirResource } from '../utils/fhirValidation';
import { createFhirMeta, generateFhirId, formatFhirDateTime } from '../utils/fhirValidation';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

interface UseTelemetryOptions {
  deviceId: string;
  vitalIntervalMs?: number;
  kinematicIntervalMs?: number;
  maxAlerts?: number;
}

interface UseTelemetryReturn {
  vitals: VitalSign[];
  alerts: AnomalyAlert[];
  latestFrame: KinematicFrame | null;
  connectionStatus: ConnectionStatus;
  acknowledgeAlert: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
  isStreaming: boolean;
  startStream: () => void;
  stopStream: () => void;
  /** Live billing traces from Paid.ai (updates in real time) */
  billingTraces: PaidAiTrace[];
  /** Manually trigger a billing trace for a FHIR Observation */
  recordObservationBilling: (observation: FhirObservation, workflowId: string, billedAmount: number, costs: CostBreakdown) => Promise<void>;
}

const log = logger.withContext('Telemetry');

// ─── Default cost structure for auto-generated vital-sign observations ───────

const DEFAULT_VITAL_COSTS: CostBreakdown = {
  crusoeInference: 0.012,
  elevenLabsVoice: 0,
  googleHaiDef: 0.005,
  supabaseStorage: 0.001,
  solanaFees: 0.00001,
  total: 0.01801,
};

const DEFAULT_VITAL_BILLED = 0.05; // €0.05 per vital-sign observation

export function useTelemetry(options: UseTelemetryOptions): UseTelemetryReturn {
  const { deviceId, vitalIntervalMs = 2000, kinematicIntervalMs = 100, maxAlerts = 50 } = options;

  const [vitals, setVitals] = useState<VitalSign[]>(mockVitalSigns);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>(mockAnomalyAlerts);
  const [latestFrame, setLatestFrame] = useState<KinematicFrame | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isStreaming, setIsStreaming] = useState(false);
  const [billingTraces, setBillingTraces] = useState<PaidAiTrace[]>(() => getTraceStore());

  const frameCounter = useRef(0);
  const vitalTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const kinematicTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const prevFrameTimestamp = useRef<string | null>(null);

  // ── Subscribe to billing trace events ────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onTraceRecorded((trace) => {
      setBillingTraces((prev) => [...prev, trace]);
    });
    return unsubscribe;
  }, []);

  // ── Subscribe to Incident Commander safety alerts ────────────────────────
  useEffect(() => {
    const unsubscribe = onSafetyAlert((alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, maxAlerts));
    });
    return unsubscribe;
  }, [maxAlerts]);

  // ── Manual billing trigger ───────────────────────────────────────────────
  const recordObservationBilling = useCallback(async (
    observation: FhirObservation,
    workflowId: string,
    billedAmount: number,
    costs: CostBreakdown,
  ) => {
    const result = await traceObservationWorkflow({
      workflowId,
      observation,
      billedAmount,
      costs,
      metadata: { deviceId, source: 'manual' },
    });

    if (result.shouldSettle) {
      log.info('Billing settlement required', {
        traceId: result.trace.traceId,
        billedAmount: result.trace.billedAmount,
      });
      metrics.increment('billing.settlement_triggered', { deviceId, workflowId });
    } else {
      log.warn('Billing trace failed validation — no settlement', {
        traceId: result.trace.traceId,
        issues: result.validationIssues,
      });
      metrics.increment('billing.validation_failed', { deviceId, workflowId });
    }
  }, [deviceId]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)));
    log.info('Alert acknowledged', { alertId });
    metrics.increment('alerts.acknowledged', { deviceId });
  }, [deviceId]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    log.info('Alert dismissed', { alertId });
  }, []);

  const stopStream = useCallback(() => {
    if (vitalTimerRef.current) clearInterval(vitalTimerRef.current);
    if (kinematicTimerRef.current) clearInterval(kinematicTimerRef.current);
    setIsStreaming(false);
    setConnectionStatus('disconnected');
    log.info('Telemetry stream stopped', { deviceId });
  }, [deviceId]);

  const startStream = useCallback(() => {
    stopStream();
    setConnectionStatus('connecting');
    log.info('Starting telemetry stream', { deviceId });

    setTimeout(() => {
      setConnectionStatus('connected');
      setIsStreaming(true);
      metrics.increment('telemetry.stream_started', { deviceId });

      vitalTimerRef.current = setInterval(() => {
        setVitals((prev) => {
          const updated = tickVitalSigns(prev);
          const alert = maybeGenerateAlert(updated);
          if (alert) {
            setAlerts((a) => [alert, ...a].slice(0, maxAlerts));
            metrics.increment('alerts.generated', { deviceId, severity: alert.severity });
          }

          // ── Auto-bill for each vital-sign observation tick ────────────
          // Build a minimal FHIR Observation from the first vital sign
          // and run it through the billing pipeline.
          const primary = updated[0];
          if (primary) {
            const obs: FhirObservation = {
              resourceType: 'Observation',
              id: generateFhirId(),
              meta: createFhirMeta(),
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
                  code: primary.code,
                  display: primary.display,
                }],
                text: primary.display,
              },
              subject: { reference: 'Patient/patient-001' },
              effectiveDateTime: formatFhirDateTime(),
              valueQuantity: {
                value: primary.value,
                unit: primary.unit,
                system: 'http://unitsofmeasure.org',
                code: primary.unit,
              },
            };

            // Fire-and-forget — billing must never block vital-sign rendering
            traceObservationWorkflow({
              workflowId: 'continuous_vitals_monitoring',
              observation: obs,
              billedAmount: DEFAULT_VITAL_BILLED,
              costs: DEFAULT_VITAL_COSTS,
              metadata: { deviceId, vitalCode: primary.code },
            }).catch(() => {
              // swallow — billing failures must not crash telemetry
            });
          }

          return updated;
        });
      }, vitalIntervalMs);

      kinematicTimerRef.current = setInterval(() => {
        const frame = generateKinematicFrame(frameCounter.current++);
        setLatestFrame(frame);

        // ── Incident Commander evaluation ──────────────────────────────
        const cmdResult = evaluateFrame(frame, prevFrameTimestamp.current);
        prevFrameTimestamp.current = frame.timestamp;

        if (cmdResult.triggered) {
          metrics.increment('incident_commander.triggered', { deviceId, reason: cmdResult.reason });
          log.warn('Incident Commander triggered', {
            frameId: frame.frameId,
            reason: cmdResult.reason,
          });
        }

        if (frame.isAnomalous) {
          metrics.increment('kinematic.anomaly_detected', { deviceId });
        }
      }, kinematicIntervalMs);
    }, 500);
  }, [deviceId, vitalIntervalMs, kinematicIntervalMs, maxAlerts, stopStream]);

  useEffect(() => {
    startStream();
    return stopStream;
  }, [startStream, stopStream]);

  return {
    vitals,
    alerts,
    latestFrame,
    connectionStatus,
    acknowledgeAlert,
    dismissAlert,
    isStreaming,
    startStream,
    stopStream,
    billingTraces,
    recordObservationBilling,
  };
}
