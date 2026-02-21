import { useMemo } from 'react';
import { useFinancialData } from '../hooks/useFinancialData';
import { MarginDisplay } from './financial/MarginDisplay';
import { SolanaTransactionFeed } from './financial/SolanaTransactionFeed';
import { StripeACPStatus } from './financial/StripeACPStatus';
import { RevenueChart } from './financial/RevenueChart';
import { Wallet, CheckCircle, XCircle, Clock, RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FinancialDashboard() {
  const { data, loading, errors, refresh, isLive } = useFinancialData();

  const traceStats = useMemo(() => ({
    success: data.paidAiTraces.filter((t) => t.outcome === 'success').length,
    failure: data.paidAiTraces.filter((t) => t.outcome === 'failure').length,
    pending: data.paidAiTraces.filter((t) => t.outcome === 'pending').length,
    totalBilled: data.paidAiTraces.reduce((s, t) => s + t.billedAmount, 0),
    totalCost: data.paidAiTraces.reduce((s, t) => s + t.costAmount, 0),
  }), [data.paidAiTraces]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-vital-green" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Financial Dashboard</h1>
            <p className="text-sm text-muted-foreground">Agentic commerce, micropayments &amp; outcome-based billing</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
            isLive
              ? 'bg-vital-green/10 text-vital-green'
              : 'bg-alert-amber/10 text-alert-amber'
          }`}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? 'Live' : 'Mock data'}
          </span>
          <button
            onClick={refresh}
            disabled={loading.isLoading}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading.isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner — shown when any source has an error */}
      {errors.hasError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {errors.stripeError && <span className="block">Stripe: {errors.stripeError}</span>}
            {errors.solanaError && <span className="block">Solana: {errors.solanaError}</span>}
            {errors.marginsError && <span className="block">Margins: {errors.marginsError}</span>}
            <span className="block mt-1 text-muted-foreground">Showing cached / mock data as fallback.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-vital-green" />
              <span className="text-xs text-muted-foreground">Paid.ai Successful Traces</span>
            </div>
            {loading.isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <>
                <p className="text-2xl font-bold font-mono text-vital-green">{traceStats.success}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Billed: €{traceStats.totalBilled.toFixed(2)}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Failed Traces (€0 billed)</span>
            </div>
            {loading.isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <>
                <p className="text-2xl font-bold font-mono text-destructive">{traceStats.failure}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Anomaly-aborted workflows</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-alert-amber" />
              <span className="text-xs text-muted-foreground">Pending Traces</span>
            </div>
            {loading.isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <>
                <p className="text-2xl font-bold font-mono text-alert-amber">{traceStats.pending}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Awaiting FHIR validation</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Multi-vendor Costs</span>
            </div>
            {loading.isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <>
                <p className="text-2xl font-bold font-mono text-primary">€{traceStats.totalCost.toFixed(2)}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Crusoe + ElevenLabs + HAI-DEF + SOL</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <RevenueChart data={data.revenueData} timeRange="24h" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <MarginDisplay
            margins={data.margins}
            period="24h"
            isLoading={loading.marginsLoading}
            error={errors.marginsError}
          />
        </div>
        <div className="col-span-4">
          <SolanaTransactionFeed
            transactions={data.solanaTransactions}
            walletAddress="AeG1s...7xRbt"
            isLoading={loading.solanaLoading}
            error={errors.solanaError}
          />
        </div>
        <div className="col-span-4">
          <StripeACPStatus
            status={data.acpStatus}
            subscriptions={data.subscriptions}
            isLoading={loading.stripeLoading}
            error={errors.stripeError}
          />
        </div>
      </div>
    </div>
  );
}
