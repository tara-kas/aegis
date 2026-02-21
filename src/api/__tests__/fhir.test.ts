import { describe, it, expect } from 'vitest';
import type { FhirPatient, FhirEncounter, FhirObservation, FhirDevice, FhirProcedure, FhirOperationOutcome } from '../fhir';
import { mockPatients, mockEncounters, mockObservations, mockDevices, mockProcedures } from '../../mock/data';
import { validateFhirResource, isOperationOutcome, generateFhirId, createFhirMeta, formatFhirDateTime } from '../../utils/fhirValidation';

describe('FHIR R4 Resource Validation', () => {
  describe('Patient resources', () => {
    it('should validate all mock patients as valid FHIR Patient resources', () => {
      for (const patient of mockPatients) {
        const result = validateFhirResource(patient);
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
      }
    });

    it('should have correct resourceType', () => {
      for (const p of mockPatients) {
        expect(p.resourceType).toBe('Patient');
      }
    });

    it('should contain required meta with versionId and lastUpdated', () => {
      for (const p of mockPatients) {
        expect(p.meta.versionId).toBeDefined();
        expect(p.meta.lastUpdated).toBeDefined();
        expect(new Date(p.meta.lastUpdated).getTime()).not.toBeNaN();
      }
    });

    it('should have at least one identifier with system and value', () => {
      for (const p of mockPatients) {
        expect(p.identifier.length).toBeGreaterThan(0);
        for (const id of p.identifier) {
          expect(id.system).toBeTruthy();
          expect(id.value).toBeTruthy();
        }
      }
    });

    it('should detect invalid patient missing name', () => {
      const invalid = { ...mockPatients[0], name: [] } as FhirPatient;
      const result = validateFhirResource(invalid);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Patient must have at least one name');
    });
  });

  describe('Encounter resources', () => {
    it('should validate all mock encounters', () => {
      for (const enc of mockEncounters) {
        const result = validateFhirResource(enc);
        expect(result.valid).toBe(true);
      }
    });

    it('should have valid encounter class coding', () => {
      for (const enc of mockEncounters) {
        expect(enc.class.system).toBeTruthy();
        expect(enc.class.code).toBeTruthy();
      }
    });

    it('should reference a Patient subject', () => {
      for (const enc of mockEncounters) {
        expect(enc.subject.reference).toMatch(/^Patient\//);
      }
    });
  });

  describe('Observation resources', () => {
    it('should validate all mock observations', () => {
      for (const obs of mockObservations) {
        const result = validateFhirResource(obs);
        expect(result.valid).toBe(true);
      }
    });

    it('should have vital-signs category', () => {
      for (const obs of mockObservations) {
        const hasCat = obs.category.some((c) => c.coding.some((cd) => cd.code === 'vital-signs'));
        expect(hasCat).toBe(true);
      }
    });

    it('should use LOINC coding system', () => {
      for (const obs of mockObservations) {
        const hasLoinc = obs.code.coding.some((c) => c.system === 'http://loinc.org');
        expect(hasLoinc).toBe(true);
      }
    });

    it('should have valueQuantity or component', () => {
      for (const obs of mockObservations) {
        const hasValue = obs.valueQuantity !== undefined || (obs.component && obs.component.length > 0);
        expect(hasValue).toBe(true);
      }
    });
  });

  describe('Device resources', () => {
    it('should validate all mock devices', () => {
      for (const dev of mockDevices) {
        const result = validateFhirResource(dev);
        expect(result.valid).toBe(true);
      }
    });

    it('should have SNOMED-coded type', () => {
      for (const dev of mockDevices) {
        const hasSnomed = dev.type.coding.some((c) => c.system === 'http://snomed.info/sct');
        expect(hasSnomed).toBe(true);
      }
    });
  });

  describe('Procedure resources', () => {
    it('should validate all mock procedures', () => {
      for (const proc of mockProcedures) {
        const result = validateFhirResource(proc);
        expect(result.valid).toBe(true);
      }
    });

    it('should reference an Encounter', () => {
      for (const proc of mockProcedures) {
        expect(proc.encounter?.reference).toMatch(/^Encounter\//);
      }
    });
  });
});

describe('OperationOutcome helper', () => {
  it('should identify a valid OperationOutcome', () => {
    const oo: FhirOperationOutcome = {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'processing', diagnostics: 'test' }],
    };
    expect(isOperationOutcome(oo)).toBe(true);
  });

  it('should reject non-OperationOutcome objects', () => {
    expect(isOperationOutcome(null)).toBe(false);
    expect(isOperationOutcome({})).toBe(false);
    expect(isOperationOutcome({ resourceType: 'Patient' })).toBe(false);
  });
});

describe('FHIR utility functions', () => {
  it('should generate unique FHIR IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateFhirId()));
    expect(ids.size).toBe(100);
  });

  it('should create valid meta objects', () => {
    const meta = createFhirMeta('5');
    expect(meta.versionId).toBe('5');
    expect(new Date(meta.lastUpdated).getTime()).not.toBeNaN();
  });

  it('should format dates as ISO 8601', () => {
    const dt = formatFhirDateTime(new Date('2026-02-21T12:00:00Z'));
    expect(dt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
