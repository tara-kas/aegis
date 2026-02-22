/**
 * Aegis Mock Data Layer
 *
 * All placeholder data lives here — zero hardcoded values in components.
 * Modelled after Synthea-generated FHIR R4 resources and MIMIC-IV patterns.
 * Every FHIR resource includes proper meta, identifier, and R4-compliant fields.
 */

import type { FhirPatient, FhirEncounter, FhirObservation, FhirDevice, FhirProcedure } from '../api/fhir';
import type { VitalSign, AnomalyAlert, KinematicFrame, JointAngle } from '../types/telemetry';
import type { MarginData, SolanaTransaction, ACPStatus, SharedPaymentToken, SubscriptionSummary, RevenueDataPoint, PaidAiTrace } from '../types/financial';
import type { ComplianceItem, Incident, AuditEntry } from '../types/compliance';

// ─── Per-Patient Baseline Profiles ──────────────────────────────────────────
// Each profile defines clinically distinct baselines so concurrent surgeries
// look visibly different on the dashboard.  Profiles are keyed by patient ID;
// unknown patients get a deterministic pseudo-random baseline derived from
// a simple hash of their ID.

interface VitalBaseline {
  heartRate: number;        // bpm
  spo2: number;             // %
  systolicBP: number;       // mmHg
  diastolicBP: number;      // mmHg
  etco2: number;            // mmHg
  respRate: number;         // /min
  temperature: number;      // °C
}

const PATIENT_BASELINES: Record<string, VitalBaseline> = {
  // Patient A — stable, low-normal heart rate (65-70 bpm)
  'patient-001': { heartRate: 67, spo2: 99, systolicBP: 112, diastolicBP: 72, etco2: 37, respRate: 13, temperature: 36.6 },
  // Patient B — tachycardia risk, elevated HR (110-115 bpm), lower SpO₂
  'patient-002': { heartRate: 112, spo2: 95, systolicBP: 145, diastolicBP: 88, etco2: 41, respRate: 18, temperature: 37.1 },
  // Patient C — moderate, slightly elevated (85-90 bpm)
  'patient-003': { heartRate: 87, spo2: 97, systolicBP: 128, diastolicBP: 80, etco2: 39, respRate: 15, temperature: 36.8 },
};

/** Simple string hash → deterministic number 0–1 for unknown patients */
function hashPatientId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 1000) / 1000;
}

/** Derive a plausible baseline from a patient hash */
function deriveBaseline(id: string): VitalBaseline {
  const h = hashPatientId(id);
  return {
    heartRate: 60 + Math.round(h * 55),           // 60–115 bpm
    spo2: 95 + Math.round(h * 4),             // 95–99 %
    systolicBP: 100 + Math.round(h * 50),           // 100–150 mmHg
    diastolicBP: 62 + Math.round(h * 28),           // 62–90 mmHg
    etco2: 35 + Math.round(h * 10),            // 35–45 mmHg
    respRate: 12 + Math.round(h * 8),             // 12–20 /min
    temperature: 36.2 + Math.round(h * 10) / 10,     // 36.2–37.2 °C
  };
}

function getBaseline(patientId: string): VitalBaseline {
  return PATIENT_BASELINES[patientId] ?? deriveBaseline(patientId);
}

/** Build a VitalSign[] array with patient-specific baselines */
export function getPatientVitalSigns(patientId: string): VitalSign[] {
  const b = getBaseline(patientId);
  const ts = new Date().toISOString();
  return [
    { code: '8867-4', display: 'Heart Rate', value: b.heartRate, unit: 'bpm', normalRange: { low: 60, high: 100 }, trend: 'stable', timestamp: ts },
    { code: '2708-6', display: 'SpO₂', value: b.spo2, unit: '%', normalRange: { low: 95, high: 100 }, trend: 'stable', timestamp: ts },
    { code: '8480-6', display: 'Systolic BP', value: b.systolicBP, unit: 'mmHg', normalRange: { low: 90, high: 140 }, trend: 'stable', timestamp: ts },
    { code: '8462-4', display: 'Diastolic BP', value: b.diastolicBP, unit: 'mmHg', normalRange: { low: 60, high: 90 }, trend: 'stable', timestamp: ts },
    { code: '19889-5', display: 'EtCO₂', value: b.etco2, unit: 'mmHg', normalRange: { low: 35, high: 45 }, trend: 'stable', timestamp: ts },
    { code: '9279-1', display: 'Resp Rate', value: b.respRate, unit: '/min', normalRange: { low: 12, high: 20 }, trend: 'stable', timestamp: ts },
    { code: '8310-5', display: 'Temperature', value: b.temperature, unit: '°C', normalRange: { low: 36.1, high: 37.2 }, trend: 'stable', timestamp: ts },
  ];
}

// ─── Number of Patients Seed ────────────────────────────────────────────────
const TOTAL_GENERATED_PATIENTS = Math.floor(Math.random() * 21) + 20; // 20 to 40

// ─── FHIR Patients Factory ────────────────────────────────────────────────
function generateFakePatients(count: number): FhirPatient[] {
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson'];

  return Array.from({ length: count }).map((_, i) => {
    const id = `patient-${100 + i}`;
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const birthYear = 1940 + Math.floor(Math.random() * 60);
    const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const gender = ['male', 'female', 'other'][Math.floor(Math.random() * 3)] as 'male' | 'female' | 'other';
    const active = Math.random() > 0.2; // 80% chance to be active

    return {
      resourceType: 'Patient',
      id,
      meta: { versionId: '1', lastUpdated: new Date().toISOString() },
      identifier: [
        { system: 'urn:oid:2.16.840.1.113883.2.1.4.1', value: `NHS-${Math.floor(Math.random() * 10000000000)}`, use: 'official' },
        { system: 'urn:aegis:mrn', value: `MRN-2026-${String(100 + i).padStart(4, '0')}`, use: 'usual' },
      ],
      active,
      name: [{ use: 'official', family: ln, given: [fn] }],
      gender,
      birthDate: `${birthYear}-${birthMonth}-${birthDay}`,
      address: [{ use: 'home', line: [`${Math.floor(Math.random() * 100) + 1} Fake St`], city: 'London', postalCode: 'W1', country: 'GB' }],
    };
  });
}

