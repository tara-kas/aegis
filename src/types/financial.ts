/** Financial types for Stripe ACP, Solana, and Paid.ai integrations */

export interface MarginData {
  id: string;
  workflowName: string;
  revenue: number;
  costs: CostBreakdown;
  margin: number;
  marginPercent: number;
  period: string;
  timestamp: string;
}

export interface CostBreakdown {
  crusoeInference: number;
  elevenLabsVoice: number;
  googleHaiDef: number;
  supabaseStorage: number;
  solanaFees: number;
  total: number;
}

export type TimePeriod = '1h' | '6h' | '24h' | '7d' | '30d';

export interface SolanaTransaction {
  signature: string;
  blockTime: number;
  slot: number;
  fromAddress: string;
  toAddress: string;
  amountLamports: number;
  amountSol: number;
  fee: number;
  status: 'confirmed' | 'finalized' | 'failed';
  isConfidential: boolean;
  memo?: string;
  programId: string;
}

export interface ACPStatus {
  networkId: string;
  agentId: string;
  status: 'active' | 'pending' | 'suspended' | 'error';
  lastTransactionAt: string;
  totalProcessed: number;
  currency: string;
  sharedPaymentTokens: SharedPaymentToken[];
}

export interface SharedPaymentToken {
  id: string;
  merchantId: string;
  amountCents: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  scope: string;
}

export interface SubscriptionSummary {
  id: string;
  plan: string;
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  currentPeriodEnd: string;
  amountCents: number;
  currency: string;
}

export interface RevenueDataPoint {
  timestamp: string;
  revenue: number;
  costs: number;
  profit: number;
}

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

export interface PaidAiTrace {
  traceId: string;
  workflowId: string;
  outcome: 'success' | 'failure' | 'pending';
  billedAmount: number;
  costAmount: number;
  startedAt: string;
  completedAt?: string;
  metadata: Record<string, string>;
}
