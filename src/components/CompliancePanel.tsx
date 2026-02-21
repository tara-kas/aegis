import { useState, useCallback } from 'react';
import { mockComplianceItems, mockIncidents, mockAuditEntries } from '../mock/data';
import { EUAIActChecklist } from './compliance/EUAIActChecklist';
import { IncidentAlertLog } from './compliance/IncidentAlertLog';
import { ComplianceScoreCard } from './compliance/ComplianceScoreCard';
import { AuditTrail } from './compliance/AuditTrail';
import { ShieldCheck } from 'lucide-react';
import type { ComplianceScore, Incident } from '../types/compliance';
import { logger } from '../utils/logger';

function computeScores(): ComplianceScore[] {
  const categories = [...new Set(mockComplianceItems.map((i) => i.category))];
  return categories.map((cat) => {
    const items = mockComplianceItems.filter((i) => i.category === cat);
    const passCount = items.filter((i) => i.status === 'pass').length;
    const failCount = items.filter((i) => i.status === 'fail').length;
    const pendingCount = items.filter((i) => i.status === 'pending').length;
    return {
      category: cat,
      score: passCount,
      maxScore: items.length,
      passCount,
      failCount,
      pendingCount,
    };
  });
}

export function CompliancePanel() {
  const [incidents, setIncidents] = useState<Incident[]>(mockIncidents);
  const scores = computeScores();

  const handleEscalate = useCallback((incidentId: string) => {
    logger.info('Incident escalated', { incidentId });
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId ? { ...inc, severity: 'critical' as const, status: 'mitigating' as const } : inc,
      ),
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Compliance &amp; Governance</h1>
          <p className="text-sm text-gray-400">EU AI Act, DORA, MDR — regulatory compliance &amp; incident management</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <EUAIActChecklist items={mockComplianceItems} lastAuditDate="2026-02-21T06:00:00Z" />
        </div>
        <div className="col-span-4">
          <ComplianceScoreCard scores={scores} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <IncidentAlertLog incidents={incidents} onEscalate={handleEscalate} />
        </div>
        <div className="col-span-5">
          <AuditTrail entries={mockAuditEntries} />
        </div>
      </div>
    </div>
  );
}
