import { useState, useEffect, useCallback, useRef } from 'react';
import type { VitalSign, AnomalyAlert, KinematicFrame, ConnectionStatus, JointAngle } from '../types/telemetry';
import type { PaidAiTrace, CostBreakdown } from '../types/financial';
import type { FhirObservation } from '../api/fhir';
import { mockVitalSigns, mockAnomalyAlerts, tickVitalSigns, maybeGenerateAlert, generateKinematicFrame, getPatientVitalSigns } from '../mock/data';
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
  patientId?: string;
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
  const { deviceId, patientId = 'patient-001', vitalIntervalMs = 2000, kinematicIntervalMs = 100, maxAlerts = 50 } = options;

  const [vitals, setVitals] = useState<VitalSign[]>(() => getPatientVitalSigns(patientId));
  const [alerts, setAlerts] = useState<AnomalyAlert[]>(mockAnomalyAlerts);
  const [latestFrame, setLatestFrame] = useState<KinematicFrame | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isStreaming, setIsStreaming] = useState(false);
  const [billingTraces, setBillingTraces] = useState<PaidAiTrace[]>(() => getTraceStore());

  const frameCounter = useRef(0);
  const vitalTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const kinematicTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // ── Anomaly cooldown & deduplication ────────────────────────────────────
  const ANOMALY_COOLDOWN_MS = 30_000; // 30 s — global cooldown across ALL alert types
  const lastLiveAnomalyTs = useRef(0); // timestamp of last live anomaly alert
  const lastAnyAlertTs = useRef(0);    // global: timestamp of last alert of ANY kind
  const alertTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const ALERT_AUTO_CLEAR_MS = 8_000; // alerts auto-dismiss after 8 s
  const GLOBAL_ALERT_COOLDOWN_MS = 30_000; // block ALL new alerts for 30 s after any alert

  /**
   * Add an alert only if the global cooldown has expired and no duplicate exists.
   * If a similar alert already exists (same source, or same severity+unacknowledged),
   * fuse the new info into the existing alert instead of stacking.
   * Auto-clear after 8 s.
   */
  const addAlertWithDedup = useCallback((newAlert: AnomalyAlert) => {
    const now = Date.now();

    // ── Global cooldown: block ALL new alerts for 30 s after the last one ──
    if (now - lastAnyAlertTs.current < GLOBAL_ALERT_COOLDOWN_MS) {
      // Fuse into an existing unacknowledged alert from the same source if one exists
      setAlerts((prev) => {
        const idx = prev.findIndex((a) => !a.acknowledged && a.source === newAlert.source);
        if (idx === -1) return prev; // nothing to fuse into — just drop
        const fused = { ...prev[idx] };
        // Update the message with the latest info without creating a new entry
        if (fused.message !== newAlert.message) {
          fused.message = newAlert.message;
          fused.currentValue = newAlert.currentValue;
          fused.timestamp = newAlert.timestamp;
        }
        const next = [...prev];
        next[idx] = fused;
        return next;
      });
      return;
    }

    // ── Strict dedup: skip if an unacknowledged alert with same source OR title exists
    setAlerts((prev) => {
      const isDuplicate = prev.some(
        (a) =>
          !a.acknowledged &&
          (a.source === newAlert.source || a.title === newAlert.title),
      );
      if (isDuplicate) return prev;
      return [newAlert, ...prev].slice(0, maxAlerts);
    });

    lastAnyAlertTs.current = now;

    // Auto-remove after 8 s so the screen naturally clears
    const timer = setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
      alertTimersRef.current.delete(newAlert.id);
    }, ALERT_AUTO_CLEAR_MS);
    alertTimersRef.current.set(newAlert.id, timer);
  }, [maxAlerts]);

  // ── Reset vital signs when patient changes ───────────────────────────────
  useEffect(() => {
    setVitals(getPatientVitalSigns(patientId));
  }, [patientId]);
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
      addAlertWithDedup(alert);
    });
    return unsubscribe;
  }, [addAlertWithDedup]);

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
    // Clear all pending alert auto-dismiss timers
    alertTimersRef.current.forEach((t) => clearTimeout(t));
    alertTimersRef.current.clear();
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
      const channel = supabase
        .channel('fhir_observations_telemetry')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'fhir_observations',
            filter: "source=eq.robot_telemetry",
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              value_string: string;
              validated: boolean;
              recorded_at: string;
            };

            let data: {
              timestamp: string;
              joint_angles: number[];
              joint_velocities: number[];
              end_effector_xyz: number[];
              applied_forces: number[];
              anomaly_detected: boolean;
              anomaly_reason: string | null;
            };

            try {
              data = typeof row.value_string === 'string'
                ? JSON.parse(row.value_string)
                : row.value_string;
            } catch {
              log.error('Failed to parse telemetry value_string', { id: row.id });
              return;
            }

            const currentFrameId = liveFrameCounter.current++;

            const joints: JointAngle[] = (data.joint_angles ?? []).map((angle, i) => ({
              jointId: `joint-${i}`,
              name: ['shoulder_pan', 'shoulder_lift', 'elbow', 'wrist_1', 'wrist_2', 'wrist_3'][i] ?? `joint_${i}`,
              angleDeg: (angle * 180) / Math.PI,
              angleRad: angle,
              torqueNm: (data.applied_forces ?? [])[i] ?? 0,
              velocityRadPerSec: (data.joint_velocities ?? [])[i] ?? 0,
            }));

            const [x = 0, y = 0, z = 0] = data.end_effector_xyz ?? [];

            // Progressive anomaly score derived from actual telemetry signals
            // instead of a binary 0.9 / random(0–0.1) split.
            const velocities = data.joint_velocities ?? [];
            const maxVel = Math.max(...velocities.map(Math.abs), 0);
            const velContrib = Math.min(maxVel / 3.0, 0.5);  // 0–0.5 from velocity magnitude
            const forces = data.applied_forces ?? [];
            const maxForce = Math.max(...forces.map(Math.abs), 0);
            const forceContrib = Math.min(maxForce / 10.0, 0.3);  // 0–0.3 from force magnitude
            const baseAnomalyScore = velContrib + forceContrib + Math.random() * 0.05;
            const anomalyScore = data.anomaly_detected
              ? Math.min(Math.max(baseAnomalyScore + 0.35, 0.72), 0.98)  // boost into 0.72–0.98 when flagged
              : Math.min(baseAnomalyScore, 0.65);  // cap below threshold when normal

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
              // ── Cooldown: skip if a live anomaly alert was raised < 12 s ago
              const now = Date.now();
              if (now - lastLiveAnomalyTs.current < ANOMALY_COOLDOWN_MS) {
                metrics.increment('kinematic.anomaly_suppressed', { deviceId });
              } else {
                lastLiveAnomalyTs.current = now;
                metrics.increment('kinematic.anomaly_detected', { deviceId });
                addAlertWithDedup({
                  id: `alert-live-${currentFrameId}`,
                  severity: 'critical',
                  title: 'Kinematic Anomaly Detected',
                  message: data.anomaly_reason ?? 'Robotic arm deviation detected',
                  metric: 'joint-deviation',
                  currentValue: anomalyScore,
                  threshold: 0.7,
                  timestamp: data.timestamp ?? new Date().toISOString(),
                  acknowledged: false,
                  source: 'telemetry',
                  patientId,
                });
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            setIsStreaming(true);
            metrics.increment('telemetry.stream_started', { deviceId });
            log.info('Supabase Postgres Realtime connected', { deviceId });
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
          const alert = maybeGenerateAlert(updated, patientId);
          if (alert) {
            addAlertWithDedup(alert);
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
          const alert = maybeGenerateAlert(updated, patientId);
          if (alert) {
            addAlertWithDedup(alert);
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
  }, [deviceId, vitalIntervalMs, kinematicIntervalMs, maxAlerts, stopStream, addAlertWithDedup]);

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
