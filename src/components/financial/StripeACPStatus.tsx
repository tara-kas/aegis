import type { ACPStatus, SubscriptionSummary } from '../../types/financial';
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface StripeACPStatusProps {
  status: ACPStatus;
  subscriptions: SubscriptionSummary[];
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

const SPT_STATUS_COLORS: Record<string, string> = {
  captured: 'text-green-400',
  authorized: 'text-yellow-400',
  created: 'text-blue-400',
  expired: 'text-gray-500',
  cancelled: 'text-red-400',
};

export function StripeACPStatus({ status, subscriptions }: StripeACPStatusProps) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-medium text-gray-300">Stripe Agentic Commerce</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${
          status.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
        }`}>
          ACP {status.status}
        </span>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <span className="text-xs text-gray-500">Total Processed</span>
            <p className="text-lg font-bold text-white font-mono">{formatCents(status.totalProcessed, status.currency)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <span className="text-xs text-gray-500">Agent ID</span>
            <p className="text-xs font-mono text-aegis-400 mt-1">{status.agentId}</p>
          </div>
        </div>

        <h4 className="text-xs font-medium text-gray-400 mb-2">Shared Payment Tokens</h4>
        <div className="space-y-2 mb-4">
          {status.sharedPaymentTokens.map((spt) => (
            <div key={spt.id} className="bg-gray-800 rounded p-2 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-300">{spt.id}</span>
                  <span className={`text-xs ${SPT_STATUS_COLORS[spt.status] ?? 'text-gray-400'}`}>{spt.status}</span>
                </div>
                <span className="text-xs text-gray-500">{spt.scope}</span>
              </div>
              <span className="text-sm font-mono text-white">{formatCents(spt.amountCents, spt.currency)}</span>
            </div>
          ))}
        </div>

        <h4 className="text-xs font-medium text-gray-400 mb-2">Subscriptions</h4>
        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {sub.status === 'active' ? <CheckCircle className="w-3 h-3 text-green-400" /> :
                 sub.status === 'past_due' ? <AlertCircle className="w-3 h-3 text-red-400" /> :
                 <Clock className="w-3 h-3 text-gray-400" />}
                <span className="text-gray-300">{sub.plan}</span>
              </div>
              <span className="font-mono text-white">{formatCents(sub.amountCents, sub.currency)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
