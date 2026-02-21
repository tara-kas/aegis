import type { MarginData, TimePeriod } from '../../types/financial';
import { TrendingUp, DollarSign } from 'lucide-react';

interface MarginDisplayProps {
  margins: MarginData[];
  period: TimePeriod;
}

function formatCurrency(cents: number): string {
  return `€${cents.toFixed(2)}`;
}

export function MarginDisplay({ margins }: MarginDisplayProps) {
  const totalRevenue = margins.reduce((s, m) => s + m.revenue, 0);
  const totalCosts = margins.reduce((s, m) => s + m.costs.total, 0);
  const avgMarginPct = margins.length ? margins.reduce((s, m) => s + m.marginPercent, 0) / margins.length : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 p-3">
        <TrendingUp className="w-4 h-4 text-vital-green" />
        <h3 className="text-sm font-medium text-foreground/80">Paid.ai Margin Tracker</h3>
      </div>

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
    </div>
  );
}
