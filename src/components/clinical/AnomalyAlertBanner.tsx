import type { AnomalyAlert } from '../../types/telemetry';
import { AlertTriangle, AlertCircle, Info, X, CheckCircle } from 'lucide-react';

interface AnomalyAlertBannerProps {
  alerts: AnomalyAlert[];
  onDismiss: (id: string) => void;
  onAcknowledge: (id: string) => void;
}

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, bg: 'bg-red-950 border-red-700', text: 'text-red-400', badge: 'bg-red-700' },
  warning: { icon: AlertCircle, bg: 'bg-amber-950 border-amber-700', text: 'text-amber-400', badge: 'bg-amber-700' },
  info: { icon: Info, bg: 'bg-blue-950 border-blue-700', text: 'text-blue-400', badge: 'bg-blue-700' },
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
            className={`${config.bg} border rounded-lg p-3 flex items-start gap-3 animate-pulse-once`}
          >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.text}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${config.badge} text-white`}>
                  {alert.severity}
                </span>
                <span className={`font-medium text-sm ${config.text}`}>{alert.title}</span>
                <span className="text-xs text-gray-500 ml-auto flex-shrink-0">{formatTimestamp(alert.timestamp)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{alert.message}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Acknowledge"
              >
                <CheckCircle className="w-4 h-4 text-gray-400 hover:text-green-400" />
              </button>
              <button
                onClick={() => onDismiss(alert.id)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
          </div>
        );
      })}
      {active.length > 5 && (
        <p className="text-xs text-gray-500 text-center">+ {active.length - 5} more alerts</p>
      )}
    </div>
  );
}
