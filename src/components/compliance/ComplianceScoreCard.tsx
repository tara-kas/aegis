import type { ComplianceScore } from '../../types/compliance';
import { Shield } from 'lucide-react';

interface ComplianceScoreCardProps {
  scores: ComplianceScore[];
}

function getScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'text-green-400';
  if (pct >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

function getBarColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function ComplianceScoreCard({ scores }: ComplianceScoreCardProps) {
  const totalScore = scores.reduce((s, c) => s + c.score, 0);
  const totalMax = scores.reduce((s, c) => s + c.maxScore, 0);
  const overallPct = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(0) : '0';

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center gap-2">
        <Shield className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-medium text-gray-300">Compliance Score</h3>
      </div>

      <div className="p-4">
        <div className="text-center mb-4">
          <p className={`text-4xl font-bold font-mono ${getScoreColor(totalScore, totalMax)}`}>
            {overallPct}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {totalScore}/{totalMax} checks passed
          </p>
        </div>

        <div className="space-y-3">
          {scores.map((s) => {
            const pct = s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0;
            return (
              <div key={s.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300 capitalize">{s.category.replace(/-/g, ' ')}</span>
                  <span className={`text-xs font-mono ${getScoreColor(s.score, s.maxScore)}`}>
                    {s.score}/{s.maxScore}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className={`h-full rounded-full ${getBarColor(s.score, s.maxScore)}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
