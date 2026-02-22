import { useState, useEffect, useCallback, useRef } from 'react';
import type { VitalSign, AnomalyAlert, KinematicFrame, ConnectionStatus, JointAngle } from '../types/telemetry';
import type { PaidAiTrace, CostBreakdown } from '../types/financial';
import type { FhirObservation } from '../api/fhir';
import { mockVitalSigns, mockAnomalyAlerts, tickVitalSigns, maybeGenerateAlert, generateKinematicFrame } from '../mock/data';
import { traceObservationWorkflow, onTraceRecorded, getTraceStore } from '../api/telemetry-billing';
import { evaluateFrame, onSafetyAlert } from '../api/reliability-agents';
import { validateFhirResource } from '../utils/fhirValidation';
import { createFhirMeta, generateFhirId, formatFhirDateTime } from '../utils/fhirValidation';
import { isMockOnly, isLiveMode } from '../lib/data-mode';
import { crossReferenceAnomaly } from '../api/hai-def';
import { speakWarningAlert } from '../api/voice-scribe';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const liveFrameCounter = useRef(0);

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
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    setIsStreaming(false);
    setConnectionStatus('disconnected');
    log.info('Telemetry stream stopped', { deviceId });
  }, [deviceId]);

  const startStream = useCallback(() => {
    stopStream();
    setConnectionStatus('connecting');
    log.info('Starting telemetry stream', { deviceId, mode: isLiveMode() ? 'live' : 'mock' });

    if (isLiveMode()) {
      // ── LIVE MODE: Subscribe to Supabase Realtime Broadcast ────────────
      const channel = supabase.channel('telemetry_stream');

      channel
        .on('broadcast', { event: 'telemetry' }, ({ payload }) => {
          if (!payload) return;

          const data = payload as {
            timestamp: string;
            joint_angles: number[];
            joint_velocities: number[];
            end_effector_xyz: number[];
            applied_forces: number[];
            anomaly_detected: boolean;
            anomaly_reason: string | null;
          };

          const currentFrameId = liveFrameCounter.current++;

          // Map Webots payload → KinematicFrame
          const joints: JointAngle[] = (data.joint_angles ?? []).map((angle, i) => ({
            jointId: `joint-${i}`,
            name: ['shoulder_pan', 'shoulder_lift', 'elbow', 'wrist_1', 'wrist_2', 'wrist_3'][i] ?? `joint_${i}`,
            angleDeg: (angle * 180) / Math.PI,
            angleRad: angle,
            torqueNm: (data.applied_forces ?? [])[i] ?? 0,
            velocityRadPerSec: (data.joint_velocities ?? [])[i] ?? 0,
          }));

          const [x = 0, y = 0, z = 0] = data.end_effector_xyz ?? [];
          const anomalyScore = data.anomaly_detected ? 0.9 : Math.random() * 0.1;

          const frame: KinematicFrame = {
            timestamp: data.timestamp ?? new Date().toISOString(),
            frameId: currentFrameId,
            deviceId,
            joints,
            endEffector: {
              position: { x, y, z },
              orientation: { roll: 0, pitch: 0, yaw: 0 },
              forceN: 0,
              gripperApertureMm: 8,
            },
            isAnomalous: data.anomaly_detected ?? false,
            anomalyScore,
          };

          setLatestFrame(frame);

          // Incident Commander evaluation on live frames
          const cmdResult = evaluateFrame(frame, prevFrameTimestamp.current);
          prevFrameTimestamp.current = frame.timestamp;

          if (cmdResult.triggered) {
            metrics.increment('incident_commander.triggered', { deviceId, reason: cmdResult.reason });
            log.warn('Incident Commander triggered (live)', {
              frameId: frame.frameId,
              reason: cmdResult.reason,
            });
          }

          if (data.anomaly_detected) {
            metrics.increment('kinematic.anomaly_detected', { deviceId });
            const alert: AnomalyAlert = {
              id: `live-anomaly-${currentFrameId}-${Date.now()}`,
              severity: 'critical',
              title: 'Robotic Anomaly Detected (Live)',
              message: data.anomaly_reason ?? 'Kinematic anomaly detected in live telemetry',
              metric: 'anomaly_score',
              currentValue: anomalyScore,
              threshold: 0.5,
              timestamp: data.timestamp ?? new Date().toISOString(),
              acknowledged: false,
              source: 'telemetry',
            };
            setAlerts((prev) => [alert, ...prev].slice(0, maxAlerts));

            // Fire-and-forget TTS warning — must never block telemetry
            speakWarningAlert(
              'Critical Anomaly Detected. Pausing robotic procedures and cross-referencing global data.',
            ).catch(() => { /* swallow — TTS must not crash vitals */ });

            // Fire-and-forget HAI-DEF cross-reference
            crossReferenceAnomaly(alert)
              .then((insights) => {
                setAlerts((prev) =>
                  prev.map((a) =>
                    a.id === alert.id ? { ...a, haiDefInsights: insights } : a,
                  ),
                );
                log.info('HAI-DEF cross-reference complete (live)', {
                  alertId: alert.id,
                  confidence: insights.globalConfidenceScore,
                  source: insights.source,
                });
              })
              .catch((err) => {
                log.warn('HAI-DEF cross-reference failed (live)', {
                  alertId: alert.id,
                  error: err instanceof Error ? err.message : String(err),
                });
              });
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            setIsStreaming(true);
            metrics.increment('telemetry.stream_started', { deviceId, mode: 'live' });
            log.info('Supabase Realtime Broadcast connected', { deviceId });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('error');
            log.error('Supabase Realtime subscription failed', { deviceId, status });
          }
        });

      realtimeChannelRef.current = channel;

      // In live mode, still run vital sign simulation from mock data
      // (vitals come from mock; kinematics come from live Webots)
      vitalTimerRef.current = setInterval(() => {
        setVitals((prev) => {
          const updated = tickVitalSigns(prev);
          const alert = maybeGenerateAlert(updated);
          if (alert) {
            setAlerts((a) => [alert, ...a].slice(0, maxAlerts));
            metrics.increment('alerts.generated', { deviceId, severity: alert.severity });

            // Fire-and-forget HAI-DEF cross-reference
            crossReferenceAnomaly(alert)
              .then((insights) => {
                setAlerts((a2) =>
                  a2.map((item) =>
                    item.id === alert.id ? { ...item, haiDefInsights: insights } : item,
                  ),
                );
              })
              .catch(() => { /* swallow — HAI-DEF must not crash vitals */ });
          }

          // ── Auto-bill for each vital-sign observation tick (live mode) ─
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

      return;
    }

    // ── MOCK MODE: Existing setInterval-based simulation ─────────────────
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

            // Fire-and-forget HAI-DEF cross-reference
            crossReferenceAnomaly(alert)
              .then((insights) => {
                setAlerts((a2) =>
                  a2.map((item) =>
                    item.id === alert.id ? { ...item, haiDefInsights: insights } : item,
                  ),
                );
              })
              .catch(() => { /* swallow — HAI-DEF must not crash vitals */ });
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
            // In mock mode, skip billing entirely to keep the trace store clean
            if (!isMockOnly()) {
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

          // Fire-and-forget TTS warning — must never block telemetry
          speakWarningAlert(
            'Critical Anomaly Detected. Pausing robotic procedures and cross-referencing global data.',
          ).catch(() => { /* swallow — TTS must not crash vitals */ });
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