export const mockPatients: FhirPatient[] = [
  {
    resourceType: 'Patient',
    id: 'patient-001',
    meta: { versionId: '3', lastUpdated: new Date().toISOString() },
    identifier: [
      { system: 'urn:oid:2.16.840.1.113883.2.1.4.1', value: 'NHS-9876543210', use: 'official' },
      { system: 'urn:aegis:mrn', value: 'MRN-2026-0001', use: 'usual' },
    ],
    active: true,
    name: [{ use: 'official', family: 'Nakamura', given: ['Yuki', 'A.'], prefix: ['Ms.'] }],
    gender: 'female',
    birthDate: '1988-03-14',
    telecom: [{ system: 'phone', value: '+44-7700-900123', use: 'mobile' }],
    address: [{ use: 'home', line: ['42 Harley Street'], city: 'London', postalCode: 'W1G 9PL', country: 'GB' }],
  },
  {
    resourceType: 'Patient',
    id: 'patient-002',
    meta: { versionId: '1', lastUpdated: new Date().toISOString() },
    identifier: [
      { system: 'urn:oid:2.16.840.1.113883.2.1.4.1', value: 'NHS-1234567890', use: 'official' },
      { system: 'urn:aegis:mrn', value: 'MRN-2026-0002', use: 'usual' },
    ],
    active: true,
    name: [{ use: 'official', family: 'O\'Brien', given: ['Declan', 'M.'] }],
    gender: 'male',
    birthDate: '1955-11-28',
    address: [{ use: 'home', line: ['88 Grafton Street'], city: 'Dublin', postalCode: 'D02 VF65', country: 'IE' }],
  },
  {
    resourceType: 'Patient',
    id: 'patient-003',
    meta: { versionId: '2', lastUpdated: new Date().toISOString() },
    identifier: [
      { system: 'urn:oid:2.16.840.1.113883.2.1.4.1', value: 'NHS-5556667778', use: 'official' },
      { system: 'urn:aegis:mrn', value: 'MRN-2026-0003', use: 'usual' },
    ],
    active: true,
    name: [{ use: 'official', family: 'Müller', given: ['Sofie'] }],
    gender: 'female',
    birthDate: '1972-07-05',
    address: [{ use: 'home', line: ['Friedrichstraße 43'], city: 'Berlin', postalCode: '10117', country: 'DE' }],
  },
  ...generateFakePatients(TOTAL_GENERATED_PATIENTS)
];

// ─── FHIR Encounters Factory ────────────────────────────────────────────────
function generateFakeEncounters(patients: FhirPatient[]): FhirEncounter[] {
  // Filter out the first 3 since they are statically mapped below
  const generatedPatients = patients.slice(3);
  const encounterTypes = [
    { code: '387713003', display: 'Surgical procedure', text: 'Outpatient consult' },
    { code: '265764009', display: 'Renal transplant', text: 'Post-op follow-up' },
    { code: '305354007', display: 'Admission to surgical department', text: 'Pre-admission screening' }
  ];

  return generatedPatients.map((p, i) => {
    const isFinished = Math.random() > 0.3; // 70% finished, 30% planned
    const typeObj = encounterTypes[Math.floor(Math.random() * encounterTypes.length)];
    const id = `encounter-${100 + i}`;

    return {
      resourceType: 'Encounter',
      id,
      meta: { versionId: '1', lastUpdated: new Date(Date.now() - Math.random() * 86400 * 1000).toISOString() },
      status: isFinished ? 'finished' : 'planned',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
      type: [{ coding: [{ system: 'http://snomed.info/sct', code: typeObj.code, display: typeObj.display }], text: typeObj.text }],
      subject: { reference: `Patient/${p.id}`, display: `${p.name[0].given[0]} ${p.name[0].family}` },
      period: {
        start: new Date(Date.now() - (isFinished ? 86400 * 1000 * Math.random() : -86400 * 1000 * Math.random())).toISOString()
      },
    };
  });
}

export const mockEncounters: FhirEncounter[] = [
  {
    resourceType: 'Encounter',
    id: 'encounter-001',
    meta: { versionId: '2', lastUpdated: new Date(Date.now() - 25 * 60000).toISOString() },
    status: 'in-progress',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient encounter' },
    type: [{ coding: [{ system: 'http://snomed.info/sct', code: '305354007', display: 'Admission to surgical department' }], text: 'Robotic-assisted laparoscopic cholecystectomy' }],
    subject: { reference: 'Patient/patient-001', display: 'Ms. Yuki A. Nakamura' },
    participant: [{ individual: { reference: 'Practitioner/surgeon-001', display: 'Dr. Elena Vasquez' } }],
    period: { start: new Date(Date.now() - 35 * 60000).toISOString() },
    reasonCode: [{ coding: [{ system: 'http://snomed.info/sct', code: '235919008', display: 'Cholecystitis' }], text: 'Acute cholecystitis' }],
    location: [{ location: { reference: 'Location/or-3', display: 'OR Suite 3 — Robotic Surgery' } }],
  },
  {
    resourceType: 'Encounter',
    id: 'encounter-002',
    meta: { versionId: '1', lastUpdated: new Date().toISOString() },
    status: 'in-progress',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient encounter' },
    type: [{ coding: [{ system: 'http://snomed.info/sct', code: '387713003', display: 'Surgical procedure' }], text: 'Robotic-assisted prostatectomy' }],
    subject: { reference: 'Patient/patient-002', display: 'Declan M. O\'Brien' },
    period: { start: new Date(Date.now() - 120 * 60000).toISOString() },
    reasonCode: [{ coding: [{ system: 'http://snomed.info/sct', code: '399068003', display: 'Malignant neoplasm of prostate' }], text: 'Prostate carcinoma — Gleason 3+4' }],
    location: [{ location: { reference: 'Location/or-2', display: 'OR Suite 2 — Minimally Invasive' } }],
  },
  {
    resourceType: 'Encounter',
    id: 'encounter-003',
    meta: { versionId: '1', lastUpdated: new Date(Date.now() - 86400 * 1000).toISOString() },
    status: 'finished',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient encounter' },
    type: [{ coding: [{ system: 'http://snomed.info/sct', code: '265764009', display: 'Renal transplant' }], text: 'Robotic-assisted partial nephrectomy' }],
    subject: { reference: 'Patient/patient-003', display: 'Sofie Müller' },
    period: { start: new Date(Date.now() - 86400 * 1000 - 14400 * 1000).toISOString(), end: new Date(Date.now() - 86400 * 1000).toISOString() },
  },
  ...generateFakeEncounters(mockPatients)
];

