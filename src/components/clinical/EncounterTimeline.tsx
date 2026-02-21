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
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50">
        <h3 className="text-sm font-medium text-gray-300">Encounter Timeline</h3>
      </div>
      <div className="p-4">
        <div className="relative">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-700" />
          <div className="space-y-4">
            {sorted.map((enc) => {
              const Icon = STATUS_ICON[enc.status] ?? Clock;
              const proc = procedures.find((p) => p.encounter?.reference === `Encounter/${enc.id}`);
              const isActive = enc.status === 'in-progress';

              return (
                <div key={enc.id} className="relative pl-8">
                  <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 ${isActive ? 'bg-green-400 border-green-400 animate-pulse' : 'bg-gray-700 border-gray-600'}`} />
                  <div className={`rounded-lg p-3 ${isActive ? 'bg-gray-800 border border-aegis-700' : 'bg-gray-800/50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-green-400' : 'text-gray-500'}`} />
                      <span className="text-sm font-medium text-white">{enc.type?.[0]?.text ?? 'Encounter'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{formatDate(enc.period.start)} {formatTime(enc.period.start)}</span>
                      {enc.period.end && <span>→ {formatTime(enc.period.end)}</span>}
                      <span className="text-gray-600">|</span>
                      <span>{enc.subject.display}</span>
                    </div>
                    {proc && (
                      <div className="mt-2 text-xs text-aegis-300">
                        Procedure: {proc.code.text ?? proc.code.coding[0]?.display}
                      </div>
                    )}
                    {enc.reasonCode?.[0] && (
                      <div className="mt-1 text-xs text-gray-500">
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
