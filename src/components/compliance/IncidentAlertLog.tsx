import type { Incident } from '../../types/compliance';
import { AlertTriangle, ArrowUpCircle, CheckCircle, Search, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IncidentAlertLogProps {
  incidents: Incident[];
  onEscalate: (id: string) => void;
}

const SEVERITY_COLORS: Record<Incident['severity'], string> = {
  critical: 'bg-destructive text-destructive-foreground',
  major: 'bg-orange-500 text-white',
  minor: 'bg-alert-amber text-alert-amber-foreground',
  informational: 'bg-clinical-blue text-clinical-blue-foreground',
};

const STATUS_ICONS: Record<Incident['status'], typeof AlertTriangle> = {
  open: AlertTriangle,
  investigating: Search,
  mitigating: Radio,
  resolved: CheckCircle,
  closed: CheckCircle,
};

function timeSince(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export function IncidentAlertLog({ incidents, onEscalate }: IncidentAlertLogProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 p-3">
        <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
        <h3 className="text-sm font-medium text-foreground/80">incident.io Alert Log</h3>
        <span className="ml-auto text-xs text-muted-foreground">{incidents.length} incidents</span>
      </div>

      <div className="max-h-[500px] divide-y divide-border overflow-y-auto">
        {incidents.map((inc) => {
          const StatusIcon = STATUS_ICONS[inc.status] ?? AlertTriangle;
          const isActive = inc.status === 'open' || inc.status === 'investigating' || inc.status === 'mitigating';

          return (
            <div key={inc.id} className={`p-4 ${isActive ? 'bg-muted/30' : ''}`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${SEVERITY_COLORS[inc.severity]}`}>
                    {inc.severity.toUpperCase()}
                  </span>
                  <StatusIcon className={`w-4 h-4 ${isActive ? 'text-alert-amber' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium text-foreground">{inc.title}</span>
                </div>
                {isActive && (
                  <Button
                    onClick={() => onEscalate(inc.id)}
                    variant="destructive"
                    size="sm"
                    className="flex-shrink-0 gap-1 text-xs"
                  >
                    <ArrowUpCircle className="w-3 h-3" />
                    Escalate
                  </Button>
                )}
              </div>

              <p className="mb-2 text-xs text-muted-foreground">{inc.description}</p>

              <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>Detected: {timeSince(inc.detectedAt)}</span>
                {inc.resolvedAt && <span>Resolved: {timeSince(inc.resolvedAt)}</span>}
                {inc.assignee && <span>Assignee: {inc.assignee}</span>}
                <span className="capitalize">{inc.source.replace('-', ' ')}</span>
              </div>

              {inc.remediationSteps.length > 0 && (
                <div className="mt-2 rounded bg-muted p-2">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Remediation Steps</span>
                  <ol className="list-inside list-decimal space-y-0.5">
                    {inc.remediationSteps.map((step, i) => (
                      <li key={i} className="text-xs text-foreground/80">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {inc.impactAssessment && (
                <p className="mt-2 text-xs text-vital-green/70">Impact: {inc.impactAssessment}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
