import { mockMargins, mockSolanaTransactions, mockACPStatus, mockSubscriptions, mockRevenueData, mockPaidAiTraces } from '../mock/data';
import { MarginDisplay } from './financial/MarginDisplay';
import { SolanaTransactionFeed } from './financial/SolanaTransactionFeed';
import { StripeACPStatus } from './financial/StripeACPStatus';
import { RevenueChart } from './financial/RevenueChart';
import { Wallet, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
        <Wallet className="w-6 h-6 text-vital-green" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground">Agentic commerce, micropayments &amp; outcome-based billing</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-vital-green" />
              <span className="text-xs text-muted-foreground">Paid.ai Successful Traces</span>
            </div>
            <p className="text-2xl font-bold font-mono text-vital-green">{traceStats.success}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Billed: €{traceStats.totalBilled.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Failed Traces (€0 billed)</span>
            </div>
            <p className="text-2xl font-bold font-mono text-destructive">{traceStats.failure}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Anomaly-aborted workflows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-alert-amber" />
              <span className="text-xs text-muted-foreground">Pending Traces</span>
            </div>
            <p className="text-2xl font-bold font-mono text-alert-amber">{traceStats.pending}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Awaiting FHIR validation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Multi-vendor Costs</span>
            </div>
            <p className="text-2xl font-bold font-mono text-primary">€{traceStats.totalCost.toFixed(2)}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Crusoe + ElevenLabs + HAI-DEF + SOL</p>
          </CardContent>
        </Card>
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