// ─── FHIR Observations Factory ──────────────────────────────────────────────
function generateObservationsForActiveEncounters(encounters: FhirEncounter[]): FhirObservation[] {
  const activeEncounters = encounters.filter(e => e.status === 'in-progress');
  const observations: FhirObservation[] = [];

  let obsCounter = 100;
  activeEncounters.forEach(enc => {
    const patientRef = enc.subject.reference;
    const baseDate = new Date().toISOString();

    // Derive patient-specific baselines for observation generation
    const patientId = patientRef.replace('Patient/', '');
    const baseline = getBaseline(patientId);

    // Heart Rate — uses patient-specific baseline
    observations.push({
      resourceType: 'Observation',
      id: `obs-hr-gen-${obsCounter++}`,
      meta: { versionId: '1', lastUpdated: baseDate },
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }], text: 'Heart Rate' },
      subject: { reference: patientRef },
      encounter: { reference: `Encounter/${enc.id}` },
      effectiveDateTime: baseDate,
      valueQuantity: { value: baseline.heartRate + Math.floor(Math.random() * 10) - 5, unit: 'beats/minute', system: 'http://unitsofmeasure.org', code: '/min' },
      referenceRange: [{ low: { value: 60, unit: '/min', system: 'http://unitsofmeasure.org', code: '/min' }, high: { value: 100, unit: '/min', system: 'http://unitsofmeasure.org', code: '/min' } }],
    });

    // SpO2 — uses patient-specific baseline
    observations.push({
      resourceType: 'Observation',
      id: `obs-spo2-gen-${obsCounter++}`,
      meta: { versionId: '1', lastUpdated: baseDate },
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: '2708-6', display: 'Oxygen saturation in Arterial blood by Pulse oximetry' }], text: 'SpO₂' },
      subject: { reference: patientRef },
      encounter: { reference: `Encounter/${enc.id}` },
      effectiveDateTime: baseDate,
      valueQuantity: { value: baseline.spo2 + Math.floor(Math.random() * 3) - 1, unit: '%', system: 'http://unitsofmeasure.org', code: '%' },
      referenceRange: [{ low: { value: 95, unit: '%', system: 'http://unitsofmeasure.org', code: '%' }, high: { value: 100, unit: '%', system: 'http://unitsofmeasure.org', code: '%' } }],
    });

    // Blood Pressure Panel — uses patient-specific baseline
    observations.push({
      resourceType: 'Observation',
      id: `obs-bp-gen-${obsCounter++}`,
      meta: { versionId: '1', lastUpdated: baseDate },
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }], text: 'Blood Pressure' },
      subject: { reference: patientRef },
      encounter: { reference: `Encounter/${enc.id}` },
      effectiveDateTime: baseDate,
      component: [
        { code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] }, valueQuantity: { value: baseline.systolicBP + Math.floor(Math.random() * 10) - 5, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } },
        { code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] }, valueQuantity: { value: baseline.diastolicBP + Math.floor(Math.random() * 8) - 4, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } },
      ],
    });

    // Temperature
    observations.push({
      resourceType: 'Observation',
      id: `obs-temp-gen-${obsCounter++}`,
      meta: { versionId: '1', lastUpdated: baseDate },
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }], text: 'Temperature' },
      subject: { reference: patientRef },
      encounter: { reference: `Encounter/${enc.id}` },
      effectiveDateTime: baseDate,
      valueQuantity: { value: 36.5 + Math.floor(Math.random() * 10) / 10, unit: 'Cel', system: 'http://unitsofmeasure.org', code: 'Cel' },
      referenceRange: [{ low: { value: 36.1, unit: 'Cel', system: 'http://unitsofmeasure.org', code: 'Cel' }, high: { value: 37.2, unit: 'Cel', system: 'http://unitsofmeasure.org', code: 'Cel' } }],
    });

    // Respiratory Rate
    observations.push({
      resourceType: 'Observation',
      id: `obs-resp-gen-${obsCounter++}`,
      meta: { versionId: '1', lastUpdated: baseDate },
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: '9279-1', display: 'Respiratory rate' }], text: 'Respiratory Rate' },
      subject: { reference: patientRef },
      encounter: { reference: `Encounter/${enc.id}` },
      effectiveDateTime: baseDate,
      valueQuantity: { value: 12 + Math.floor(Math.random() * 8), unit: 'breaths/minute', system: 'http://unitsofmeasure.org', code: '/min' },
      referenceRange: [{ low: { value: 12, unit: '/min', system: 'http://unitsofmeasure.org', code: '/min' }, high: { value: 20, unit: '/min', system: 'http://unitsofmeasure.org', code: '/min' } }],
    });

    // EtCO2
    observations.push({
      resourceType: 'Observation',
      id: `obs-etco2-gen-${obsCounter++}`,
      meta: { versionId: '1', lastUpdated: baseDate },
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: '19889-5', display: 'End tidal CO2' }], text: 'EtCO₂' },
      subject: { reference: patientRef },
      encounter: { reference: `Encounter/${enc.id}` },
      effectiveDateTime: baseDate,
      valueQuantity: { value: 35 + Math.floor(Math.random() * 10), unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      referenceRange: [{ low: { value: 35, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }, high: { value: 45, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } }],
    });
  });

  return observations;
}

