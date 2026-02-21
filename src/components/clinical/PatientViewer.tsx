import type { FhirPatient, FhirEncounter, FhirObservation } from '../../api/fhir';
import { User, Calendar, MapPin, FileText, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PatientViewerProps {
  patient: FhirPatient;
  encounter?: FhirEncounter;
  observations: FhirObservation[];
}

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

function formatEncounterStatus(status: FhirEncounter['status']): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    'in-progress': { label: 'In Progress', color: 'bg-vital-green text-vital-green-foreground' },
    'planned': { label: 'Planned', color: 'bg-clinical-blue text-clinical-blue-foreground' },
    'finished': { label: 'Completed', color: 'bg-muted text-muted-foreground' },
    'arrived': { label: 'Arrived', color: 'bg-alert-amber text-alert-amber-foreground' },
  };
  return map[status] ?? { label: status, color: 'bg-muted text-muted-foreground' };
}

export function PatientViewer({ patient, encounter, observations }: PatientViewerProps) {
  const name = patient.name[0];
  const fullName = `${name.prefix?.join(' ') ?? ''} ${name.given.join(' ')} ${name.family}`.trim();
  const age = calculateAge(patient.birthDate);
  const mrn = patient.identifier.find((i) => i.system === 'urn:aegis:mrn')?.value ?? patient.id;
  const encounterStatus = encounter ? formatEncounterStatus(encounter.status) : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
            {name.given[0][0]}{name.family[0]}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{fullName}</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{patient.gender}, {age}y</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />DOB: {patient.birthDate}</span>
              <span className="font-mono text-primary">{mrn}</span>
            </div>
          </div>
          {patient.active && <Badge className="bg-vital-green text-vital-green-foreground">Active</Badge>}
        </div>
      </div>

      {encounter && (
        <div className="border-b border-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground/80">Active Encounter</h4>
            {encounterStatus && (
              <span className={`text-xs px-2 py-0.5 rounded ${encounterStatus.color}`}>{encounterStatus.label}</span>
            )}
          </div>
          <p className="text-sm text-foreground">{encounter.type?.[0]?.text ?? 'Encounter'}</p>
          {encounter.reasonCode?.[0] && (
            <p className="text-xs text-muted-foreground mt-1">Reason: {encounter.reasonCode[0].text}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Started: {new Date(encounter.period.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {encounter.location?.[0] && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {encounter.location[0].location.display}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-4">
        <h4 className="mb-2 text-sm font-medium text-foreground/80">Recent Observations ({observations.length})</h4>
        <div className="max-h-40 space-y-1.5 overflow-y-auto">
          {observations.slice(0, 8).map((obs) => (
            <div key={obs.id} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{obs.code.text ?? obs.code.coding[0]?.display}</span>
              <span className="font-mono text-foreground">
                {obs.valueQuantity
                  ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit}`
                  : obs.component
                    ? obs.component.map((c) => `${c.valueQuantity?.value ?? '?'}`).join('/')
                    : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
