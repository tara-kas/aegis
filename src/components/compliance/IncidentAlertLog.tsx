import type { Incident } from '../../types/compliance';
import { AlertTriangle, ArrowUpCircle, CheckCircle, Search, Radio } from 'lucide-react';

interface IncidentAlertLogProps {
  incidents: Incident[];
  onEscalate: (id: string) => void;
}

const SEVERITY_COLORS: Record<Incident['severity'], string> = {
  critical: 'bg-red-700 text-white',
  major: 'bg-orange-700 text-white',
  minor: 'bg-yellow-700 text-yellow-100',
  informational: 'bg-blue-700 text-blue-100',
};

const STATUS_ICONS: Record<Incident['status'], typeof AlertTriangle> = {
  open: AlertTriangle,
  investigating: Search,
  mitigating: Radio,
  resolved: CheckCircle,
  closed: CheckCircle,
};

function timeSince(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export function IncidentAlertLog({ incidents, onEscalate }: IncidentAlertLogProps) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-medium text-gray-300">incident.io Alert Log</h3>
        <span className="text-xs text-gray-500 ml-auto">{incidents.length} incidents</span>
      </div>

      <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
        {incidents.map((inc) => {
          const StatusIcon = STATUS_ICONS[inc.status] ?? AlertTriangle;
          const isActive = inc.status === 'open' || inc.status === 'investigating' || inc.status === 'mitigating';

          return (
            <div key={inc.id} className={`p-4 ${isActive ? 'bg-gray-800/30' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${SEVERITY_COLORS[inc.severity]}`}>
                    {inc.severity.toUpperCase()}
                  </span>
                  <StatusIcon className={`w-4 h-4 ${isActive ? 'text-yellow-400' : 'text-gray-500'}`} />
                  <span className="text-sm text-white font-medium">{inc.title}</span>
                </div>
                {isActive && (
                  <button
                    onClick={() => onEscalate(inc.id)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-900 text-red-200 hover:bg-red-800 transition-colors flex-shrink-0"
                  >
                    <ArrowUpCircle className="w-3 h-3" />
                    Escalate
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400 mb-2">{inc.description}</p>

              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <span>Detected: {timeSince(inc.detectedAt)}</span>
                {inc.resolvedAt && <span>Resolved: {timeSince(inc.resolvedAt)}</span>}
                {inc.assignee && <span>Assignee: {inc.assignee}</span>}
                <span className="capitalize">{inc.source.replace('-', ' ')}</span>
              </div>

              {inc.remediationSteps.length > 0 && (
                <div className="bg-gray-800 rounded p-2 mt-2">
                  <span className="text-xs font-medium text-gray-400 block mb-1">Remediation Steps</span>
                  <ol className="list-decimal list-inside space-y-0.5">
                    {inc.remediationSteps.map((step, i) => (
                      <li key={i} className="text-xs text-gray-300">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {inc.impactAssessment && (
                <p className="text-xs text-green-400/70 mt-2">Impact: {inc.impactAssessment}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
