import type { AnomalyAlert } from '../../types/telemetry';
import { AlertTriangle, AlertCircle, Info, X, CheckCircle } from 'lucide-react';

interface AnomalyAlertBannerProps {
  alerts: AnomalyAlert[];
  onDismiss: (id: string) => void;
  onAcknowledge: (id: string) => void;
}

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, bg: 'bg-destructive/10 border-destructive/40', text: 'text-destructive', badge: 'bg-destructive' },
  warning: { icon: AlertCircle, bg: 'bg-alert-amber/10 border-alert-amber/40', text: 'text-alert-amber', badge: 'bg-alert-amber' },
  info: { icon: Info, bg: 'bg-clinical-blue/10 border-clinical-blue/40', text: 'text-clinical-blue', badge: 'bg-clinical-blue' },
};

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function AnomalyAlertBanner({ alerts, onDismiss, onAcknowledge }: AnomalyAlertBannerProps) {
  const active = alerts.filter((a) => !a.acknowledged);

  if (active.length === 0) return null;

  return (
    <div className="space-y-2">
      {active.slice(0, 5).map((alert) => {
        const config = SEVERITY_CONFIG[alert.severity];
        const Icon = config.icon;

        return (
          <div
            key={alert.id}
            className={`${config.bg} border rounded-lg p-3 flex items-start gap-3`}
          >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.text}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${config.badge} text-white`}>
                  {alert.severity}
                </span>
                <span className={`font-medium text-sm ${config.text}`}>{alert.title}</span>
                <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{formatTimestamp(alert.timestamp)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.message}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="p-1 rounded hover:bg-foreground/10 transition-colors"
                title="Acknowledge"
              >
                <CheckCircle className="w-4 h-4 text-muted-foreground hover:text-vital-green" />
              </button>
              <button
                onClick={() => onDismiss(alert.id)}
                className="p-1 rounded hover:bg-foreground/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>
        );
      })}
      {active.length > 5 && (
        <p className="text-xs text-muted-foreground text-center">+ {active.length - 5} more alerts</p>
      )}
    </div>
  );
}
