import type { FhirPatient, FhirEncounter, FhirObservation } from '../../api/fhir';
import { User, Calendar, MapPin, FileText, Clock } from 'lucide-react';

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
    'in-progress': { label: 'In Progress', color: 'bg-green-700 text-green-100' },
    'planned': { label: 'Planned', color: 'bg-blue-700 text-blue-100' },
    'finished': { label: 'Completed', color: 'bg-gray-600 text-gray-200' },
    'arrived': { label: 'Arrived', color: 'bg-yellow-700 text-yellow-100' },
  };
  return map[status] ?? { label: status, color: 'bg-gray-600 text-gray-200' };
}

export function PatientViewer({ patient, encounter, observations }: PatientViewerProps) {
  const name = patient.name[0];
  const fullName = `${name.prefix?.join(' ') ?? ''} ${name.given.join(' ')} ${name.family}`.trim();
  const age = calculateAge(patient.birthDate);
  const mrn = patient.identifier.find((i) => i.system === 'urn:aegis:mrn')?.value ?? patient.id;
  const encounterStatus = encounter ? formatEncounterStatus(encounter.status) : null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-aegis-700 flex items-center justify-center text-white font-bold">
            {name.given[0][0]}{name.family[0]}
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">{fullName}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{patient.gender}, {age}y</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />DOB: {patient.birthDate}</span>
              <span className="font-mono text-aegis-400">{mrn}</span>
            </div>
          </div>
          {patient.active && <span className="text-xs px-2 py-0.5 rounded bg-green-800 text-green-200">Active</span>}
        </div>
      </div>

      {encounter && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-medium text-gray-300">Active Encounter</h4>
            {encounterStatus && (
              <span className={`text-xs px-2 py-0.5 rounded ${encounterStatus.color}`}>{encounterStatus.label}</span>
            )}
          </div>
          <p className="text-sm text-white">{encounter.type?.[0]?.text ?? 'Encounter'}</p>
          {encounter.reasonCode?.[0] && (
            <p className="text-xs text-gray-400 mt-1">Reason: {encounter.reasonCode[0].text}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
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
        <h4 className="text-sm font-medium text-gray-300 mb-2">Recent Observations ({observations.length})</h4>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {observations.slice(0, 8).map((obs) => (
            <div key={obs.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{obs.code.text ?? obs.code.coding[0]?.display}</span>
              <span className="text-white font-mono">
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
