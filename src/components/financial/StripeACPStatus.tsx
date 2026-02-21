import type { ACPStatus, SubscriptionSummary } from '../../types/financial';
import { CreditCard, CheckCircle, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StripeACPStatusProps {
  status: ACPStatus;
  subscriptions: SubscriptionSummary[];
  /** When true, renders skeleton placeholders instead of data */
  isLoading?: boolean;
  /** Error message — shown as an inline warning banner */
  error?: string | null;
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

const SPT_STATUS_COLORS: Record<string, string> = {
  captured: 'text-vital-green',
  authorized: 'text-alert-amber',
  created: 'text-clinical-blue',
  expired: 'text-muted-foreground',
  cancelled: 'text-destructive',
};

/** Skeleton placeholder for the Stripe panel */
function StripeSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg bg-muted p-3 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-3 w-32" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between rounded bg-muted p-2">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function StripeACPStatus({
  status,
  subscriptions,
  isLoading = false,
  error = null,
}: StripeACPStatusProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 p-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <h3 className="text-sm font-medium text-foreground/80">Stripe Agentic Commerce</h3>
        </div>
        {!isLoading && (
          <span className={`rounded px-2 py-0.5 text-xs ${
            status.status === 'active' ? 'bg-vital-green/10 text-vital-green' : 'bg-alert-amber/10 text-alert-amber'
          }`}>
            ACP {status.status}
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-alert-amber/30 bg-alert-amber/5 p-2 text-xs text-alert-amber">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}. Showing cached data.</span>
        </div>
      )}

      {isLoading ? (
        <StripeSkeleton />
      ) : (
        <div className="p-4">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <span className="text-xs text-muted-foreground">Total Processed</span>
              <p className="text-lg font-bold font-mono text-foreground">{formatCents(status.totalProcessed, status.currency)}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <span className="text-xs text-muted-foreground">Agent ID</span>
              <p className="mt-1 text-xs font-mono text-primary">{status.agentId}</p>
            </div>
          </div>

          <h4 className="mb-2 text-xs font-medium text-muted-foreground">Shared Payment Tokens</h4>
          <div className="mb-4 space-y-2">
            {status.sharedPaymentTokens.map((spt) => (
              <div key={spt.id} className="flex items-center justify-between rounded bg-muted p-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-foreground/80">{spt.id}</span>
                    <span className={`text-xs ${SPT_STATUS_COLORS[spt.status] ?? 'text-muted-foreground'}`}>{spt.status}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{spt.scope}</span>
                </div>
                <span className="text-sm font-mono text-foreground">{formatCents(spt.amountCents, spt.currency)}</span>
              </div>
            ))}
          </div>

          <h4 className="mb-2 text-xs font-medium text-muted-foreground">Subscriptions</h4>
          <div className="space-y-2">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {sub.status === 'active' ? <CheckCircle className="w-3 h-3 text-vital-green" /> :
                   sub.status === 'past_due' ? <AlertCircle className="w-3 h-3 text-destructive" /> :
                   <Clock className="w-3 h-3 text-muted-foreground" />}
                  <span className="text-foreground/80">{sub.plan}</span>
                </div>
                <span className="font-mono text-foreground">{formatCents(sub.amountCents, sub.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
