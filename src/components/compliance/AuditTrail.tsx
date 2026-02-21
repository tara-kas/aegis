import type { AuditEntry } from '../../types/compliance';
import { ScrollText, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

interface AuditTrailProps {
  entries: AuditEntry[];
}

const ACTION_COLORS: Record<AuditEntry['action'], string> = {
  read: 'text-blue-400',
  create: 'text-green-400',
  update: 'text-yellow-400',
  delete: 'text-red-400',
  access: 'text-purple-400',
  export: 'text-orange-400',
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function AuditTrail({ entries }: AuditTrailProps) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center gap-2">
        <ScrollText className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-gray-300">PHI Access Audit Trail</h3>
        <span className="text-xs text-gray-500 ml-auto">{entries.length} entries</span>
      </div>

      <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
        {entries.map((entry) => (
          <div key={entry.id} className={`p-3 ${entry.outcome === 'denied' ? 'bg-red-950/20' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500">{formatTime(entry.timestamp)}</span>
              <span className={`text-xs font-bold uppercase ${ACTION_COLORS[entry.action] ?? 'text-gray-400'}`}>
                {entry.action}
              </span>
              <span className="text-xs text-gray-400">
                {entry.resourceType}/{entry.resourceId}
              </span>
              {entry.phiAccessed && (
                <ShieldAlert className="w-3 h-3 text-amber-500" />
              )}
              {entry.outcome === 'success' ? (
                <CheckCircle className="w-3 h-3 text-green-500 ml-auto flex-shrink-0" />
              ) : entry.outcome === 'denied' ? (
                <XCircle className="w-3 h-3 text-red-500 ml-auto flex-shrink-0" />
              ) : null}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{entry.userId} ({entry.userRole})</span>
              <span>{entry.ipAddress}</span>
            </div>
            {entry.details && <p className="text-xs text-gray-500 mt-1">{entry.details}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
