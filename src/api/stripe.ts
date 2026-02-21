/**
 * Stripe Agentic Commerce Protocol (ACP) Integration
 * 
 * This module implements secure, autonomous financial settlement for the Aegis surgical agent.
 * It enables the agent to procure clinical assets (e.g., cloud compute for pre-operative planning,
 * disposable robotic attachments) using Stripe's Shared Payment Token (SPT) architecture.
 * 
 * CRITICAL SECURITY REQUIREMENTS:
 * 1. Payment credentials of the buying institution are NEVER exposed in payloads
 * 2. All SPTs are strictly scoped to exact merchant + cart total
 * 3. Hard-coded $1000 limit enforced at application layer
 * 
 * References:
 * - Stripe ACP Docs: https://docs.stripe.com/agentic-commerce/protocol
 * - Shared Payment Tokens: https://stripe.com/blog/agentic-commerce-suite
 */

import { logger } from '../utils/logger';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Hard-coded maximum amount (in cents) for autonomous agent purchases */
export const MAX_AUTONOMOUS_PURCHASE_CENTS = 100000; // $1000.00

/** Stripe API version */
const STRIPE_API_VERSION = '2024-12-18.acacia';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StripeEnvironmentConfig {
  /** Stripe publishable key (safe to expose in client-side code) */
  publishableKey: string;
  /** Stripe secret key (server-side only, never exposed to client) */
  secretKey: string;
  /** Stripe Network ID for Agentic Commerce Protocol */
  networkId: string;
  /** API endpoint (defaults to production) */
  apiEndpoint?: string;
}

export interface CheckoutLineItem {
  /** Product or service description */
  description: string;
  /** Unit price in cents */
  amountCents: number;
  /** Quantity */
  quantity: number;
  /** Optional merchant/vendor SKU */
  sku?: string;
}

export interface CreateCheckoutRequest {
  /** Unique identifier for this autonomous purchase request */
  requestId: string;
  /** Array of items being procured */
  lineItems: CheckoutLineItem[];
  /** Target merchant ID on Stripe ACP network */
  merchantId: string;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Optional metadata for audit trail */
  metadata?: Record<string, string>;
  /** Workflow or agent identifier for traceability */
  agentId: string;
}

export interface CreateCheckoutResponse {
  /** Whether the checkout request succeeded */
  success: boolean;
  /** Shared Payment Token (SPT) if successful */
  sharedPaymentToken?: string;
  /** Total amount authorized (in cents) */
  amountCents?: number;
  /** Currency of the transaction */
  currency?: string;
  /** Stripe checkout session ID */
  checkoutSessionId?: string;
  /** Expiration timestamp for the SPT */
  expiresAt?: string;
  /** Error message if failed */
  error?: string;
  /** Detailed error code for debugging */
  errorCode?: string;
}

export interface CompleteCheckoutRequest {
  /** The Shared Payment Token from CreateCheckoutRequest */
  sharedPaymentToken: string;
  /** Merchant confirmation (proof of delivery/service) */
  merchantConfirmation?: string;
}

export interface CompleteCheckoutResponse {
  /** Whether the payment was successfully completed */
  success: boolean;
  /** Stripe Payment Intent ID */
  paymentIntentId?: string;
  /** Final captured amount in cents */
  capturedAmountCents?: number;
  /** Payment status */
  status?: 'succeeded' | 'processing' | 'requires_action' | 'failed';
  /** Error message if failed */
  error?: string;
}

// ─── Failsafe Validation ─────────────────────────────────────────────────────

/**
 * Validates that a checkout request complies with all security constraints.
 * 
 * FAILSAFE CHECK 1: Ensures payment credentials are never in the payload
 * FAILSAFE CHECK 2: Enforces strict $1000 limit
 */
