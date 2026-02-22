/** Compliance and governance types for EU AI Act, DORA, and incident.io */

export interface ComplianceItem {
  id: string;
  category: ComplianceCategory;
  requirement: string;
  description: string;
  status: 'pass' | 'fail' | 'pending' | 'not-applicable';
  evidence?: string;
  lastChecked: string;
  regulation: 'eu-ai-act' | 'dora' | 'mdr' | 'gdpr' | 'hipaa';
  riskLevel: 'high' | 'medium' | 'low';
  articleReference?: string;
  externalLink?: string;
}

export type ComplianceCategory =
  | 'transparency'
  | 'human-oversight'
  | 'data-governance'
  | 'technical-documentation'
  | 'risk-management'
  | 'cybersecurity'
  | 'incident-reporting'
  | 'third-party-management'
  | 'model-governance'
  | 'bias-monitoring';

export interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'major' | 'minor' | 'informational';
  status: 'open' | 'investigating' | 'mitigating' | 'resolved' | 'closed';
  source: 'kinematic-anomaly' | 'api-latency' | 'model-drift' | 'compliance-violation' | 'system-error';
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  assignee?: string;
  remediationSteps: string[];
  relatedAlerts: string[];
  impactAssessment?: string;
  slackChannelId?: string;
  externalLink?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'read' | 'create' | 'update' | 'delete' | 'access' | 'export';
  resourceType: string;
  resourceId: string;
  userId: string;
  userRole: string;
  ipAddress: string;
  outcome: 'success' | 'denied' | 'error';
  phiAccessed: boolean;
  details?: string;
}

export interface ComplianceScore {
  category: string;
  score: number;
  maxScore: number;
  passCount: number;
  failCount: number;
  pendingCount: number;
}

export interface SLAMetric {
  name: string;
  target: number;
  current: number;
  unit: string;
  status: 'within' | 'at-risk' | 'breached';
  windowStart: string;
  windowEnd: string;
}
