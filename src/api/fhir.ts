/**
 * FHIR R4 Resource Type Definitions for Aegis
 *
 * Strict HL7 FHIR R4 types covering the surgical monitoring domain.
 * References: https://www.hl7.org/fhir/R4/
 */

// ─── Primitive & Complex FHIR Types ──────────────────────────────────────────

export interface FhirMeta {
  versionId: string;
  lastUpdated: string;
  source?: string;
  profile?: string[];
}

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  system: string;
  value: string;
}

export interface FhirCoding {
  system: string;
  code: string;
  display: string;
}

export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

export interface FhirQuantity {
  value: number;
  unit: string;
  system: string;
  code: string;
}

export interface FhirPeriod {
  start: string;
  end?: string;
}

export interface FhirReference {
  reference: string;
  display?: string;
}

export interface FhirHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  family: string;
  given: string[];
  prefix?: string[];
  suffix?: string[];
}

export interface FhirContactPoint {
  system: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
}

export interface FhirAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  line?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// ─── OperationOutcome (FHIR error responses) ────────────────────────────────

export interface FhirOperationOutcomeIssue {
  severity: 'fatal' | 'error' | 'warning' | 'information';
  code: string;
  diagnostics?: string;
  details?: FhirCodeableConcept;
  location?: string[];
}

export interface FhirOperationOutcome {
  resourceType: 'OperationOutcome';
  id?: string;
  meta?: FhirMeta;
  issue: FhirOperationOutcomeIssue[];
}

// ─── Patient Resource ────────────────────────────────────────────────────────

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  meta: FhirMeta;
  identifier: FhirIdentifier[];
  active: boolean;
  name: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  address?: FhirAddress[];
  maritalStatus?: FhirCodeableConcept;
  communication?: Array<{
    language: FhirCodeableConcept;
    preferred?: boolean;
  }>;
}

// ─── Encounter Resource ──────────────────────────────────────────────────────

export interface FhirEncounterParticipant {
  type?: FhirCodeableConcept[];
  individual: FhirReference;
}

export interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  meta: FhirMeta;
  identifier?: FhirIdentifier[];
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  class: FhirCoding;
  type?: FhirCodeableConcept[];
  subject: FhirReference;
  participant?: FhirEncounterParticipant[];
  period: FhirPeriod;
  reasonCode?: FhirCodeableConcept[];
  diagnosis?: Array<{
    condition: FhirReference;
    use?: FhirCodeableConcept;
    rank?: number;
  }>;
  location?: Array<{
    location: FhirReference;
    status?: string;
  }>;
}

// ─── Observation Resource (Vital Signs + Telemetry) ──────────────────────────

export interface FhirObservationComponent {
  code: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  valueCodeableConcept?: FhirCodeableConcept;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  meta: FhirMeta;
  identifier?: FhirIdentifier[];
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime: string;
  issued?: string;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  valueCodeableConcept?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  note?: Array<{ text: string }>;
  device?: FhirReference;
  referenceRange?: Array<{
    low?: FhirQuantity;
    high?: FhirQuantity;
    type?: FhirCodeableConcept;
    text?: string;
  }>;
  component?: FhirObservationComponent[];
}

// ─── Device Resource ─────────────────────────────────────────────────────────

export interface FhirDeviceName {
  name: string;
  type: 'udi-label-name' | 'user-friendly-name' | 'patient-reported-name' | 'manufacturer-name' | 'model-name' | 'other';
}

export interface FhirDevice {
  resourceType: 'Device';
  id: string;
  meta: FhirMeta;
  identifier?: FhirIdentifier[];
  status: 'active' | 'inactive' | 'entered-in-error' | 'unknown';
  deviceName: FhirDeviceName[];
  type: FhirCodeableConcept;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  version?: Array<{ value: string }>;
  patient?: FhirReference;
  owner?: FhirReference;
  location?: FhirReference;
}

// ─── Procedure Resource ──────────────────────────────────────────────────────

export interface FhirProcedurePerformer {
  actor: FhirReference;
  function?: FhirCodeableConcept;
}

export interface FhirProcedure {
  resourceType: 'Procedure';
  id: string;
  meta: FhirMeta;
  identifier?: FhirIdentifier[];
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown';
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  performedPeriod?: FhirPeriod;
  performer?: FhirProcedurePerformer[];
  location?: FhirReference;
  reasonCode?: FhirCodeableConcept[];
  bodySite?: FhirCodeableConcept[];
  outcome?: FhirCodeableConcept;
  note?: Array<{ text: string }>;
  usedReference?: FhirReference[];
}

// ─── FHIR Bundle (for search results) ───────────────────────────────────────

export interface FhirBundleEntry<T> {
  fullUrl?: string;
  resource: T;
}

export interface FhirBundle<T> {
  resourceType: 'Bundle';
  id?: string;
  meta?: FhirMeta;
  type: 'searchset' | 'batch' | 'transaction' | 'collection';
  total?: number;
  entry?: FhirBundleEntry<T>[];
}

// ─── FHIR REST API Types ────────────────────────────────────────────────────

export type FhirResource = FhirPatient | FhirEncounter | FhirObservation | FhirDevice | FhirProcedure;

export interface FhirSearchParams {
  _count?: number;
  _offset?: number;
  _sort?: string;
  _include?: string;
  [key: string]: string | number | undefined;
}

// ─── FHIR API Client ────────────────────────────────────────────────────────

const FHIR_BASE = '/fhir/R4';

function buildOperationOutcome(
  severity: FhirOperationOutcomeIssue['severity'],
  code: string,
  diagnostics: string,
): FhirOperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    issue: [{ severity, code, diagnostics }],
  };
}

async function fhirFetch<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${FHIR_BASE}${path}`, {
      headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
      ...init,
    });
    if (!response.ok) {
      const outcome = buildOperationOutcome('error', 'processing', `HTTP ${response.status}: ${response.statusText}`);
      throw outcome;
    }
    return response.json();
  } catch (error) {
    if ((error as FhirOperationOutcome).resourceType === 'OperationOutcome') throw error;
    throw buildOperationOutcome('fatal', 'transient', `Network error: ${(error as Error).message}`);
  }
}

export const fhirApi = {
  getPatient: (id: string) => fhirFetch<FhirPatient>(`/Patient/${id}`),
  searchPatients: (params?: FhirSearchParams) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fhirFetch<FhirBundle<FhirPatient>>(`/Patient${qs}`);
  },

  getEncounter: (id: string) => fhirFetch<FhirEncounter>(`/Encounter/${id}`),
  searchEncounters: (params?: FhirSearchParams) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fhirFetch<FhirBundle<FhirEncounter>>(`/Encounter${qs}`);
  },

  getObservation: (id: string) => fhirFetch<FhirObservation>(`/Observation/${id}`),
  searchObservations: (params?: FhirSearchParams) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fhirFetch<FhirBundle<FhirObservation>>(`/Observation${qs}`);
  },

  getDevice: (id: string) => fhirFetch<FhirDevice>(`/Device/${id}`),

  getProcedure: (id: string) => fhirFetch<FhirProcedure>(`/Procedure/${id}`),
  searchProcedures: (params?: FhirSearchParams) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return fhirFetch<FhirBundle<FhirProcedure>>(`/Procedure${qs}`);
  },

  createObservation: (observation: Omit<FhirObservation, 'id' | 'meta'>) =>
    fhirFetch<FhirObservation>('/Observation', {
      method: 'POST',
      body: JSON.stringify(observation),
    }),
};
