import { mockMargins, mockSolanaTransactions, mockACPStatus, mockSubscriptions, mockRevenueData, mockPaidAiTraces } from '../mock/data';
import { MarginDisplay } from './financial/MarginDisplay';
import { SolanaTransactionFeed } from './financial/SolanaTransactionFeed';
import { StripeACPStatus } from './financial/StripeACPStatus';
import { RevenueChart } from './financial/RevenueChart';
import { Wallet, CheckCircle, XCircle, Clock } from 'lucide-react';

export function FinancialDashboard() {
  const traceStats = {
    success: mockPaidAiTraces.filter((t) => t.outcome === 'success').length,
    failure: mockPaidAiTraces.filter((t) => t.outcome === 'failure').length,
    pending: mockPaidAiTraces.filter((t) => t.outcome === 'pending').length,
    totalBilled: mockPaidAiTraces.reduce((s, t) => s + t.billedAmount, 0),
    totalCost: mockPaidAiTraces.reduce((s, t) => s + t.costAmount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-green-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Financial Dashboard</h1>
          <p className="text-sm text-gray-400">Agentic commerce, micropayments &amp; outcome-based billing</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Paid.ai Successful Traces</span>
          </div>
          <p className="text-2xl font-bold text-green-400 font-mono">{traceStats.success}</p>
          <p className="text-xs text-gray-500 mt-1">Billed: €{traceStats.totalBilled.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-400">Failed Traces (€0 billed)</span>
          </div>
          <p className="text-2xl font-bold text-red-400 font-mono">{traceStats.failure}</p>
          <p className="text-xs text-gray-500 mt-1">Anomaly-aborted workflows</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Pending Traces</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400 font-mono">{traceStats.pending}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting FHIR validation</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-aegis-400" />
            <span className="text-xs text-gray-400">Multi-vendor Costs</span>
          </div>
          <p className="text-2xl font-bold text-aegis-400 font-mono">€{traceStats.totalCost.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Crusoe + ElevenLabs + HAI-DEF + SOL</p>
        </div>
      </div>

      <RevenueChart data={mockRevenueData} timeRange="24h" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <MarginDisplay margins={mockMargins} period="24h" />
        </div>
        <div className="col-span-4">
          <SolanaTransactionFeed transactions={mockSolanaTransactions} walletAddress="AeG1s...7xRbt" />
        </div>
        <div className="col-span-4">
          <StripeACPStatus status={mockACPStatus} subscriptions={mockSubscriptions} />
        </div>
      </div>
    </div>
  );
}
