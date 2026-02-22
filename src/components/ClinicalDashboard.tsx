import { useState, useCallback, useMemo } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { mockPatients, mockEncounters, mockObservations, mockProcedures } from '../mock/data';
import { VitalSignCard } from './clinical/VitalSignCard';
import { AnomalyAlertBanner } from './clinical/AnomalyAlertBanner';
import { PatientViewer } from './clinical/PatientViewer';
import { TelemetryPanel } from './clinical/TelemetryPanel';
import { EncounterTimeline } from './clinical/EncounterTimeline';
import { VoiceScribeWidget } from './clinical/VoiceScribeWidget';
import { Activity, Play, Square, Search, Users, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { FhirObservation } from '@/api/fhir';
import type { ScribeObservationResult } from '@/api/voice-scribe';

interface ClinicalDashboardProps {
  patientId?: string;
}

export function ClinicalDashboard() {
  const [activePatientId, setActivePatientId] = useState<string>('patient-001');
  const [searchQuery, setSearchQuery] = useState('');

  const patient = mockPatients.find((p) => p.id === activePatientId) ?? mockPatients[0];
  const encounter = mockEncounters.find((e) => e.subject.reference === `Patient/${activePatientId}` && e.status === 'in-progress');
  const baseObservations = mockObservations.filter((o) => o.subject.reference === `Patient/${activePatientId}`);

  // Determine active OR based on patient ID (simplistic mapping for simulation)
  const activeDevice = activePatientId === 'patient-002' ? 'robot-arm-002' : 'robot-arm-001';

  const { vitals, alerts, latestFrame, connectionStatus, acknowledgeAlert, dismissAlert, isStreaming, startStream, stopStream } = useTelemetry({ deviceId: activeDevice });

  const [scribeObservations, setScribeObservations] = useState<FhirObservation[]>([]);

  const handleScribeObservation = useCallback((result: ScribeObservationResult) => {
    setScribeObservations((prev) => [result.observation, ...prev]);
  }, []);

  const observations = useMemo(() => [...scribeObservations, ...baseObservations], [scribeObservations, baseObservations]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return mockPatients.filter(p => {
      const name = `${p.name[0].given.join(' ')} ${p.name[0].family}`.toLowerCase();
      const identifier = p.identifier[1]?.value?.toLowerCase() ?? '';
      return name.includes(query) || identifier.includes(query);
    }).slice(0, 10);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Concurrent Session Switcher Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Clinician Dashboard</h1>
              <p className="text-sm text-muted-foreground">Real-time surgical monitoring &amp; FHIR patient data</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Searchable Patient Log */}
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 30+ patients (name/MRN)..."
                className="pl-9 h-9 text-xs"
              />
              {filteredPatients.length > 0 && (
                <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full z-50 bg-popover border border-border rounded-md shadow-md overflow-hidden">
                  <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground/80">Search Results</span>
                  </div>
                  <ul className="max-h-64 overflow-y-auto divide-y divide-border/50">
                    {filteredPatients.map(p => {
                      const name = `${p.name[0].given.join(' ')} ${p.name[0].family}`;
                      return (
                        <li
                          key={p.id}
                          className="px-3 py-2.5 hover:bg-muted/80 cursor-pointer transition-colors"
                          onClick={() => { setActivePatientId(p.id); setSearchQuery(''); }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{name}</span>
                            {p.id === 'patient-001' || p.id === 'patient-002' ?
                              <Badge className="text-[10px] h-4 bg-primary/20 text-primary border-0">IN SURGERY</Badge> : null
                            }
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.identifier[1]?.value} • {p.birthDate}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <Button
              onClick={isStreaming ? stopStream : startStream}
              variant={isStreaming ? 'destructive' : 'default'}
              size="sm"
              className="gap-2 shrink-0 shadow-sm"
            >
              {isStreaming ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isStreaming ? 'Stop Telemetry' : 'Start Telemetry'}
            </Button>
          </div>
        </div>

        {/* Live Session Switcher */}
        <div className="flex gap-3">
          <Button
            variant={activePatientId === 'patient-001' ? 'default' : 'outline'}
            className="flex-1 justify-start h-auto py-3 gap-3 border-border shadow-sm"
            onClick={() => setActivePatientId('patient-001')}
          >
            <div className={`p-2 rounded-full ${activePatientId === 'patient-001' ? 'bg-primary-foreground/20' : 'bg-primary/10'}`}>
              <Stethoscope className={`w-4 h-4 ${activePatientId === 'patient-001' ? 'text-primary-foreground' : 'text-primary'}`} />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">OR Suite 3 — Robotic Surgery</div>
              <div className={`text-xs ${activePatientId === 'patient-001' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                Cholecystectomy • Ms. Yuki Nakamura
              </div>
            </div>
            {activePatientId === 'patient-001' && <Badge variant="secondary" className="ml-auto bg-primary-foreground text-primary border-primary hover:bg-primary-foreground shadow-sm">LIVE</Badge>}
          </Button>

          <Button
            variant={activePatientId === 'patient-002' ? 'default' : 'outline'}
            className="flex-1 justify-start h-auto py-3 gap-3 border-border shadow-sm"
            onClick={() => setActivePatientId('patient-002')}
          >
            <div className={`p-2 rounded-full ${activePatientId === 'patient-002' ? 'bg-primary-foreground/20' : 'bg-primary/10'}`}>
              <Activity className={`w-4 h-4 ${activePatientId === 'patient-002' ? 'text-primary-foreground' : 'text-primary'}`} />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">OR Suite 2 — Minimally Invasive</div>
              <div className={`text-xs ${activePatientId === 'patient-002' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                Prostatectomy • Declan O'Brien
              </div>
            </div>
            {activePatientId === 'patient-002' && <Badge variant="secondary" className="ml-auto bg-primary-foreground text-primary border-primary hover:bg-primary-foreground shadow-sm">LIVE</Badge>}
          </Button>
        </div>
      </div>

      <AnomalyAlertBanner alerts={alerts} onDismiss={dismissAlert} onAcknowledge={acknowledgeAlert} />

      <div className="grid grid-cols-7 gap-3">
        {vitals.map((v) => (
          <VitalSignCard key={v.code} vital={v} />
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <PatientViewer patient={patient} encounter={encounter} observations={observations} />
        </div>
        <div className="col-span-4 flex flex-col gap-6">
          <TelemetryPanel deviceId={activeDevice} latestFrame={latestFrame} connectionStatus={connectionStatus} />
        </div>
        <div className="col-span-4 space-y-6">
          <VoiceScribeWidget onObservationCreated={handleScribeObservation} />
          <EncounterTimeline encounters={mockEncounters} procedures={mockProcedures} />
        </div>
      </div>
    </div>
  );
}
