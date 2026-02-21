import { useState, useEffect, useCallback, useRef } from 'react';
import type { VitalSign, AnomalyAlert, KinematicFrame, ConnectionStatus } from '../types/telemetry';
import { mockVitalSigns, mockAnomalyAlerts, tickVitalSigns, maybeGenerateAlert, generateKinematicFrame } from '../mock/data';
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
}

const log = logger.withContext('Telemetry');

export function useTelemetry(options: UseTelemetryOptions): UseTelemetryReturn {
  const { deviceId, vitalIntervalMs = 2000, kinematicIntervalMs = 100, maxAlerts = 50 } = options;

  const [vitals, setVitals] = useState<VitalSign[]>(mockVitalSigns);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>(mockAnomalyAlerts);
  const [latestFrame, setLatestFrame] = useState<KinematicFrame | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isStreaming, setIsStreaming] = useState(false);

  const frameCounter = useRef(0);
  const vitalTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const kinematicTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

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
          return updated;
        });
      }, vitalIntervalMs);

      kinematicTimerRef.current = setInterval(() => {
        const frame = generateKinematicFrame(frameCounter.current++);
        setLatestFrame(frame);
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

  return { vitals, alerts, latestFrame, connectionStatus, acknowledgeAlert, dismissAlert, isStreaming, startStream, stopStream };
}
