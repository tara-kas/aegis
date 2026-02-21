import type { ComplianceItem } from '../../types/compliance';
import { CheckCircle, XCircle, Clock, Minus, ShieldCheck } from 'lucide-react';

interface EUAIActChecklistProps {
  items: ComplianceItem[];
  lastAuditDate: string;
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30' },
  fail: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30' },
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  'not-applicable': { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-800' },
};

const REGULATION_BADGE: Record<string, string> = {
  'eu-ai-act': 'bg-indigo-900 text-indigo-300',
  'dora': 'bg-blue-900 text-blue-300',
  'mdr': 'bg-purple-900 text-purple-300',
  'gdpr': 'bg-green-900 text-green-300',
  'hipaa': 'bg-orange-900 text-orange-300',
};

export function EUAIActChecklist({ items, lastAuditDate }: EUAIActChecklistProps) {
  const passCount = items.filter((i) => i.status === 'pass').length;
  const failCount = items.filter((i) => i.status === 'fail').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-medium text-gray-300">Regulatory Compliance Checklist</h3>
        </div>
        <span className="text-xs text-gray-500">
          Audit: {new Date(lastAuditDate).toLocaleDateString('en-GB')}
        </span>
      </div>

      <div className="p-3 border-b border-gray-700 flex items-center gap-4">
        <span className="text-xs text-green-400">{passCount} passed</span>
        <span className="text-xs text-red-400">{failCount} failed</span>
        <span className="text-xs text-yellow-400">{pendingCount} pending</span>
        <div className="flex-1">
          <div className="w-full bg-gray-700 rounded-full h-2 flex overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${(passCount / items.length) * 100}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${(failCount / items.length) * 100}%` }} />
            <div className="bg-yellow-500 h-full" style={{ width: `${(pendingCount / items.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
        {items.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          const Icon = cfg.icon;

          return (
            <div key={item.id} className={`p-3 hover:bg-gray-800/50 transition-colors ${cfg.bg}`}>
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-medium">{item.requirement}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${REGULATION_BADGE[item.regulation] ?? 'bg-gray-700 text-gray-300'}`}>
                      {item.regulation.toUpperCase()}
                    </span>
                    {item.articleReference && (
                      <span className="text-xs text-gray-500">{item.articleReference}</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.riskLevel === 'high' ? 'bg-red-900/50 text-red-300' :
                      item.riskLevel === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {item.riskLevel} risk
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                  {item.evidence && (
                    <p className="text-xs text-green-400/70 mt-1">Evidence: {item.evidence}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
