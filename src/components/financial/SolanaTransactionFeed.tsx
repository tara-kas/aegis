import type { SolanaTransaction } from '../../types/financial';
import { Link, ShieldCheck, Eye } from 'lucide-react';

interface SolanaTransactionFeedProps {
  transactions: SolanaTransaction[];
  walletAddress: string;
}

function truncateSig(sig: string): string {
  return sig.length > 16 ? `${sig.slice(0, 8)}...${sig.slice(-8)}` : sig;
}

function formatSol(sol: number): string {
  return `◎ ${sol.toFixed(6)}`;
}

export function SolanaTransactionFeed({ transactions, walletAddress }: SolanaTransactionFeedProps) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-green-400" />
          <h3 className="text-sm font-medium text-gray-300">Solana Token-2022 Tx Feed</h3>
        </div>
        <span className="text-xs text-gray-500 font-mono">{walletAddress}</span>
      </div>

      <div className="divide-y divide-gray-800">
        {transactions.map((tx) => (
          <div key={tx.signature} className="p-3 hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Link className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-mono text-aegis-400">{truncateSig(tx.signature)}</span>
                {tx.isConfidential && (
                  <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-900 text-purple-300">
                    <ShieldCheck className="w-3 h-3" />
                    Confidential
                  </span>
                )}
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                tx.status === 'finalized' ? 'bg-green-900 text-green-300' : tx.status === 'confirmed' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'
              }`}>
                {tx.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{tx.memo ?? 'No memo'}</span>
              <span className="text-white font-mono">{formatSol(tx.amountSol)}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
              <span>Slot: {tx.slot.toLocaleString()}</span>
              <span>Fee: {tx.fee} lamports</span>
              {tx.isConfidential && (
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />Amount obscured via ZK proof</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
