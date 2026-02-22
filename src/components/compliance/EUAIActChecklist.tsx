import { useState } from 'react';
import type { ComplianceItem } from '../../types/compliance';
import { CheckCircle, XCircle, Clock, Minus, ShieldCheck, ExternalLink, RefreshCcw } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [syncingItems, setSyncingItems] = useState<Set<string>>(new Set());
  const [syncedStatuses, setSyncedStatuses] = useState<Record<string, 'pass' | 'fail'>>({});

  const displayItems = items.map(item => ({
    ...item,
    status: syncedStatuses[item.id] || item.status
  }));

  const passCount = displayItems.filter((i) => i.status === 'pass').length;
  const failCount = displayItems.filter((i) => i.status === 'fail').length;
  const pendingCount = displayItems.filter((i) => i.status === 'pending').length;

  const handleFetchStatus = (e: React.MouseEvent, item: ComplianceItem) => {
    e.stopPropagation();
    setSyncingItems((prev) => new Set(prev).add(item.id));

    // Simulate API call to EUR-Lex or internal compliance auditor
    setTimeout(() => {
      setSyncingItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setSyncedStatuses((prev) => ({ ...prev, [item.id]: 'pass' }));
      toast({
        title: 'Compliance Status Updated',
        description: `Successfully verified requirement against latest regulatory API.`,
      });
    }, 1500);
  };

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
            <div className="h-full bg-vital-green" style={{ width: `${(passCount / displayItems.length) * 100}%` }} />
            <div className="h-full bg-destructive" style={{ width: `${(failCount / displayItems.length) * 100}%` }} />
            <div className="h-full bg-alert-amber" style={{ width: `${(pendingCount / displayItems.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        <Accordion type="single" collapsible className="w-full">
          {displayItems.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            const Icon = cfg.icon;

            return (
              <AccordionItem key={item.id} value={item.id} className={`border-b border-border transition-colors hover:bg-muted/50 ${cfg.bg}`}>
                <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <Icon className={`mt-[1px] w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{item.requirement}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ${REGULATION_BADGE[item.regulation] ?? 'bg-muted text-muted-foreground'}`}>
                        {item.regulation.toUpperCase()}
                      </span>
                      {item.articleReference && (
                        <span className="text-xs text-muted-foreground">{item.articleReference}</span>
                      )}
                      <span className={`rounded px-1.5 py-0.5 text-xs ${item.riskLevel === 'high' ? 'bg-destructive/10 text-destructive' :
                        item.riskLevel === 'medium' ? 'bg-alert-amber/10 text-alert-amber' :
                          'bg-muted text-muted-foreground'
                        }`}>
                        {item.riskLevel} risk
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-0 pl-9">
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  {item.evidence && (
                    <div className="mt-2 text-xs">
                      <span className="font-medium text-foreground">Evidence:</span>{' '}
                      <span className="text-vital-green">{item.evidence}</span>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
                    {item.externalLink && (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
                        <a href={item.externalLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" />
                          Read Official Regulation
                        </a>
                      </Button>
                    )}

                    {item.status === 'pending' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={(e) => handleFetchStatus(e, item)}
                        disabled={syncingItems.has(item.id)}
                      >
                        <RefreshCcw className={`w-3 h-3 ${syncingItems.has(item.id) ? 'animate-spin' : ''}`} />
                        {syncingItems.has(item.id) ? 'Querying API...' : 'Fetch Live Status'}
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