// ─── FHIR Observations (Vital Signs — MIMIC-IV patterns) ────────────────────

export const mockObservations: FhirObservation[] = [
  ...generateObservationsForActiveEncounters(mockEncounters)
];

// ─── FHIR Devices ────────────────────────────────────────────────────────────

export const mockDevices: FhirDevice[] = [
  {
    resourceType: 'Device',
    id: 'robot-arm-001',
    meta: { versionId: '1', lastUpdated: '2026-02-21T06:00:00Z' },
    status: 'active',
    deviceName: [
      { name: 'Aegis Surgical Arm — Unit Alpha', type: 'user-friendly-name' },
      { name: 'Da Vinci Xi Simulated', type: 'model-name' },
    ],
    type: { coding: [{ system: 'http://snomed.info/sct', code: '706689003', display: 'Robotic surgical system' }], text: 'Robotic Surgical Arm (6-axis, Webots simulation)' },
    manufacturer: 'Aegis Robotics (Simulated)',
    modelNumber: 'AEGIS-SIM-6AX-v2',
    serialNumber: 'WB-2026-ALPHA-001',
  },
  {
    resourceType: 'Device',
    id: 'monitor-001',
    meta: { versionId: '1', lastUpdated: '2026-02-21T06:00:00Z' },
    status: 'active',
    deviceName: [{ name: 'Philips IntelliVue MX800 (Simulated)', type: 'user-friendly-name' }],
    type: { coding: [{ system: 'http://snomed.info/sct', code: '706767009', display: 'Patient monitoring system' }], text: 'Multi-parameter patient monitor' },
    manufacturer: 'Philips (Simulated)',
    modelNumber: 'MX800-SIM',
  },
];

// ─── FHIR Procedures ────────────────────────────────────────────────────────

export const mockProcedures: FhirProcedure[] = [
  {
    resourceType: 'Procedure',
    id: 'procedure-001',
    meta: { versionId: '1', lastUpdated: '2026-02-21T09:00:00Z' },
    status: 'in-progress',
    code: { coding: [{ system: 'http://snomed.info/sct', code: '45595009', display: 'Laparoscopic cholecystectomy' }], text: 'Robotic-assisted laparoscopic cholecystectomy' },
    subject: { reference: 'Patient/patient-001', display: 'Ms. Yuki A. Nakamura' },
    encounter: { reference: 'Encounter/encounter-001' },
    performedPeriod: { start: '2026-02-21T08:30:00Z' },
    performer: [
      { actor: { reference: 'Practitioner/surgeon-001', display: 'Dr. Elena Vasquez' }, function: { coding: [{ system: 'http://snomed.info/sct', code: '304292004', display: 'Surgeon' }] } },
    ],
    location: { reference: 'Location/or-3', display: 'OR Suite 3' },
    reasonCode: [{ coding: [{ system: 'http://snomed.info/sct', code: '235919008', display: 'Cholecystitis' }] }],
    usedReference: [{ reference: 'Device/robot-arm-001', display: 'Aegis Surgical Arm' }],
  },
];

// ─── Vital Signs Stream ─────────────────────────────────────────────────────
// Default export for backward compatibility (patient-001 baseline)
export const mockVitalSigns: VitalSign[] = getPatientVitalSigns('patient-001');

// ─── Anomaly Alerts ─────────────────────────────────────────────────────────

export const mockAnomalyAlerts: AnomalyAlert[] = [
  {
    id: 'alert-001',
    severity: 'warning',
    title: 'Elevated Heart Rate',
    message: 'Heart rate trending upward — approaching upper threshold. Consider depth of anaesthesia.',
    metric: 'heart-rate',
    currentValue: 95,
    threshold: 100,
    timestamp: new Date(Date.now() - 3 * 60_000).toISOString(),
    acknowledged: false,
    source: 'vitals',
    patientId: 'patient-002',
  },
  {
    id: 'alert-002',
    severity: 'critical',
    title: 'Kinematic Deviation Detected',
    message: 'Joint 4 (wrist rotation) deviated 12.3° from planned trajectory. Robotic arm paused pending review.',
    metric: 'joint-deviation',
    currentValue: 12.3,
    threshold: 5.0,
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
    acknowledged: false,
    source: 'telemetry',
    patientId: 'patient-001',
  },
  {
    id: 'alert-003',
    severity: 'info',
    title: 'Inference Latency Spike',
    message: 'Crusoe API response time spiked to 340ms (target <200ms). Monitoring for recurrence.',
    metric: 'inference-latency',
    currentValue: 340,
    threshold: 200,
    timestamp: new Date(Date.now() - 7 * 60_000).toISOString(),
    acknowledged: true,
    source: 'inference',
    patientId: 'patient-002',
  },
];

// ─── Kinematic Frames ───────────────────────────────────────────────────────

function makeJoints(frameId: number): JointAngle[] {
  const names = ['base-rotation', 'shoulder-lift', 'elbow-flex', 'wrist-rotation', 'wrist-flex', 'gripper-pivot'];
  return names.map((name, i) => ({
    jointId: `j${i + 1}`,
    name,
    angleDeg: Math.sin(frameId * 0.02 + i) * 30 + (i * 15),
    angleRad: (Math.sin(frameId * 0.02 + i) * 30 + (i * 15)) * Math.PI / 180,
    torqueNm: Math.abs(Math.sin(frameId * 0.01 + i)) * 2.5,
    velocityRadPerSec: Math.cos(frameId * 0.03 + i) * 0.5,
  }));
}

// Module-level cooldown for mock kinematic anomalies (~30 s at 100 ms per frame)
let _lastKinematicAnomalyFrame = -Infinity;
const KINEMATIC_ANOMALY_COOLDOWN_FRAMES = 300;

