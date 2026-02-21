import type { KinematicFrame, ConnectionStatus } from '../../types/telemetry';
import { Radio, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface TelemetryPanelProps {
  deviceId: string;
  latestFrame: KinematicFrame | null;
  connectionStatus: ConnectionStatus;
}

const STATUS_CONFIG: Record<ConnectionStatus, { icon: typeof Wifi; label: string; color: string }> = {
  connected: { icon: Wifi, label: 'Live', color: 'text-green-400' },
  connecting: { icon: Radio, label: 'Connecting...', color: 'text-yellow-400' },
  disconnected: { icon: WifiOff, label: 'Offline', color: 'text-gray-500' },
  error: { icon: AlertTriangle, label: 'Error', color: 'text-red-400' },
};

export function TelemetryPanel({ deviceId, latestFrame, connectionStatus }: TelemetryPanelProps) {
  const statusCfg = STATUS_CONFIG[connectionStatus];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-aegis-400" />
          <h3 className="text-sm font-medium text-gray-300">Robotic Telemetry</h3>
          <span className="text-xs text-gray-500 font-mono">{deviceId}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${statusCfg.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{statusCfg.label}</span>
          {connectionStatus === 'connected' && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
        </div>
      </div>

      {latestFrame ? (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-800 rounded p-2">
              <span className="text-xs text-gray-500">Frame</span>
              <p className="text-lg font-mono text-white">#{latestFrame.frameId}</p>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <span className="text-xs text-gray-500">Anomaly Score</span>
              <p className={`text-lg font-mono ${latestFrame.anomalyScore > 0.7 ? 'text-red-400' : latestFrame.anomalyScore > 0.3 ? 'text-yellow-400' : 'text-green-400'}`}>
                {latestFrame.anomalyScore.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-400 mb-2">End Effector Position</h4>
            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis} className="bg-gray-800 rounded p-2 text-center">
                  <span className="text-xs text-gray-500 uppercase">{axis}</span>
                  <p className="text-sm font-mono text-white">{latestFrame.endEffector.position[axis].toFixed(1)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Joint Angles (6-axis)</h4>
            <div className="space-y-1.5">
              {latestFrame.joints.map((joint) => (
                <div key={joint.jointId} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-28 truncate">{joint.name}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-aegis-500 rounded-full transition-all duration-100"
                      style={{ width: `${Math.min(100, Math.abs(joint.angleDeg) / 1.8)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-300 w-16 text-right">{joint.angleDeg.toFixed(1)}°</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
            <span>Force: {latestFrame.endEffector.forceN.toFixed(2)} N</span>
            <span>Gripper: {latestFrame.endEffector.gripperApertureMm.toFixed(1)} mm</span>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-600">
          <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Waiting for telemetry data...</p>
        </div>
      )}
    </div>
  );
}