export function validateCheckoutRequest(request: CreateCheckoutRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Verify request contains no sensitive credential fields
  const dangerousFields = ['cardNumber', 'cvv', 'accountNumber', 'routingNumber', 'password', 'apiKey', 'secretKey'];
  const requestJson = JSON.stringify(request).toLowerCase();
  
  for (const field of dangerousFields) {
    if (requestJson.includes(field.toLowerCase())) {
      errors.push(`SECURITY VIOLATION: Payload contains prohibited field "${field}"`);
    }
  }

  // Calculate total and enforce $1000 limit
  const totalCents = request.lineItems.reduce((sum, item) => {
    return sum + (item.amountCents * item.quantity);
  }, 0);

  if (totalCents > MAX_AUTONOMOUS_PURCHASE_CENTS) {
    errors.push(
      `Amount exceeds autonomous purchase limit: $${(totalCents / 100).toFixed(2)} > $${(MAX_AUTONOMOUS_PURCHASE_CENTS / 100).toFixed(2)}`
    );
  }

  if (totalCents <= 0) {
    errors.push('Total amount must be greater than zero');
  }

  // Validate required fields
  if (!request.requestId || request.requestId.trim().length === 0) {
    errors.push('requestId is required');
  }

  if (!request.merchantId || request.merchantId.trim().length === 0) {
    errors.push('merchantId is required');
  }

  if (!request.agentId || request.agentId.trim().length === 0) {
    errors.push('agentId is required');
  }

  if (!request.currency || !request.currency.match(/^[A-Z]{3}$/)) {
    errors.push('currency must be a valid 3-letter ISO 4217 code');
  }

  if (!request.lineItems || request.lineItems.length === 0) {
    errors.push('At least one line item is required');
  }

  // Validate line items
  for (let i = 0; i < (request.lineItems?.length ?? 0); i++) {
    const item = request.lineItems[i];
    if (!item.description || item.description.trim().length === 0) {
      errors.push(`Line item ${i}: description is required`);
    }
    if (item.amountCents <= 0) {
      errors.push(`Line item ${i}: amountCents must be greater than zero`);
    }
    if (item.quantity <= 0) {
      errors.push(`Line item ${i}: quantity must be greater than zero`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─── Stripe API Client ───────────────────────────────────────────────────────

/**
 * StripeACPClient: Implements the Agentic Commerce Protocol for autonomous purchasing.
 * 
 * This client uses Shared Payment Tokens (SPT) to enable the surgical agent to
 * procure resources without ever handling raw payment credentials.
 */
export class StripeACPClient {
  private config: StripeEnvironmentConfig;

  constructor(config: StripeEnvironmentConfig) {
    this.config = config;
  }

  /**
   * Creates a checkout session and returns a Shared Payment Token (SPT).
   * 
   * The SPT is scoped to the specific merchant and amount—it cannot be used
   * for any other transaction, preventing unauthorized charges.
   * 
   * FAILSAFE: This method validates all inputs before making API calls.
   */
  async createCheckout(request: CreateCheckoutRequest): Promise<CreateCheckoutResponse> {
    // FAILSAFE VALIDATION
    const validation = validateCheckoutRequest(request);
    if (!validation.valid) {
      logger.error('Stripe checkout validation failed', {
        requestId: request.requestId,
        errors: validation.errors,
      });
      return {
        success: false,
        error: validation.errors.join('; '),
        errorCode: 'VALIDATION_FAILED',
      };
    }

    // Calculate total
    const totalCents = request.lineItems.reduce((sum, item) => sum + item.amountCents * item.quantity, 0);

    logger.info('Creating Stripe ACP checkout', {
      requestId: request.requestId,
      merchantId: request.merchantId,
      totalCents,
      agentId: request.agentId,
    });

    try {
      // In production, this would call the actual Stripe API:
      // POST https://api.stripe.com/v1/acp/checkout_sessions
      // 
      // For now, we simulate the response structure based on Stripe ACP docs
      const response = await this.callStripeAPI('/v1/acp/checkout_sessions', {
        network_id: this.config.networkId,
        merchant_id: request.merchantId,
        amount: totalCents,
        currency: request.currency,
        line_items: request.lineItems.map(item => ({
          description: item.description,
          amount: item.amountCents,
          quantity: item.quantity,
          sku: item.sku,
        })),
        metadata: {
          ...request.metadata,
          agent_id: request.agentId,
          request_id: request.requestId,
        },
      });

      logger.info('Stripe checkout created successfully', {
        requestId: request.requestId,
        checkoutSessionId: response.id,
      });

      return {
        success: true,
        sharedPaymentToken: response.shared_payment_token,
        amountCents: totalCents,
        currency: request.currency,
        checkoutSessionId: response.id,
        expiresAt: response.expires_at,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Stripe checkout failed', {
        requestId: request.requestId,
        error: message,
      });

      return {
        success: false,
        error: message,
        errorCode: 'STRIPE_API_ERROR',
      };
    }
  }

  /**
   * Completes a checkout by submitting the SPT to the merchant.
   * 
   * This is typically called after the agent receives confirmation that
   * the service/product has been delivered.
   */
  async completeCheckout(request: CompleteCheckoutRequest): Promise<CompleteCheckoutResponse> {
    if (!request.sharedPaymentToken) {
      return {
        success: false,
        error: 'sharedPaymentToken is required',
      };
    }

    try {
      logger.info('Completing Stripe checkout', {
        sptPrefix: request.sharedPaymentToken.substring(0, 12) + '...',
      });

      // In production: POST https://api.stripe.com/v1/acp/complete_checkout
      const response = await this.callStripeAPI('/v1/acp/complete_checkout', {
        shared_payment_token: request.sharedPaymentToken,
        merchant_confirmation: request.merchantConfirmation,
      });

      return {
        success: true,
        paymentIntentId: response.payment_intent_id,
        capturedAmountCents: response.amount_captured,
        status: response.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Stripe checkout completion failed', { error: message });

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Internal method to call Stripe API.
   * In production, this would use the actual Stripe SDK.
   */
  private async callStripeAPI(endpoint: string, payload: Record<string, unknown>): Promise<any> {
    const apiEndpoint = this.config.apiEndpoint ?? 'https://api.stripe.com';
    const url = `${apiEndpoint}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/json',
        'Stripe-Version': STRIPE_API_VERSION,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${errorBody}`);
    }

    return response.json();
  }
}

// ─── Environment Configuration Helper ────────────────────────────────────────

/**
 * Loads Stripe configuration from environment variables.
 * 
 * Required environment variables:
 * - VITE_STRIPE_PUBLISHABLE_KEY
 * - STRIPE_SECRET_KEY (server-side only)
 * - VITE_STRIPE_NETWORK_ID
 */
export function getStripeConfig(): StripeEnvironmentConfig {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const secretKey = import.meta.env.STRIPE_SECRET_KEY || '';
  const networkId = import.meta.env.VITE_STRIPE_NETWORK_ID;

  if (!publishableKey || !networkId) {
    logger.warn('Stripe configuration incomplete', {
      hasPublishableKey: !!publishableKey,
      hasNetworkId: !!networkId,
    });
  }

  return {
    publishableKey,
    secretKey,
    networkId,
  };
}

// ─── Convenience Factory ─────────────────────────────────────────────────────

/**
 * Creates a configured StripeACPClient instance using environment variables.
 */
export function createStripeClient(config?: StripeEnvironmentConfig): StripeACPClient {
  const finalConfig = config ?? getStripeConfig();
  return new StripeACPClient(finalConfig);
}