export function generateKinematicFrame(frameId: number): KinematicFrame {
  // Progressive anomaly score that drifts naturally with simulated joint activity
  // instead of snapping between 0 and 0.87.
  const joints = makeJoints(frameId);
  const maxVel = Math.max(...joints.map((j) => Math.abs(j.velocityRadPerSec)), 0);
  const maxTorque = Math.max(...joints.map((j) => j.torqueNm), 0);
  // Base score 0–~0.55 derived from velocity + torque + a slow sine drift
  const drift = 0.08 * Math.sin(frameId * 0.004);  // slow ambient oscillation
  const baseScore = Math.min(maxVel / 2.0, 0.35) + Math.min(maxTorque / 8.0, 0.2) + drift + Math.random() * 0.04;

  let anomalyScore: number;
  if (frameId === 150) {
    anomalyScore = 0.87;
    _lastKinematicAnomalyFrame = frameId;
  } else if (
    Math.random() < 0.005 &&
    (frameId - _lastKinematicAnomalyFrame) >= KINEMATIC_ANOMALY_COOLDOWN_FRAMES
  ) {
    // Anomalous: boost score into 0.72–0.95 range
    anomalyScore = Math.min(Math.max(baseScore + 0.45, 0.72), 0.95);
    _lastKinematicAnomalyFrame = frameId;
  } else {
    // Normal: clamp below threshold so it still fluctuates visibly
    anomalyScore = Math.max(0, Math.min(baseScore, 0.55));
  }

  return {
    timestamp: new Date(Date.now() + frameId * 100).toISOString(),
    frameId,
    deviceId: 'robot-arm-001',
    joints,
    endEffector: {
      position: { x: Math.sin(frameId * 0.01) * 50 + 200, y: Math.cos(frameId * 0.01) * 30 + 150, z: 100 + Math.sin(frameId * 0.005) * 20 },
      orientation: { roll: Math.sin(frameId * 0.02) * 5, pitch: Math.cos(frameId * 0.02) * 3, yaw: frameId * 0.1 % 360 },
      forceN: 1.2 + Math.random() * 0.3,
      gripperApertureMm: 8 + Math.sin(frameId * 0.03) * 2,
    },
    isAnomalous: anomalyScore > 0.7,
    anomalyScore,
  };
}

export const mockKinematicFrames: KinematicFrame[] = Array.from({ length: 200 }, (_, i) => generateKinematicFrame(i));

// ─── Financial: Paid.ai Margins ─────────────────────────────────────────────

export const mockMargins: MarginData[] = [
  {
    id: 'margin-001',
    workflowName: 'Surgical Observation Pipeline',
    revenue: 125.00,
    costs: { crusoeInference: 18.40, elevenLabsVoice: 3.20, googleHaiDef: 8.50, supabaseStorage: 0.15, solanaFees: 0.003, total: 30.253 },
    margin: 94.747,
    marginPercent: 75.8,
    period: '2026-02-21',
    timestamp: '2026-02-21T09:00:00Z',
  },
  {
    id: 'margin-002',
    workflowName: 'Pre-operative Imaging Analysis',
    revenue: 85.00,
    costs: { crusoeInference: 12.60, elevenLabsVoice: 0, googleHaiDef: 22.30, supabaseStorage: 0.10, solanaFees: 0.002, total: 35.002 },
    margin: 49.998,
    marginPercent: 58.8,
    period: '2026-02-21',
    timestamp: '2026-02-21T08:00:00Z',
  },
  {
    id: 'margin-003',
    workflowName: 'Clinical Note Transcription',
    revenue: 45.00,
    costs: { crusoeInference: 4.20, elevenLabsVoice: 11.50, googleHaiDef: 0, supabaseStorage: 0.08, solanaFees: 0.001, total: 15.781 },
    margin: 29.219,
    marginPercent: 64.9,
    period: '2026-02-21',
    timestamp: '2026-02-21T07:30:00Z',
  },
];

// ─── Financial: Solana Transactions ─────────────────────────────────────────

export const mockSolanaTransactions: SolanaTransaction[] = [
  {
    signature: '5KtPn1LGuxhFiwjxErkxTb3XwEHsNL71Bv3qdG4MZkfAYUPQ9vB4R5v8jHj7d3Wn',
    blockTime: 1740130200,
    slot: 298_456_123,
    fromAddress: 'AeG1s...7xRbt',
    toAddress: 'CrUs0...9kPqm',
    amountLamports: 15000,
    amountSol: 0.000015,
    fee: 5000,
    status: 'finalized',
    isConfidential: true,
    memo: 'aegis:inference:deepseek-r1:obs-001',
    programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  },
  {
    signature: '3MjQn9HkLpGuxhFiwjxErkxTb3XwEHsNL71Bv3qdG4MZkf1YR2P',
    blockTime: 1740130260,
    slot: 298_456_189,
    fromAddress: 'AeG1s...7xRbt',
    toAddress: 'E11nL...4bStx',
    amountLamports: 8200,
    amountSol: 0.0000082,
    fee: 5000,
    status: 'finalized',
    isConfidential: true,
    memo: 'aegis:voice:scribe-v2:transcription-001',
    programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  },
  {
    signature: '7PqRs2TmNxKjYwVhCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGh',
    blockTime: 1740130320,
    slot: 298_456_245,
    fromAddress: 'AeG1s...7xRbt',
    toAddress: 'GoGL...hAiDf',
    amountLamports: 22000,
    amountSol: 0.000022,
    fee: 5000,
    status: 'confirmed',
    isConfidential: false,
    memo: 'aegis:vision:medsigLIP:dicom-scan-001',
    programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  },
];

// ─── Financial: Stripe ACP Status ───────────────────────────────────────────

