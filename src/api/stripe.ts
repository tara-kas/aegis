/**
 * Stripe Checkout Sessions Integration (Hackathon Demo Mode)
 * 
 * This module implements secure, autonomous financial settlement for the Aegis surgical agent
 * using Stripe's standard Checkout Sessions API. This is a hackathon-compatible fallback that
 * demonstrates the agent's ability to autonomously generate payment gateways without exposing
 * underlying credentials to sellers.
 * 
 * CRITICAL SECURITY REQUIREMENTS:
 * 1. Payment credentials of the buying institution are NEVER exposed in payloads
 * 2. Checkout sessions are strictly scoped to exact cart total
 * 3. Hard-coded $1000 limit enforced at application layer
 * 
 * Hackathon Logic:
 * - Uses Stripe Test Mode (sk_test_...)
 * - Generates secure Checkout Session URLs instead of SPTs
 * - Agent presents URL as proof of autonomous payment gateway provisioning
 * 
 * References:
 * - Stripe Checkout Sessions: https://docs.stripe.com/api/checkout/sessions
 * - Test Mode: https://docs.stripe.com/testing
 */

import { logger } from '../utils/logger';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Hard-coded maximum amount (in cents) for autonomous agent purchases */
export const MAX_AUTONOMOUS_PURCHASE_CENTS = 100000; // $1000.00

/** Stripe API version */
const STRIPE_API_VERSION = '2024-11-20.acacia';

/** Success URL for checkout completion */
const SUCCESS_URL = 'https://aegis.medical/checkout/success?session_id={CHECKOUT_SESSION_ID}';

/** Cancel URL for checkout cancellation */
const CANCEL_URL = 'https://aegis.medical/checkout/cancel';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StripeEnvironmentConfig {
    /** Stripe publishable key (safe to expose in client-side code) */
    publishableKey: string;
    /** Stripe secret key (server-side only, never exposed to client) */
    secretKey: string;
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
    /** Secure Checkout Session URL for customer to complete payment */
    checkoutUrl?: string;
    /** Stripe checkout session ID */
    checkoutSessionId?: string;
    /** Total amount authorized (in cents) */
    amountCents?: number;
    /** Currency of the transaction */
    currency?: string;
    /** Error message if failed */
    error?: string;
    /** Detailed error code for debugging */
    errorCode?: string;
}

export interface CompleteCheckoutRequest {
    /** The Checkout Session ID from CreateCheckoutRequest */
    checkoutSessionId: string;
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
 * StripeCheckoutClient: Implements standard Checkout Sessions for autonomous purchasing.
 * 
 * This client generates secure Checkout Session URLs to enable the surgical agent to
 * procure resources without ever handling raw payment credentials.
 */
export class StripeCheckoutClient {
    private config: StripeEnvironmentConfig;

    constructor(config: StripeEnvironmentConfig) {
        this.config = config;
    }

    /**
     * Creates a checkout session and returns a secure Checkout URL.
     * 
     * The URL is scoped to the specific cart and amount—it cannot be modified
     * by the customer, preventing unauthorized charges.
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

        logger.info('Creating Stripe Checkout Session', {
            requestId: request.requestId,
            merchantId: request.merchantId,
            totalCents,
            agentId: request.agentId,
        });

        try {
            // Call Stripe Checkout Sessions API
            // Reference: https://docs.stripe.com/api/checkout/sessions/create
            const response = await this.callStripeAPI('/v1/checkout/sessions', {
                mode: 'payment',
                line_items: request.lineItems.map(item => ({
                    price_data: {
                        currency: request.currency.toLowerCase(),
                        unit_amount: item.amountCents,
                        product_data: {
                            name: item.description,
                            metadata: item.sku ? { sku: item.sku } : {},
                        },
                    },
                    quantity: item.quantity,
                })),
                success_url: SUCCESS_URL,
                cancel_url: CANCEL_URL,
                metadata: {
                    ...request.metadata,
                    agent_id: request.agentId,
                    request_id: request.requestId,
                    merchant_id: request.merchantId,
                },
            });

            logger.info('Stripe checkout created successfully', {
                requestId: request.requestId,
                checkoutSessionId: response.id,
                checkoutUrl: response.url,
            });

            return {
                success: true,
                checkoutUrl: response.url,
                checkoutSessionId: response.id,
                amountCents: totalCents,
                currency: request.currency,
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
     * Retrieves a checkout session to verify payment status.
     * 
     * This is typically called after the customer completes payment
     * to verify the transaction succeeded.
     */
    async completeCheckout(request: CompleteCheckoutRequest): Promise<CompleteCheckoutResponse> {
        if (!request.checkoutSessionId) {
            return {
                success: false,
                error: 'checkoutSessionId is required',
            };
        }

        try {
            logger.info('Retrieving Stripe checkout session', {
                sessionId: request.checkoutSessionId,
            });

            // Retrieve the checkout session
            // Reference: https://docs.stripe.com/api/checkout/sessions/retrieve
            const response = await this.callStripeAPI(
                `/v1/checkout/sessions/${request.checkoutSessionId}`,
                {},
                'GET'
            );

            // Map Checkout Sessions API response to our response format
            const paymentStatus = response.payment_status === 'paid' ? 'succeeded' :
                response.payment_status === 'unpaid' ? 'processing' :
                    'failed';

            return {
                success: true,
                paymentIntentId: response.payment_intent,
                capturedAmountCents: response.amount_total,
                status: paymentStatus,
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
    private async callStripeAPI(endpoint: string, payload: Record<string, unknown>, method: 'GET' | 'POST' = 'POST'): Promise<any> {
        const apiEndpoint = this.config.apiEndpoint ?? 'https://api.stripe.com';
        const url = `${apiEndpoint}${endpoint}`;

        const fetchOptions: RequestInit = {
            method,
            headers: {
                'Authorization': `Bearer ${this.config.secretKey}`,
                'Content-Type': 'application/json',
                'Stripe-Version': STRIPE_API_VERSION,
            },
        };

        // Only include body for POST requests
        if (method === 'POST') {
            fetchOptions.body = JSON.stringify(payload);
        }

        const response = await fetch(url, fetchOptions);

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
 */
export function getStripeConfig(): StripeEnvironmentConfig {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const secretKey = import.meta.env.STRIPE_SECRET_KEY || '';

    if (!publishableKey) {
        logger.warn('Stripe configuration incomplete', {
            hasPublishableKey: !!publishableKey,
        });
    }

    return {
        publishableKey,
        secretKey,
    };
}

// ─── Convenience Factory ─────────────────────────────────────────────────────

/**
 * Creates a configured StripeCheckoutClient instance using environment variables.
 */
export function createStripeClient(config?: StripeEnvironmentConfig): StripeCheckoutClient {
    const finalConfig = config ?? getStripeConfig();
    return new StripeCheckoutClient(finalConfig);
}
