import type { FhirEncounter, FhirProcedure } from '../../api/fhir';
import { Clock, Play, CheckCircle, Calendar } from 'lucide-react';

interface EncounterTimelineProps {
  encounters: FhirEncounter[];
  procedures: FhirProcedure[];
}

const STATUS_ICON: Record<string, typeof Clock> = {
  'in-progress': Play,
  'finished': CheckCircle,
  'planned': Calendar,
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function EncounterTimeline({ encounters, procedures }: EncounterTimelineProps) {
  const sorted = [...encounters].sort((a, b) => new Date(b.period.start).getTime() - new Date(a.period.start).getTime());

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/50 p-3">
        <h3 className="text-sm font-medium text-foreground/80">Encounter Timeline</h3>
      </div>
      <div className="p-4">
        <div className="relative">
          <div className="absolute bottom-0 left-3 top-0 w-px bg-border" />
          <div className="space-y-4">
            {sorted.map((enc) => {
              const Icon = STATUS_ICON[enc.status] ?? Clock;
              const proc = procedures.find((p) => p.encounter?.reference === `Encounter/${enc.id}`);
              const isActive = enc.status === 'in-progress';

              return (
                <div key={enc.id} className="relative pl-8">
                  <div className={`absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 ${isActive ? 'animate-pulse border-vital-green bg-vital-green' : 'border-border bg-muted'}`} />
                  <div className={`rounded-lg p-3 ${isActive ? 'border border-primary bg-muted' : 'bg-muted/50'}`}>
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-vital-green' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium text-foreground">{enc.type?.[0]?.text ?? 'Encounter'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(enc.period.start)} {formatTime(enc.period.start)}</span>
                      {enc.period.end && <span>→ {formatTime(enc.period.end)}</span>}
                      <span className="text-muted-foreground/50">|</span>
                      <span>{enc.subject.display}</span>
                    </div>
                    {proc && (
                      <div className="mt-2 text-xs text-primary/80">
                        Procedure: {proc.code.text ?? proc.code.coding[0]?.display}
                      </div>
                    )}
                    {enc.reasonCode?.[0] && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {enc.reasonCode[0].text}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
