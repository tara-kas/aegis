/**
 * Transforms FHIR mock data into Supabase table row format.
 * Used as fallback when Supabase is empty or unreachable, so the
 * FHIR Resource pages display the same data the dashboards show.
 */

import { mockPatients, mockEncounters, mockObservations } from '@/mock/data';

export interface PatientRow {
  id: string;
  resource_type: string;
  identifier_system: string | null;
  identifier_value: string | null;
  active: boolean;
  name_family: string;
  name_given: string[] | null;
  gender: string | null;
  birth_date: string | null;
  telecom_system: string | null;
  telecom_value: string | null;
  address_line: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal_code: string | null;
  address_country: string | null;
  managing_organization: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface EncounterRow {
  id: string;
  resource_type: string;
  status: string;
  class_system: string | null;
  class_code: string;
  class_display: string | null;
  type_system: string | null;
  type_code: string | null;
  type_display: string | null;
  priority_system: string | null;
  priority_code: string | null;
  priority_display: string | null;
  subject_id: string;
  period_start: string | null;
  period_end: string | null;
  reason_text: string | null;
  location_display: string | null;
  service_provider: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  fhir_patients?: { name_family: string; name_given: string[] | null };
}

export interface ObservationRow {
  id: string;
  resource_type: string;
  status: string;
  category_system: string | null;
  category_code: string | null;
  category_display: string | null;
  code_system: string | null;
  code_code: string;
  code_display: string | null;
  subject_id: string;
  encounter_id: string | null;
  effective_datetime: string | null;
  issued: string | null;
  performer_type: string | null;
  performer_reference: string | null;
  value_quantity_value: number | null;
  value_quantity_unit: string | null;
  value_quantity_system: string | null;
  value_quantity_code: string | null;
  value_string: string | null;
  interpretation_code: string | null;
  interpretation_display: string | null;
  note: string | null;
  data_absent_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  fhir_patients?: { name_family: string; name_given: string[] | null };
}

function extractPatientId(ref: string): string {
  return ref.replace('Patient/', '');
}

function extractEncounterId(ref: string): string {
  return ref.replace('Encounter/', '');
}

export function getMockPatientRows(): PatientRow[] {
  return mockPatients.map((p) => ({
    id: p.id,
    resource_type: 'Patient',
    identifier_system: p.identifier[0]?.system ?? null,
    identifier_value: p.identifier.find((i) => i.system === 'urn:aegis:mrn')?.value ?? p.identifier[0]?.value ?? null,
    active: p.active,
    name_family: p.name[0].family,
    name_given: p.name[0].given,
    gender: p.gender,
    birth_date: p.birthDate,
    telecom_system: p.telecom?.[0]?.system ?? null,
    telecom_value: p.telecom?.[0]?.value ?? null,
    address_line: p.address?.[0]?.line?.[0] ?? null,
    address_city: p.address?.[0]?.city ?? null,
    address_state: p.address?.[0]?.state ?? null,
    address_postal_code: p.address?.[0]?.postalCode ?? null,
    address_country: p.address?.[0]?.country ?? null,
    managing_organization: null,
    created_at: p.meta?.lastUpdated ?? new Date().toISOString(),
    updated_at: p.meta?.lastUpdated ?? new Date().toISOString(),
    created_by: null,
  }));
}

export function getMockEncounterRows(): EncounterRow[] {
  return mockEncounters.map((e) => {
    const patientId = extractPatientId(e.subject.reference);
    const patient = mockPatients.find((p) => p.id === patientId);
    return {
      id: e.id,
      resource_type: 'Encounter',
      status: e.status,
      class_system: e.class.system ?? null,
      class_code: e.class.code,
      class_display: e.class.display ?? null,
      type_system: e.type?.[0]?.coding?.[0]?.system ?? null,
      type_code: e.type?.[0]?.coding?.[0]?.code ?? null,
      type_display: e.type?.[0]?.text ?? e.type?.[0]?.coding?.[0]?.display ?? null,
      priority_system: null,
      priority_code: null,
      priority_display: null,
      subject_id: patientId,
      period_start: e.period.start ?? null,
      period_end: e.period.end ?? null,
      reason_text: e.reasonCode?.[0]?.text ?? null,
      location_display: e.location?.[0]?.location?.display ?? null,
      service_provider: null,
      created_at: e.meta?.lastUpdated ?? new Date().toISOString(),
      updated_at: e.meta?.lastUpdated ?? new Date().toISOString(),
      created_by: null,
      fhir_patients: patient ? { name_family: patient.name[0].family, name_given: patient.name[0].given } : undefined,
    };
  });
}

export function getMockObservationRows(): ObservationRow[] {
  return mockObservations.map((o) => {
    const patientId = extractPatientId(o.subject.reference);
    const patient = mockPatients.find((p) => p.id === patientId);
    return {
      id: o.id,
      resource_type: 'Observation',
      status: o.status,
      category_system: o.category?.[0]?.coding?.[0]?.system ?? null,
      category_code: o.category?.[0]?.coding?.[0]?.code ?? null,
      category_display: o.category?.[0]?.coding?.[0]?.display ?? null,
      code_system: o.code.coding[0]?.system ?? null,
      code_code: o.code.coding[0]?.code ?? o.code.text ?? '',
      code_display: o.code.text ?? o.code.coding[0]?.display ?? null,
      subject_id: patientId,
      encounter_id: o.encounter ? extractEncounterId(o.encounter.reference) : null,
      effective_datetime: o.effectiveDateTime ?? null,
      issued: o.effectiveDateTime ?? null,
      performer_type: null,
      performer_reference: null,
      value_quantity_value: o.valueQuantity?.value ?? null,
      value_quantity_unit: o.valueQuantity?.unit ?? null,
      value_quantity_system: o.valueQuantity?.system ?? null,
      value_quantity_code: o.valueQuantity?.code ?? null,
      value_string: o.component ? o.component.map((c) => `${c.code?.text ?? ''}: ${c.valueQuantity?.value ?? '?'} ${c.valueQuantity?.unit ?? ''}`).join('; ') : null,
      interpretation_code: null,
      interpretation_display: null,
      note: null,
      data_absent_reason: null,
      created_at: o.meta?.lastUpdated ?? new Date().toISOString(),
      updated_at: o.meta?.lastUpdated ?? new Date().toISOString(),
      created_by: null,
      fhir_patients: patient ? { name_family: patient.name[0].family, name_given: patient.name[0].given } : undefined,
    };
  });
}
