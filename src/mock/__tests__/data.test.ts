import { describe, it, expect } from 'vitest';
import {
  mockPatients,
  mockEncounters,
  mockObservations,
  mockDevices,
  mockProcedures,
  mockVitalSigns,
  mockAnomalyAlerts,
  mockMargins,
  mockSolanaTransactions,
  mockACPStatus,
  mockSubscriptions,
  mockRevenueData,
  mockPaidAiTraces,
  mockComplianceItems,
  mockIncidents,
  mockAuditEntries,
  mockKinematicFrames,
  tickVitalSigns,
  maybeGenerateAlert,
  generateKinematicFrame,
  getPatientVitalSigns,
} from '../data';

describe('Mock Data Integrity', () => {
  it('should have at least 3 patients', () => {
    expect(mockPatients.length).toBeGreaterThanOrEqual(3);
  });

  it('should have at least 3 encounters', () => {
    expect(mockEncounters.length).toBeGreaterThanOrEqual(3);
  });

  it('should have observations covering vital signs', () => {
    expect(mockObservations.length).toBeGreaterThanOrEqual(5);
    const codes = mockObservations.map((o) => o.code.coding[0]?.code);
    expect(codes).toContain('8867-4'); // Heart rate
    expect(codes).toContain('2708-6'); // SpO2
  });

  it('should have at least 2 devices', () => {
    expect(mockDevices.length).toBeGreaterThanOrEqual(2);
  });

  it('should have at least 1 procedure', () => {
    expect(mockProcedures.length).toBeGreaterThanOrEqual(1);
  });

  it('should contain no real PHI — all data is synthetic', () => {
    for (const p of mockPatients) {
      expect(p.identifier.some((i) => i.system === 'urn:aegis:mrn')).toBe(true);
    }
  });

  it('should have 7 vital signs covering standard monitoring metrics', () => {
    expect(mockVitalSigns).toHaveLength(7);
    const displays = mockVitalSigns.map((v) => v.display);
    expect(displays).toContain('Heart Rate');
    expect(displays).toContain('SpO₂');
    expect(displays).toContain('Resp Rate');
  });

  it('should have initial anomaly alerts', () => {
    expect(mockAnomalyAlerts.length).toBeGreaterThanOrEqual(2);
    expect(mockAnomalyAlerts.some((a) => a.severity === 'critical')).toBe(true);
  });

  it('should generate 200 kinematic frames', () => {
    expect(mockKinematicFrames).toHaveLength(200);
    expect(mockKinematicFrames[150].isAnomalous).toBe(true);
  });
});

describe('Financial Mock Data', () => {
  it('should have margin data with correct cost breakdowns', () => {
    for (const m of mockMargins) {
      const recalcTotal = m.costs.crusoeInference + m.costs.elevenLabsVoice + m.costs.googleHaiDef + m.costs.supabaseStorage + m.costs.solanaFees;
      expect(Math.abs(m.costs.total - recalcTotal)).toBeLessThan(0.01);
    }
  });

  it('should have Solana transactions with Token-2022 program', () => {
    for (const tx of mockSolanaTransactions) {
      expect(tx.programId).toContain('Token');
      expect(tx.signature).toBeTruthy();
    }
  });

  it('should have at least one confidential transaction', () => {
    expect(mockSolanaTransactions.some((tx) => tx.isConfidential)).toBe(true);
  });

  it('should have active ACP status', () => {
    expect(mockACPStatus.status).toBe('active');
    expect(mockACPStatus.sharedPaymentTokens.length).toBeGreaterThanOrEqual(3);
  });

  it('should have subscriptions', () => {
    expect(mockSubscriptions.length).toBeGreaterThanOrEqual(2);
  });

  it('should have 24 hours of revenue data', () => {
    expect(mockRevenueData).toHaveLength(24);
    for (const d of mockRevenueData) {
      expect(d.profit).toBeCloseTo(d.revenue - d.costs, 1);
    }
  });

  it('should have Paid.ai traces with success, failure, and pending outcomes', () => {
    const outcomes = new Set(mockPaidAiTraces.map((t) => t.outcome));
    expect(outcomes.has('success')).toBe(true);
    expect(outcomes.has('failure')).toBe(true);
    expect(outcomes.has('pending')).toBe(true);
  });

  it('should bill €0 for failed traces', () => {
    const failed = mockPaidAiTraces.filter((t) => t.outcome === 'failure');
    for (const t of failed) {
      expect(t.billedAmount).toBe(0);
    }
  });
});

