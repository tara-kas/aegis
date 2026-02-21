import type { KinematicFrame, ConnectionStatus } from '../../types/telemetry';
import { Radio, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getRoboticDevice } from '@/lib/device-registry';

interface TelemetryPanelProps {
  deviceId: string;
  latestFrame: KinematicFrame | null;
  connectionStatus: ConnectionStatus;
}

const STATUS_CONFIG: Record<ConnectionStatus, { icon: typeof Wifi; label: string; color: string }> = {
  connected: { icon: Wifi, label: 'Live', color: 'text-vital-green' },
  connecting: { icon: Radio, label: 'Connecting...', color: 'text-alert-amber' },
  disconnected: { icon: WifiOff, label: 'Offline', color: 'text-muted-foreground' },
  error: { icon: AlertTriangle, label: 'Error', color: 'text-destructive' },
};

export function TelemetryPanel({ deviceId, latestFrame, connectionStatus }: TelemetryPanelProps) {
  const statusCfg = STATUS_CONFIG[connectionStatus];
  const StatusIcon = statusCfg.icon;
  const robot = getRoboticDevice();

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-default">
              <Radio className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground/80">Robotic Telemetry</h3>
              <span className="text-xs font-mono text-muted-foreground">{deviceId}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-semibold">{robot.manufacturer}</p>
              <p className="text-muted-foreground">{robot.model}</p>
              <p className="text-muted-foreground">{robot.type}</p>
              <p className="font-mono text-[10px] text-muted-foreground/70">
                ID {robot.id} · CE Class {robot.ceMarkClass}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
        <div className={`flex items-center gap-1.5 text-xs ${statusCfg.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{statusCfg.label}</span>
          {connectionStatus === 'connected' && (
            <span className="h-2 w-2 rounded-full bg-vital-green animate-pulse" />
          )}
        </div>
      </div>

      {latestFrame ? (
        <div className="p-4">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded bg-muted p-2">
              <span className="text-xs text-muted-foreground">Frame</span>
              <p className="text-lg font-mono text-foreground">#{latestFrame.frameId}</p>
            </div>
            <div className="rounded bg-muted p-2">
              <span className="text-xs text-muted-foreground">Anomaly Score</span>
              <p className={`text-lg font-mono ${latestFrame.anomalyScore > 0.7 ? 'text-destructive' : latestFrame.anomalyScore > 0.3 ? 'text-alert-amber' : 'text-vital-green'}`}>
                {latestFrame.anomalyScore.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">End Effector Position</h4>
            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis} className="rounded bg-muted p-2 text-center">
                  <span className="text-xs uppercase text-muted-foreground">{axis}</span>
                  <p className="text-sm font-mono text-foreground">{latestFrame.endEffector.position[axis].toFixed(1)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">Joint Angles (6-axis)</h4>
            <div className="space-y-1.5">
              {latestFrame.joints.map((joint) => (
                <div key={joint.jointId} className="flex items-center gap-2">
                  <span className="w-28 truncate text-xs text-muted-foreground">{joint.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-100"
                      style={{ width: `${Math.min(100, Math.abs(joint.angleDeg) / 1.8)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs font-mono text-foreground/80">{joint.angleDeg.toFixed(1)}°</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground/60">
            <span>Force: {latestFrame.endEffector.forceN.toFixed(2)} N</span>
            <span>Gripper: {latestFrame.endEffector.gripperApertureMm.toFixed(1)} mm</span>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          <Radio className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm">Waiting for telemetry data...</p>
        </div>
      )}
    </div>
  );
}
