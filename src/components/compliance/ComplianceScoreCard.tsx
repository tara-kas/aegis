import type { ComplianceScore } from '../../types/compliance';
import { Shield } from 'lucide-react';

interface ComplianceScoreCardProps {
  scores: ComplianceScore[];
}

function getScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'text-vital-green';
  if (pct >= 60) return 'text-alert-amber';
  return 'text-destructive';
}

function getBarColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'bg-vital-green';
  if (pct >= 60) return 'bg-alert-amber';
  return 'bg-destructive';
}

export function ComplianceScoreCard({ scores }: ComplianceScoreCardProps) {
  const totalScore = scores.reduce((s, c) => s + c.score, 0);
  const totalMax = scores.reduce((s, c) => s + c.maxScore, 0);
  const overallPct = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(0) : '0';

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 p-3">
        <Shield className="w-4 h-4 text-vital-green" />
        <h3 className="text-sm font-medium text-foreground/80">Compliance Score</h3>
      </div>

      <div className="p-4">
        <div className="mb-4 text-center">
          <p className={`text-4xl font-bold font-mono ${getScoreColor(totalScore, totalMax)}`}>
            {overallPct}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalScore}/{totalMax} checks passed
          </p>
        </div>

        <div className="space-y-3">
          {scores.map((s) => {
            const pct = s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0;
            return (
              <div key={s.category}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs capitalize text-foreground/80">{s.category.replace(/-/g, ' ')}</span>
                  <span className={`text-xs font-mono ${getScoreColor(s.score, s.maxScore)}`}>
                    {s.score}/{s.maxScore}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
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
