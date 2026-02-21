/** Real-time telemetry types from Webots robotic simulation */

export interface JointAngle {
  jointId: string;
  name: string;
  angleDeg: number;
  angleRad: number;
  torqueNm: number;
  velocityRadPerSec: number;
}

export interface SpatialCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface EndEffectorState {
  position: SpatialCoordinate;
  orientation: { roll: number; pitch: number; yaw: number };
  forceN: number;
  gripperApertureMm: number;
}

export interface KinematicFrame {
  timestamp: string;
  frameId: number;
  deviceId: string;
  joints: JointAngle[];
  endEffector: EndEffectorState;
  isAnomalous: boolean;
  anomalyScore: number;
}

export interface VitalSign {
  code: string;
  display: string;
  value: number;
  unit: string;
  normalRange: { low: number; high: number };
  trend: TrendDirection;
  timestamp: string;
}

export type TrendDirection = 'rising' | 'falling' | 'stable';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface Thresholds {
  criticalLow: number;
  warningLow: number;
  warningHigh: number;
  criticalHigh: number;
}

export interface AnomalyAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
  acknowledged: boolean;
  source: 'telemetry' | 'vitals' | 'inference' | 'system';
}

export interface TelemetryStreamConfig {
  url: string;
  deviceId: string;
  reconnectIntervalMs: number;
  maxReconnectAttempts: number;
  heartbeatIntervalMs: number;
}

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  correlationId?: string;
}