describe('Compliance Mock Data', () => {
  it('should have items from multiple regulations', () => {
    const regs = new Set(mockComplianceItems.map((i) => i.regulation));
    expect(regs.has('eu-ai-act')).toBe(true);
    expect(regs.has('dora')).toBe(true);
  });

  it('should have at least 10 compliance items', () => {
    expect(mockComplianceItems.length).toBeGreaterThanOrEqual(10);
  });

  it('should have incidents with remediation steps', () => {
    for (const inc of mockIncidents) {
      expect(inc.remediationSteps.length).toBeGreaterThan(0);
    }
  });

  it('should have audit entries with PHI access flags', () => {
    expect(mockAuditEntries.some((e) => e.phiAccessed)).toBe(true);
    expect(mockAuditEntries.some((e) => e.outcome === 'denied')).toBe(true);
  });
});

describe('Telemetry Simulation', () => {
  it('tickVitalSigns should drift values realistically', () => {
    const initial = [...mockVitalSigns];
    const ticked = tickVitalSigns(initial);
    expect(ticked).toHaveLength(initial.length);
    for (let i = 0; i < ticked.length; i++) {
      expect(Math.abs(ticked[i].value - initial[i].value)).toBeLessThan(5);
      expect(['rising', 'falling', 'stable']).toContain(ticked[i].trend);
    }
  });

  it('maybeGenerateAlert should return null for normal vitals', () => {
    const normal = mockVitalSigns.map((v) => ({
      ...v,
      value: (v.normalRange.low + v.normalRange.high) / 2,
    }));
    expect(maybeGenerateAlert(normal)).toBeNull();
  });

  it('maybeGenerateAlert should trigger for out-of-range vitals', () => {
    const abnormal = mockVitalSigns.map((v) => ({
      ...v,
      value: v.normalRange.high * 1.2,
    }));
    const alert = maybeGenerateAlert(abnormal);
    expect(alert).not.toBeNull();
    expect(['critical', 'warning']).toContain(alert!.severity);
  });

  it('generateKinematicFrame should create valid frames', () => {
    const frame = generateKinematicFrame(42);
    expect(frame.frameId).toBe(42);
    expect(frame.joints).toHaveLength(6);
    expect(frame.deviceId).toBe('robot-arm-001');
    expect(frame.endEffector.position).toHaveProperty('x');
    expect(frame.endEffector.position).toHaveProperty('y');
    expect(frame.endEffector.position).toHaveProperty('z');
  });

  it('generateKinematicFrame should flag anomaly at frame 150', () => {
    const frame = generateKinematicFrame(150);
    expect(frame.isAnomalous).toBe(true);
    expect(frame.anomalyScore).toBeGreaterThan(0.7);
  });

  it('getPatientVitalSigns should return 7 vitals for any patient', () => {
    const vitals = getPatientVitalSigns('patient-001');
    expect(vitals).toHaveLength(7);
    const displays = vitals.map((v) => v.display);
    expect(displays).toContain('Heart Rate');
    expect(displays).toContain('SpO\u2082');
    expect(displays).toContain('Resp Rate');
  });

  it('getPatientVitalSigns should produce distinct baselines per patient', () => {
    const vitalsA = getPatientVitalSigns('patient-001');
    const vitalsB = getPatientVitalSigns('patient-002');
    const vitalsC = getPatientVitalSigns('patient-003');

    const hrA = vitalsA.find((v) => v.code === '8867-4')!.value;
    const hrB = vitalsB.find((v) => v.code === '8867-4')!.value;
    const hrC = vitalsC.find((v) => v.code === '8867-4')!.value;

    // Patient A: ~67 bpm, Patient B: ~112 bpm, Patient C: ~87 bpm — all different
    expect(hrA).not.toBe(hrB);
    expect(hrB).not.toBe(hrC);
    expect(hrA).toBeLessThan(75);    // Patient A is low-normal
    expect(hrB).toBeGreaterThan(105); // Patient B is tachycardic
    expect(hrC).toBeGreaterThan(80);  // Patient C is moderate
    expect(hrC).toBeLessThan(95);
  });

  it('getPatientVitalSigns should produce deterministic baselines for unknown patients', () => {
    const vitals1 = getPatientVitalSigns('patient-999');
    const vitals2 = getPatientVitalSigns('patient-999');
    // Same patient ID should yield same baseline values
    for (let i = 0; i < vitals1.length; i++) {
      expect(vitals1[i].value).toBe(vitals2[i].value);
    }
  });
});
