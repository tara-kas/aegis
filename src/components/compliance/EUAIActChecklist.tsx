import type { ComplianceItem } from '../../types/compliance';
import { CheckCircle, XCircle, Clock, Minus, ShieldCheck } from 'lucide-react';

interface EUAIActChecklistProps {
  items: ComplianceItem[];
  lastAuditDate: string;
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle, color: 'text-vital-green', bg: 'bg-vital-green/5' },
  fail: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/5' },
  pending: { icon: Clock, color: 'text-alert-amber', bg: 'bg-alert-amber/5' },
  'not-applicable': { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' },
};

const REGULATION_BADGE: Record<string, string> = {
  'eu-ai-act': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'dora': 'bg-clinical-blue/10 text-clinical-blue',
  'mdr': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'gdpr': 'bg-vital-green/10 text-vital-green',
  'hipaa': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
};

export function EUAIActChecklist({ items, lastAuditDate }: EUAIActChecklistProps) {
  const passCount = items.filter((i) => i.status === 'pass').length;
  const failCount = items.filter((i) => i.status === 'fail').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 p-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <h3 className="text-sm font-medium text-foreground/80">Regulatory Compliance Checklist</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Audit: {new Date(lastAuditDate).toLocaleDateString('en-GB')}
        </span>
      </div>

      <div className="flex items-center gap-4 border-b border-border p-3">
        <span className="text-xs text-vital-green">{passCount} passed</span>
        <span className="text-xs text-destructive">{failCount} failed</span>
        <span className="text-xs text-alert-amber">{pendingCount} pending</span>
        <div className="flex-1">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-vital-green" style={{ width: `${(passCount / items.length) * 100}%` }} />
            <div className="h-full bg-destructive" style={{ width: `${(failCount / items.length) * 100}%` }} />
            <div className="h-full bg-alert-amber" style={{ width: `${(pendingCount / items.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="max-h-[500px] divide-y divide-border overflow-y-auto">
        {items.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          const Icon = cfg.icon;

          return (
            <div key={item.id} className={`p-3 transition-colors hover:bg-muted/50 ${cfg.bg}`}>
              <div className="flex items-start gap-2">
                <Icon className={`mt-0.5 w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{item.requirement}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs ${REGULATION_BADGE[item.regulation] ?? 'bg-muted text-muted-foreground'}`}>
                      {item.regulation.toUpperCase()}
                    </span>
                    {item.articleReference && (
                      <span className="text-xs text-muted-foreground">{item.articleReference}</span>
                    )}
                    <span className={`rounded px-1.5 py-0.5 text-xs ${
                      item.riskLevel === 'high' ? 'bg-destructive/10 text-destructive' :
                      item.riskLevel === 'medium' ? 'bg-alert-amber/10 text-alert-amber' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {item.riskLevel} risk
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  {item.evidence && (
                    <p className="mt-1 text-xs text-vital-green/70">Evidence: {item.evidence}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
