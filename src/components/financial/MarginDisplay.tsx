import { useMemo } from 'react';
import type { MarginData, TimePeriod } from '../../types/financial';
import { TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MarginDisplayProps {
  margins: MarginData[];
  period: TimePeriod;
  /** When true, renders skeleton placeholders instead of data */
  isLoading?: boolean;
  /** Error message — shown as an inline warning banner */
  error?: string | null;
}

function formatCurrency(cents: number): string {
  return `€${cents.toFixed(2)}`;
}

/** Skeleton placeholder for the entire margin panel */
function MarginSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg bg-muted p-3 text-center space-y-2">
            <Skeleton className="h-3 w-14 mx-auto" />
            <Skeleton className="h-6 w-20 mx-auto" />
          </div>
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg bg-muted p-3 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarginDisplay({ margins, isLoading = false, error = null }: MarginDisplayProps) {
  const { totalRevenue, totalCosts, avgMarginPct } = useMemo(() => {
    const rev = margins.reduce((s, m) => s + m.revenue, 0);
    const cost = margins.reduce((s, m) => s + m.costs.total, 0);
    const pct = margins.length
      ? margins.reduce((s, m) => s + m.marginPercent, 0) / margins.length
      : 0;
    return { totalRevenue: rev, totalCosts: cost, avgMarginPct: pct };
  }, [margins]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 p-3">
        <TrendingUp className="w-4 h-4 text-vital-green" />
        <h3 className="text-sm font-medium text-foreground/80">Paid.ai Margin Tracker</h3>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error} — showing fallback data.</span>
        </div>
      )}

      {isLoading ? (
        <MarginSkeleton />
      ) : (
        <div className="p-4">
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-muted p-3 text-center">
              <span className="text-xs text-muted-foreground">Revenue</span>
              <p className="text-xl font-bold font-mono text-vital-green">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <span className="text-xs text-muted-foreground">Costs</span>
              <p className="text-xl font-bold font-mono text-destructive">{formatCurrency(totalCosts)}</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <span className="text-xs text-muted-foreground">Net Margin</span>
              <p className="text-xl font-bold font-mono text-primary">{avgMarginPct.toFixed(1)}%</p>
            </div>
          </div>

          <div className="space-y-3">
            {margins.map((m) => (
              <div key={m.id} className="rounded-lg bg-muted p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{m.workflowName}</span>
                  <span className="text-xs font-mono text-vital-green">{formatCurrency(m.margin)}</span>
                </div>
                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted-foreground/20">
                  <div className="h-full rounded-full bg-vital-green" style={{ width: `${m.marginPercent}%` }} />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {m.costs.crusoeInference > 0 && <span>Crusoe: {formatCurrency(m.costs.crusoeInference)}</span>}
                  {m.costs.elevenLabsVoice > 0 && <span>ElevenLabs: {formatCurrency(m.costs.elevenLabsVoice)}</span>}
                  {m.costs.googleHaiDef > 0 && <span>HAI-DEF: {formatCurrency(m.costs.googleHaiDef)}</span>}
                  {m.costs.supabaseStorage > 0 && <span>Supabase: {formatCurrency(m.costs.supabaseStorage)}</span>}
                  {m.costs.solanaFees > 0 && <span><DollarSign className="inline w-3 h-3" />SOL: {formatCurrency(m.costs.solanaFees)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