export const mockACPStatus: ACPStatus = {
  networkId: 'net_aegis_hackeurope_2026',
  agentId: 'agent_aegis_surgical_001',
  status: 'active',
  lastTransactionAt: '2026-02-21T09:05:00Z',
  totalProcessed: 284750,
  currency: 'eur',
  sharedPaymentTokens: [
    { id: 'spt_001', merchantId: 'merch_crusoe_cloud', amountCents: 100000, currency: 'eur', status: 'captured', createdAt: '2026-02-21T06:00:00Z', expiresAt: '2026-02-22T06:00:00Z', scope: 'compute:inference:deepseek-r1' },
    { id: 'spt_002', merchantId: 'merch_elevenlabs', amountCents: 25000, currency: 'eur', status: 'authorized', createdAt: '2026-02-21T07:00:00Z', expiresAt: '2026-02-22T07:00:00Z', scope: 'voice:scribe-v2:transcription' },
    { id: 'spt_003', merchantId: 'merch_webots_sim', amountCents: 50000, currency: 'eur', status: 'created', createdAt: '2026-02-21T08:00:00Z', expiresAt: '2026-02-22T08:00:00Z', scope: 'simulation:surgical-arm:lease' },
  ],
};

export const mockSubscriptions: SubscriptionSummary[] = [
  { id: 'sub_001', plan: 'Surgical Assistant Agent — FTE Replacement', status: 'active', currentPeriodEnd: '2026-03-21T00:00:00Z', amountCents: 499900, currency: 'eur' },
  { id: 'sub_002', plan: 'Per-Workflow Diagnostic Fee', status: 'active', currentPeriodEnd: '2026-03-21T00:00:00Z', amountCents: 2500, currency: 'eur' },
];

// ─── Financial: Revenue Over Time ───────────────────────────────────────────

export const mockRevenueData: RevenueDataPoint[] = Array.from({ length: 24 }, (_, i) => {
  const hour = new Date('2026-02-20T10:00:00Z');
  hour.setHours(hour.getHours() + i);
  const revenue = 80 + Math.sin(i * 0.5) * 40 + Math.random() * 20;
  const costs = 20 + Math.sin(i * 0.3) * 10 + Math.random() * 8;
  return {
    timestamp: hour.toISOString(),
    revenue: Math.round(revenue * 100) / 100,
    costs: Math.round(costs * 100) / 100,
    profit: Math.round((revenue - costs) * 100) / 100,
  };
});

// ─── Financial: Paid.ai Traces ──────────────────────────────────────────────

export const mockPaidAiTraces: PaidAiTrace[] = [
  { traceId: 'trace-001', workflowId: 'surgical-obs', outcome: 'success', billedAmount: 125.00, costAmount: 30.25, startedAt: '2026-02-21T08:30:00Z', completedAt: '2026-02-21T09:00:00Z', metadata: { patient: 'patient-001', encounter: 'encounter-001' } },
  { traceId: 'trace-002', workflowId: 'preop-imaging', outcome: 'success', billedAmount: 85.00, costAmount: 35.00, startedAt: '2026-02-21T07:30:00Z', completedAt: '2026-02-21T08:00:00Z', metadata: { patient: 'patient-001', scanType: 'DICOM-CT' } },
  { traceId: 'trace-003', workflowId: 'note-transcription', outcome: 'pending', billedAmount: 0, costAmount: 5.20, startedAt: '2026-02-21T09:10:00Z', metadata: { patient: 'patient-001', source: 'scribe-v2' } },
  { traceId: 'trace-004', workflowId: 'surgical-obs', outcome: 'failure', billedAmount: 0, costAmount: 0, startedAt: '2026-02-21T09:10:30Z', completedAt: '2026-02-21T09:10:31Z', metadata: { error: 'kinematic-anomaly', patient: 'patient-001' } },
];

// ─── Compliance: EU AI Act Checklist ────────────────────────────────────────

