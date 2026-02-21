import type { FhirResource, FhirOperationOutcome } from '../api/fhir';

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateFhirResource(resource: FhirResource): ValidationResult {
  const issues: string[] = [];

  if (!resource.resourceType) issues.push('Missing resourceType');
  if (!resource.id) issues.push('Missing resource id');
  if (!resource.meta?.versionId) issues.push('Missing meta.versionId');
  if (!resource.meta?.lastUpdated) issues.push('Missing meta.lastUpdated');

  switch (resource.resourceType) {
    case 'Patient':
      if (!resource.name?.length) issues.push('Patient must have at least one name');
      if (!resource.gender) issues.push('Patient must have a gender');
      if (!resource.birthDate) issues.push('Patient must have a birthDate');
      if (!resource.identifier?.length) issues.push('Patient must have at least one identifier');
      break;

    case 'Encounter':
      if (!resource.status) issues.push('Encounter must have a status');
      if (!resource.class) issues.push('Encounter must have a class');
      if (!resource.subject?.reference) issues.push('Encounter must reference a subject');
      if (!resource.period?.start) issues.push('Encounter must have a period start');
      break;

    case 'Observation':
      if (!resource.status) issues.push('Observation must have a status');
      if (!resource.code?.coding?.length) issues.push('Observation must have a code with coding');
      if (!resource.subject?.reference) issues.push('Observation must reference a subject');
      if (!resource.effectiveDateTime) issues.push('Observation must have an effectiveDateTime');
      if (!resource.category?.length) issues.push('Observation must have at least one category');
      break;

    case 'Device':
      if (!resource.status) issues.push('Device must have a status');
      if (!resource.type?.coding?.length) issues.push('Device must have a type');
      if (!resource.deviceName?.length) issues.push('Device must have at least one deviceName');
      break;

    case 'Procedure':
      if (!resource.status) issues.push('Procedure must have a status');
      if (!resource.code?.coding?.length) issues.push('Procedure must have a code');
      if (!resource.subject?.reference) issues.push('Procedure must reference a subject');
      break;
  }

  return { valid: issues.length === 0, issues };
}

export function isOperationOutcome(value: unknown): value is FhirOperationOutcome {
  return typeof value === 'object' && value !== null && (value as FhirOperationOutcome).resourceType === 'OperationOutcome';
}

export function formatFhirDateTime(date: Date = new Date()): string {
  return date.toISOString();
}

export function generateFhirId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createFhirMeta(versionId = '1') {
  return {
    versionId,
    lastUpdated: formatFhirDateTime(),
  };
}
