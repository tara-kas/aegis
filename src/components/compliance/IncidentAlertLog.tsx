import { useState } from 'react';
import type { Incident } from '../../types/compliance';
import { AlertTriangle, ArrowUpCircle, CheckCircle, Search, Radio, UserCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';

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

export function IncidentAlertLog({ incidents: initialIncidents, onEscalate }: IncidentAlertLogProps) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [actingOn, setActingOn] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleAction = (e: React.MouseEvent, incidentId: string, action: 'acknowledge' | 'resolve') => {
    e.stopPropagation();
    setActingOn((prev) => new Set(prev).add(incidentId));

    setTimeout(() => {
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc;
          if (action === 'acknowledge') {
            return {
              ...inc,
              status: 'investigating',
              assignee: 'Dr. User',
            };
          }
          if (action === 'resolve') {
            return {
              ...inc,
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
            };
          }
          return inc;
        })
      );
      setActingOn((prev) => {
        const next = new Set(prev);
        next.delete(incidentId);
        return next;
      });
      toast({
        title: action === 'acknowledge' ? 'Incident Acknowledged' : 'Incident Resolved',
        description: `Successfully transmitted status to incident.io.`,
      });
    }, 1200);
  };

  const activeCount = incidents.filter(i => ['open', 'investigating', 'mitigating'].includes(i.status)).length;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 p-3">
        <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
        <h3 className="text-sm font-medium text-foreground/80">incident.io Alert Log</h3>
        <span className="ml-auto text-xs text-muted-foreground">{activeCount} active ({incidents.length} total)</span>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        <Accordion type="single" collapsible className="w-full">
          {incidents.map((inc) => {
            const StatusIcon = STATUS_ICONS[inc.status] ?? AlertTriangle;
            const isActive = inc.status === 'open' || inc.status === 'investigating' || inc.status === 'mitigating';
            const isActing = actingOn.has(inc.id);

            return (
              <AccordionItem key={inc.id} value={inc.id} className={`border-b border-border transition-colors hover:bg-muted/50 ${isActive ? 'bg-muted/10' : ''}`}>
                <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
                  <div className="flex items-center gap-2 text-left w-full pr-4">
                    <StatusIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-alert-amber' : 'text-muted-foreground'}`} />
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${SEVERITY_COLORS[inc.severity]}`}>
                        {inc.severity.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-foreground">{inc.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{timeSince(inc.detectedAt)}</span>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-3 pb-3 pt-0 pl-9">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{inc.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground border-l-2 border-primary/20 pl-2">
                      <span className="capitalize"><span className="font-medium">Source:</span> {inc.source.replace('-', ' ')}</span>
                      {inc.assignee && <span><span className="font-medium">Assignee:</span> {inc.assignee}</span>}
                      {inc.resolvedAt && <span><span className="font-medium">Resolved:</span> {new Date(inc.resolvedAt).toLocaleTimeString()}</span>}
                      <span className="font-mono text-[10px] opacity-60">ID: {inc.id.toUpperCase()}</span>
                    </div>

                    {inc.remediationSteps.length > 0 && (
                      <div className="rounded bg-muted p-2 border border-border/50">
                        <span className="mb-1 block text-xs font-semibold text-foreground">Remediation Steps</span>
                        <ul className="list-inside list-disc space-y-0.5">
                          {inc.remediationSteps.map((step, i) => (
                            <li key={i} className="text-xs text-muted-foreground">{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {inc.impactAssessment && (
                      <p className="text-xs bg-alert-amber/10 text-alert-amber border border-alert-amber/20 p-2 rounded">
                        <strong>Impact:</strong> {inc.impactAssessment}
                      </p>
                    )}

                    {/* Actions Bar */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
                      {inc.status === 'open' && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-xs gap-1.5 shadow-sm"
                          onClick={(e) => handleAction(e, inc.id, 'acknowledge')}
                          disabled={isActing}
                        >
                          <UserCheck className={`w-3 h-3 ${isActing ? 'animate-pulse' : ''}`} />
                          {isActing ? 'Assigning...' : 'Acknowledge'}
                        </Button>
                      )}

                      {isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 border-vital-green/30 hover:bg-vital-green/10 text-vital-green"
                          onClick={(e) => handleAction(e, inc.id, 'resolve')}
                          disabled={isActing}
                        >
                          <CheckCircle className={`w-3 h-3 ${isActing ? 'animate-spin' : ''}`} />
                          {isActing ? 'Resolving...' : 'Mark Resolved'}
                        </Button>
                      )}

                      {inc.externalLink && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" asChild>
                          <a href={inc.externalLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                            View Ticket
                          </a>
                        </Button>
                      )}

                      {isActive && inc.status !== 'open' && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); onEscalate(inc.id); }}
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs gap-1.5 ml-auto opacity-80 hover:opacity-100"
                        >
                          <ArrowUpCircle className="w-3 h-3" />
                          Escalate
                        </Button>
                      )}
                    </div>
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
