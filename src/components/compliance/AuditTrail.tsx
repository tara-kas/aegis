import type { AuditEntry } from '../../types/compliance';
import { ScrollText, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

interface AuditTrailProps {
  entries: AuditEntry[];
}

const ACTION_COLORS: Record<AuditEntry['action'], string> = {
  read: 'text-clinical-blue',
  create: 'text-vital-green',
  update: 'text-alert-amber',
  delete: 'text-destructive',
  access: 'text-purple-500 dark:text-purple-400',
  export: 'text-orange-500 dark:text-orange-400',
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function AuditTrail({ entries }: AuditTrailProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 p-3">
        <ScrollText className="w-4 h-4 text-purple-500 dark:text-purple-400" />
        <h3 className="text-sm font-medium text-foreground/80">PHI Access Audit Trail</h3>
        <span className="ml-auto text-xs text-muted-foreground">{entries.length} entries</span>
      </div>

      <div className="max-h-80 divide-y divide-border overflow-y-auto">
        {entries.map((entry) => (
          <div key={entry.id} className={`p-3 ${entry.outcome === 'denied' ? 'bg-destructive/5' : ''}`}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</span>
              <span className={`text-xs font-bold uppercase ${ACTION_COLORS[entry.action] ?? 'text-muted-foreground'}`}>
                {entry.action}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.resourceType}/{entry.resourceId}
              </span>
              {entry.phiAccessed && (
                <ShieldAlert className="w-3 h-3 text-alert-amber" />
              )}
              {entry.outcome === 'success' ? (
                <CheckCircle className="ml-auto w-3 h-3 flex-shrink-0 text-vital-green" />
              ) : entry.outcome === 'denied' ? (
                <XCircle className="ml-auto w-3 h-3 flex-shrink-0 text-destructive" />
              ) : null}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{entry.userId} ({entry.userRole})</span>
              <span>{entry.ipAddress}</span>
            </div>
            {entry.details && <p className="mt-1 text-xs text-muted-foreground">{entry.details}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
