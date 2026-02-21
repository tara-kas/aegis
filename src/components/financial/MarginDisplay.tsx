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
  const totalMargin = totalRevenue - totalCosts;
  const avgMarginPct = margins.length ? margins.reduce((s, m) => s + m.marginPercent, 0) / margins.length : 0;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-medium text-gray-300">Paid.ai Margin Tracker</h3>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <span className="text-xs text-gray-500">Revenue</span>
            <p className="text-xl font-bold text-green-400 font-mono">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <span className="text-xs text-gray-500">Costs</span>
            <p className="text-xl font-bold text-red-400 font-mono">{formatCurrency(totalCosts)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <span className="text-xs text-gray-500">Net Margin</span>
            <p className="text-xl font-bold text-aegis-400 font-mono">{avgMarginPct.toFixed(1)}%</p>
          </div>
        </div>

        <div className="space-y-3">
          {margins.map((m) => (
            <div key={m.id} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white font-medium">{m.workflowName}</span>
                <span className="text-xs font-mono text-green-400">{formatCurrency(m.margin)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${m.marginPercent}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                {m.costs.crusoeInference > 0 && <span>Crusoe: {formatCurrency(m.costs.crusoeInference)}</span>}
                {m.costs.elevenLabsVoice > 0 && <span>ElevenLabs: {formatCurrency(m.costs.elevenLabsVoice)}</span>}
                {m.costs.googleHaiDef > 0 && <span>HAI-DEF: {formatCurrency(m.costs.googleHaiDef)}</span>}
                {m.costs.supabaseStorage > 0 && <span>Supabase: {formatCurrency(m.costs.supabaseStorage)}</span>}
                {m.costs.solanaFees > 0 && <span><DollarSign className="w-3 h-3 inline" />SOL: {formatCurrency(m.costs.solanaFees)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
