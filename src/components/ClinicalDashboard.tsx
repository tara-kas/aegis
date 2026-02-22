import { useState, useCallback } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { mockPatients, mockEncounters, mockObservations, mockProcedures } from '../mock/data';
import { VitalSignCard } from './clinical/VitalSignCard';
import { AnomalyAlertBanner } from './clinical/AnomalyAlertBanner';
import { PatientViewer } from './clinical/PatientViewer';
import { TelemetryPanel } from './clinical/TelemetryPanel';
import { EncounterTimeline } from './clinical/EncounterTimeline';
import { VoiceScribeWidget } from './clinical/VoiceScribeWidget';
import { Activity, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FhirObservation } from '@/api/fhir';
import type { ScribeObservationResult } from '@/api/voice-scribe';

interface ClinicalDashboardProps {
  patientId?: string;
}

export function ClinicalDashboard({ patientId = 'patient-001' }: ClinicalDashboardProps) {
  const patient = mockPatients.find((p) => p.id === patientId) ?? mockPatients[0];
  const encounter = mockEncounters.find((e) => e.subject.reference === `Patient/${patientId}` && e.status === 'in-progress');
  const baseObservations = mockObservations.filter((o) => o.subject.reference === `Patient/${patientId}`);

  const { vitals, alerts, latestFrame, connectionStatus, acknowledgeAlert, dismissAlert, isStreaming, startStream, stopStream } = useTelemetry({ deviceId: 'robot-arm-001' });

  // ── Scribe-generated observations surface in the UI immediately ─────────
  const [scribeObservations, setScribeObservations] = useState<FhirObservation[]>([]);

  const handleScribeObservation = useCallback((result: ScribeObservationResult) => {
    // Append the new FHIR Observation so <PatientViewer> picks it up
    // without a page refresh. The billing trace is already recorded by
    // processScribeObservation() → traceObservationWorkflow(), so the
    // FinancialDashboard updates automatically via onTraceRecorded().
    setScribeObservations((prev) => [result.observation, ...prev]);
  }, []);

  // Merge base + scribe observations for the PatientViewer
  const observations = [...scribeObservations, ...baseObservations];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Clinician Dashboard</h1>
            <p className="text-sm text-muted-foreground">Real-time surgical monitoring &amp; FHIR patient data</p>
          </div>
        </div>
        <Button
          onClick={isStreaming ? stopStream : startStream}
          variant={isStreaming ? 'destructive' : 'default'}
          size="sm"
          className="gap-2"
        >
          {isStreaming ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isStreaming ? 'Stop Telemetry' : 'Start Telemetry'}
        </Button>
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
        <div className="col-span-4">
          <TelemetryPanel deviceId="robot-arm-001" latestFrame={latestFrame} connectionStatus={connectionStatus} />
        </div>
        <div className="col-span-4 space-y-6">
          <VoiceScribeWidget onObservationCreated={handleScribeObservation} />
          <EncounterTimeline encounters={mockEncounters} procedures={mockProcedures} />
        </div>
      </div>
    </div>
  );
}
