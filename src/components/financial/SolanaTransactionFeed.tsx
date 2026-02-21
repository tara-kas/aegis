import type { SolanaTransaction } from '../../types/financial';
import { Link, ShieldCheck, Eye, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SolanaTransactionFeedProps {
  transactions: SolanaTransaction[];
  walletAddress: string;
  /** When true, renders skeleton placeholders instead of data */
  isLoading?: boolean;
  /** Error message — shown as an inline warning banner */
  error?: string | null;
}

function truncateSig(sig: string): string {
  return sig.length > 16 ? `${sig.slice(0, 8)}...${sig.slice(-8)}` : sig;
}

function formatSol(sol: number): string {
  return `◎ ${sol.toFixed(6)}`;
}

/** Skeleton placeholder for transaction rows */
function TransactionSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SolanaTransactionFeed({
  transactions,
  walletAddress,
  isLoading = false,
  error = null,
}: SolanaTransactionFeedProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 p-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-gradient-to-r from-purple-500 to-green-400" />
          <h3 className="text-sm font-medium text-foreground/80">Solana Token-2022 Tx Feed</h3>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{walletAddress}</span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-md border border-alert-amber/30 bg-alert-amber/5 p-2 text-xs text-alert-amber">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Devnet slow or unreachable — {error}. Showing cached data.</span>
        </div>
      )}

      {isLoading ? (
        <TransactionSkeleton />
      ) : (
        <div className="divide-y divide-border">
          {transactions.map((tx) => (
            <div key={tx.signature} className="p-3 transition-colors hover:bg-muted/50">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono text-primary">{truncateSig(tx.signature)}</span>
                  {tx.isConfidential && (
                    <span className="flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-xs text-purple-500 dark:text-purple-400">
                      <ShieldCheck className="w-3 h-3" />
                      Confidential
                    </span>
                  )}
                </div>
                <span className={`rounded px-1.5 py-0.5 text-xs ${
                  tx.status === 'finalized' ? 'bg-vital-green/10 text-vital-green' : tx.status === 'confirmed' ? 'bg-alert-amber/10 text-alert-amber' : 'bg-destructive/10 text-destructive'
                }`}>
                  {tx.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{tx.memo ?? 'No memo'}</span>
                <span className="font-mono text-foreground">{formatSol(tx.amountSol)}</span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground/60">
                <span>Slot: {tx.slot.toLocaleString()}</span>
                <span>Fee: {tx.fee} lamports</span>
                {tx.isConfidential && (
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />Amount obscured via ZK proof</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