export const mockComplianceItems: ComplianceItem[] = [
  { id: 'comp-001', category: 'transparency', requirement: 'AI System Disclosure', description: 'Clinical users must be explicitly informed they are interacting with an AI system (Art. 52)', status: 'pass', evidence: 'Banner displayed on all AI-generated outputs', lastChecked: '2026-02-21T06:00:00Z', regulation: 'eu-ai-act', riskLevel: 'high', articleReference: 'Art. 52(1)', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689' },
  { id: 'comp-002', category: 'human-oversight', requirement: 'Human-in-the-Loop Override', description: 'Human oversight mechanisms must allow intervention at any point (Annex IV §2)', status: 'pass', evidence: 'Emergency stop and override controls active on dashboard', lastChecked: '2026-02-21T06:00:00Z', regulation: 'eu-ai-act', riskLevel: 'high', articleReference: 'Annex IV §2', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689' },
  { id: 'comp-003', category: 'technical-documentation', requirement: 'Technical Documentation (Annex VII)', description: 'Comprehensive docs covering architecture, monitoring, performance metrics, risk management', status: 'pending', lastChecked: '2026-02-21T06:00:00Z', regulation: 'eu-ai-act', riskLevel: 'high', articleReference: 'Annex VII', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689' },
  { id: 'comp-004', category: 'risk-management', requirement: 'Risk Management System', description: 'Continuous risk identification, analysis, and mitigation for high-risk AI (Art. 9)', status: 'pass', evidence: 'incident.io adaptive agents monitoring continuously', lastChecked: '2026-02-21T06:00:00Z', regulation: 'eu-ai-act', riskLevel: 'high', articleReference: 'Art. 9', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689' },
  { id: 'comp-005', category: 'data-governance', requirement: 'Training Data Governance', description: 'Data quality criteria, bias detection, and representativeness requirements (Art. 10)', status: 'pass', evidence: 'Synthea synthetic data with documented generation parameters', lastChecked: '2026-02-21T06:00:00Z', regulation: 'eu-ai-act', riskLevel: 'high', articleReference: 'Art. 10', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689' },
  { id: 'comp-006', category: 'bias-monitoring', requirement: 'Bias Detection & Monitoring', description: 'Continuous monitoring for output bias and demographic fairness', status: 'pending', lastChecked: '2026-02-21T06:00:00Z', regulation: 'eu-ai-act', riskLevel: 'medium', articleReference: 'Art. 10(2)(f)', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689' },
  { id: 'comp-007', category: 'cybersecurity', requirement: 'Cybersecurity Measures', description: 'Protection against adversarial attacks, data poisoning, and model manipulation (DORA Art. 6)', status: 'pass', evidence: 'OpenShift AI namespace isolation, RBAC, encrypted etcd', lastChecked: '2026-02-21T06:00:00Z', regulation: 'dora', riskLevel: 'high', articleReference: 'DORA Art. 6', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554' },
  { id: 'comp-008', category: 'incident-reporting', requirement: 'Incident Reporting Framework', description: 'Structured incident detection, classification, and reporting per DORA Art. 19', status: 'pass', evidence: 'incident.io SLA Guardian and Incident Commander active', lastChecked: '2026-02-21T06:00:00Z', regulation: 'dora', riskLevel: 'high', articleReference: 'DORA Art. 19', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554' },
  { id: 'comp-009', category: 'third-party-management', requirement: 'ICT Third-Party Risk Management', description: 'All vendor dependencies mapped and monitored (DORA Art. 28)', status: 'pass', evidence: 'SBOM generated; Crusoe, ElevenLabs, Stripe, Solana mapped', lastChecked: '2026-02-21T06:00:00Z', regulation: 'dora', riskLevel: 'medium', articleReference: 'DORA Art. 28', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554' },
  { id: 'comp-010', category: 'model-governance', requirement: 'Model Registry & Versioning', description: 'Only validated, compliant models deployed to clinical endpoints (OpenShift AI)', status: 'pass', evidence: 'Red Hat OpenShift AI model registry with full traceability', lastChecked: '2026-02-21T06:00:00Z', regulation: 'mdr', riskLevel: 'high', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R0745' },
  { id: 'comp-011', category: 'transparency', requirement: 'GPAI Systemic Risk Obligations', description: 'Adversarial testing, risk mitigation for general-purpose AI with systemic risk (Art. 55)', status: 'pending', lastChecked: '2026-02-21T06:00:00Z', regulation: 'eu-ai-act', riskLevel: 'high', articleReference: 'Art. 55', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689' },
  { id: 'comp-012', category: 'data-governance', requirement: 'GDPR Data Protection', description: 'No real PHI used; synthetic data only; data minimisation principles applied', status: 'pass', evidence: 'All data generated via Synthea; no real patient records', lastChecked: '2026-02-21T06:00:00Z', regulation: 'gdpr', riskLevel: 'high', externalLink: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679' },
];

// ─── Compliance: incident.io Incidents ──────────────────────────────────────

export const mockIncidents: Incident[] = [
  {
    id: 'inc-001',
    title: 'Critical Kinematic Deviation — Joint 4 Wrist Rotation',
    severity: 'critical',
    status: 'investigating',
    source: 'kinematic-anomaly',
    description: 'Webots robotic arm joint 4 deviated 12.3° from planned surgical trajectory during cholecystectomy. Robotic arm automatically paused. Anomaly score: 0.87.',
    detectedAt: new Date(Date.now() - 2 * 60000).toISOString(),
    assignee: 'Dr. Elena Vasquez',
    remediationSteps: [
      'Robotic arm halted — emergency stop engaged',
      'Kinematic telemetry snapshot captured and logged',
      'DeepSeek-R1 root cause analysis initiated on Crusoe',
      'Slack notification sent to #aegis-incidents',
      'Awaiting surgeon confirmation to resume or recalibrate',
    ],
    relatedAlerts: ['alert-002'],
    impactAssessment: 'Patient safety preserved — arm halted within 50ms. No tissue contact during deviation.',
    slackChannelId: '#aegis-incidents',
    externalLink: 'https://app.incident.io/aegis-health/incidents/101',
  },
  {
    id: 'inc-002',
    title: 'Crusoe Inference API Latency Spike',
    severity: 'minor',
    status: 'resolved',
    source: 'api-latency',
    description: 'Crusoe Cloud DeepSeek-R1 endpoint latency spiked to 340ms (target <200ms). Likely due to KV cache miss. Resolved after 2 retries.',
    detectedAt: new Date(Date.now() - 17 * 60000).toISOString(),
    resolvedAt: new Date(Date.now() - 16 * 60000).toISOString(),
    remediationSteps: [
      'Automatic retry with exponential backoff triggered',
      'Request routed to secondary inference node',
      'Latency returned to 45ms after MemoryAlloy cache re-warmed',
    ],
    relatedAlerts: ['alert-003'],
    externalLink: 'https://aegis-health.pagerduty.com/incidents/Q0223A4D',
  },
  {
    id: 'inc-003',
    title: 'ElevenLabs Scribe v2 Confidence Drop',
    severity: 'minor',
    status: 'closed',
    source: 'model-drift',
    description: 'Scribe v2 transcription confidence dropped below 92% threshold during surgeon vocal note. Background noise in OR identified as cause.',
    detectedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    resolvedAt: new Date(Date.now() - 42 * 60000).toISOString(),
    remediationSteps: [
      'Noise gate threshold increased from -40dB to -35dB',
      'Transcription re-attempted with filtered audio',
      'Confidence restored to 97.2%',
    ],
    relatedAlerts: [],
    externalLink: 'https://app.incident.io/aegis-health/incidents/102',
  },
];

// ─── Compliance: Audit Trail ────────────────────────────────────────────────

export const mockAuditEntries: AuditEntry[] = [
  { id: 'audit-001', timestamp: new Date(Date.now() - 1 * 60000).toISOString(), action: 'read', resourceType: 'Patient', resourceId: 'patient-001', userId: 'surgeon-001', userRole: 'clinician', ipAddress: '10.0.1.42', outcome: 'success', phiAccessed: true, details: 'Viewed patient demographics for surgical preparation' },
  { id: 'audit-002', timestamp: new Date(Date.now() - 3 * 60000).toISOString(), action: 'read', resourceType: 'Observation', resourceId: 'obs-hr-001', userId: 'surgeon-001', userRole: 'clinician', ipAddress: '10.0.1.42', outcome: 'success', phiAccessed: true },
  { id: 'audit-003', timestamp: new Date(Date.now() - 6 * 60000).toISOString(), action: 'create', resourceType: 'Observation', resourceId: 'obs-kinematic-150', userId: 'aegis-agent', userRole: 'system', ipAddress: '10.0.1.1', outcome: 'success', phiAccessed: false, details: 'Anomaly observation auto-generated by telemetry pipeline' },
  { id: 'audit-004', timestamp: new Date(Date.now() - 14 * 60000).toISOString(), action: 'access', resourceType: 'Encounter', resourceId: 'encounter-001', userId: 'nurse-003', userRole: 'nurse', ipAddress: '10.0.1.88', outcome: 'success', phiAccessed: true },
  { id: 'audit-005', timestamp: new Date(Date.now() - 30 * 60000).toISOString(), action: 'export', resourceType: 'Patient', resourceId: 'patient-001', userId: 'admin-001', userRole: 'admin', ipAddress: '10.0.1.10', outcome: 'denied', phiAccessed: false, details: 'Export blocked — insufficient permissions for PHI bulk export' },
];

// ─── Telemetry Simulation Helpers ───────────────────────────────────────────

let _vitalTickCounter = 0;

/**
 * Physiologically realistic drift rates per LOINC code.
 * Each parameter changes at a clinically plausible speed per ~1s tick:
 *  - Heart rate: ±1–2 bpm (sympathetic/vagal tone shifts)
 *  - SpO₂: ±0.2–0.3 % (very stable under GA with controlled ventilation)
 *  - Systolic/Diastolic BP: ±1–2 mmHg (beat-to-beat variability)
 *  - EtCO₂: ±0.3–0.5 mmHg (ventilator-regulated, slow drift)
 *  - Resp rate: ±0.2–0.3 /min (ventilator-set, near-constant)
 *  - Core temperature: ±0.01–0.02 °C (thermal inertia — changes over 10–15 min)
 */
const DRIFT_CONFIG: Record<string, { maxDrift: number; trendThreshold: number; meanReversion: number }> = {
  '8867-4': { maxDrift: 1.5, trendThreshold: 1.0, meanReversion: 0.02 },  // Heart rate
  '2708-6': { maxDrift: 0.25, trendThreshold: 0.3, meanReversion: 0.05 },  // SpO₂
  '8480-6': { maxDrift: 1.5, trendThreshold: 1.5, meanReversion: 0.02 },  // Systolic BP
  '8462-4': { maxDrift: 1.0, trendThreshold: 1.0, meanReversion: 0.02 },  // Diastolic BP
  '19889-5': { maxDrift: 0.4, trendThreshold: 0.5, meanReversion: 0.03 },  // EtCO₂
  '9279-1': { maxDrift: 0.25, trendThreshold: 0.3, meanReversion: 0.04 },  // Resp rate
  '8310-5': { maxDrift: 0.015, trendThreshold: 0.05, meanReversion: 0.01 }, // Temperature
};
const DEFAULT_DRIFT = { maxDrift: 0.5, trendThreshold: 0.5, meanReversion: 0.02 };

/** Produces a new set of vital signs with physiologically realistic drift */
export function tickVitalSigns(current: VitalSign[]): VitalSign[] {
  _vitalTickCounter++;
  return current.map((v) => {
    const cfg = DRIFT_CONFIG[v.code] ?? DEFAULT_DRIFT;
    const midpoint = (v.normalRange.low + v.normalRange.high) / 2;
    const reversion = (midpoint - v.value) * cfg.meanReversion;
    const noise = (Math.random() - 0.5) * 2 * cfg.maxDrift;
    const raw = v.value + noise + reversion;
    const precision = v.code === '8310-5' ? 10 : 10;
    const newValue = Math.round(raw * precision) / precision;
    const clamped = Math.max(v.normalRange.low * 0.85, Math.min(v.normalRange.high * 1.15, newValue));
    let trend: VitalSign['trend'] = 'stable';
    if (clamped > v.value + cfg.trendThreshold) trend = 'rising';
    else if (clamped < v.value - cfg.trendThreshold) trend = 'falling';
    return { ...v, value: clamped, trend, timestamp: new Date().toISOString() };
  });
}

// ─── Anomaly cooldown state for mock mode ───────────────────────────────────
// Global cooldown across ALL alert types to prevent flooding.
const MOCK_ANOMALY_COOLDOWN_MS = 30_000;
let _lastMockAlertTimestamp = 0;

/** Simulates occasional anomaly alerts with cooldown to prevent flooding */
export function maybeGenerateAlert(vitals: VitalSign[], patientId?: string): AnomalyAlert | null {
  const now = Date.now();

  // Enforce cooldown — no new alert within 30 s of the last one
  if (now - _lastMockAlertTimestamp < MOCK_ANOMALY_COOLDOWN_MS) {
    return null;
  }

  for (const v of vitals) {
    if (v.value > v.normalRange.high) {
      _lastMockAlertTimestamp = now;
      return {
        id: `alert-auto-${now}`,
        severity: v.value > v.normalRange.high * 1.1 ? 'critical' : 'warning',
        title: `${v.display} Above Threshold`,
        message: `${v.display} at ${v.value} ${v.unit} (upper limit: ${v.normalRange.high} ${v.unit})`,
        metric: v.code,
        currentValue: v.value,
        threshold: v.normalRange.high,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        source: 'vitals',
        patientId,
      };
    }
    if (v.value < v.normalRange.low) {
      _lastMockAlertTimestamp = now;
      return {
        id: `alert-auto-${now}`,
        severity: v.value < v.normalRange.low * 0.9 ? 'critical' : 'warning',
        title: `${v.display} Below Threshold`,
        message: `${v.display} at ${v.value} ${v.unit} (lower limit: ${v.normalRange.low} ${v.unit})`,
        metric: v.code,
        currentValue: v.value,
        threshold: v.normalRange.low,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        source: 'vitals',
        patientId,
      };
    }
  }
  return null;
}
