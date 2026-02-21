/**
 * Unit Tests for Stripe Checkout Sessions Integration (Hackathon Demo Mode)
 * 
 * These tests verify:
 * 1. FAILSAFE CHECK 1: Payment credentials are never exposed in payloads
 * 2. FAILSAFE CHECK 2: $1000 limit is strictly enforced
 * 3. Checkout Session URL is correctly returned
 * 4. Validation logic prevents malformed requests
 * 
 * All Stripe API calls are mocked to ensure tests run without network dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    StripeCheckoutClient,
    validateCheckoutRequest,
    MAX_AUTONOMOUS_PURCHASE_CENTS,
    type CreateCheckoutRequest,
    type CheckoutLineItem,
    type StripeEnvironmentConfig,
} from '../stripe';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const mockConfig: StripeEnvironmentConfig = {
    publishableKey: 'pk_test_mockPublishableKeyForTestingOnly123456789',
    secretKey: 'sk_test_mockSecretKeyForTestingOnly123456789',
};

const validLineItems: LineItem[] = [
    {
        description: 'AWS Cloud Compute - Pre-operative Planning',
        amountCents: 50000, // $500
        quantity: 1,
        sku: 'CLOUD-COMPUTE-001',
    },
    {
        description: 'Disposable Robotic Attachment - Da Vinci Tool',
        amountCents: 25000, // $250
        quantity: 2,
        sku: 'ROBOT-ATTACH-DV-002',
    },
];

const validCheckoutRequest: CreateCheckoutRequest = {
    requestId: 'req_aegis_20260221_001',
    lineItems: validLineItems,
    merchantId: 'merchant_surgical_supply_co',
    currency: 'USD',
    agentId: 'aegis-surgical-agent-v1',
    metadata: {
        hospitalId: 'hosp_beth_israel',
        procedureType: 'robotic_laparoscopy',
        urgency: 'routine',
    },
};

// ─── Mock Stripe API Responses ───────────────────────────────────────────────

const mockSuccessfulCheckoutResponse = {
    id: 'cs_test_mock_checkout_session_123',
    url: 'https://checkout.stripe.com/c/pay/cs_test_mock_checkout_session_123#fidkdWxOYHw...',
    amount_total: 100000, // Should match the total from validLineItems
    currency: 'usd',
    status: 'open',
    payment_status: 'unpaid',
};

const mockSuccessfulCompleteResponse = {
    id: 'cs_test_mock_checkout_session_123',
    payment_intent: 'pi_test_mock_payment_intent_456',
    amount_total: 100000,
    payment_status: 'paid' as const,
    status: 'complete' as const,
};

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('Stripe ACP Module', () => {
    describe('validateCheckoutRequest', () => {
        it('should accept a valid checkout request', () => {
            const result = validateCheckoutRequest(validCheckoutRequest);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('FAILSAFE CHECK 2: should reject requests exceeding $1000 limit', () => {
            const overLimitRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                lineItems: [
                    {
                        description: 'Expensive Cloud Cluster',
                        amountCents: 150000, // $1500 - exceeds $1000 limit
                        quantity: 1,
                    },
                ],
            };

            const result = validateCheckoutRequest(overLimitRequest);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain(
                'Amount exceeds autonomous purchase limit: $1500.00 > $1000.00'
            );
        });

        it('FAILSAFE CHECK 2: should accept requests exactly at $1000 limit', () => {
            const atLimitRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                lineItems: [
                    {
                        description: 'Maximum Allowed Purchase',
                        amountCents: MAX_AUTONOMOUS_PURCHASE_CENTS, // Exactly $1000
                        quantity: 1,
                    },
                ],
            };

            const result = validateCheckoutRequest(atLimitRequest);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('FAILSAFE CHECK 2: should correctly calculate total across multiple line items', () => {
            const multiItemRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                lineItems: [
                    { description: 'Item A', amountCents: 40000, quantity: 2 }, // $800
                    { description: 'Item B', amountCents: 20100, quantity: 1 }, // $201
                ],
            };
            // Total: $1001 - should fail

            const result = validateCheckoutRequest(multiItemRequest);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('exceeds autonomous purchase limit'))).toBe(true);
        });

        it('FAILSAFE CHECK 1: should detect prohibited credential fields in payload', () => {
            const dangerousRequest = {
                ...validCheckoutRequest,
                metadata: {
                    ...validCheckoutRequest.metadata,
                    cardNumber: '4242424242424242', // Dangerous!
                },
            } as CreateCheckoutRequest;

            const result = validateCheckoutRequest(dangerousRequest);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('SECURITY VIOLATION'))).toBe(true);
            expect(result.errors.some(e => e.includes('cardNumber'))).toBe(true);
        });

        it('FAILSAFE CHECK 1: should detect multiple prohibited fields', () => {
            const multiDangerousRequest = {
                ...validCheckoutRequest,
                lineItems: [
                    {
                        description: 'Test',
                        amountCents: 1000,
                        quantity: 1,
                        cvv: '123',
                        apiKey: 'secret_key_123',
                    } as CheckoutLineItem,
                ],
            };

            const result = validateCheckoutRequest(multiDangerousRequest);
            expect(result.valid).toBe(false);
            expect(result.errors.filter(e => e.includes('SECURITY VIOLATION')).length).toBeGreaterThanOrEqual(2);
        });

        it('should reject requests with zero or negative amounts', () => {
            const zeroAmountRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                lineItems: [{ description: 'Free item', amountCents: 0, quantity: 1 }],
            };

            const result = validateCheckoutRequest(zeroAmountRequest);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Total amount must be greater than zero'))).toBe(true);
        });

        it('should reject requests with missing required fields', () => {
            const missingFieldsRequest = {
                ...validCheckoutRequest,
                requestId: '',
                merchantId: '',
                agentId: '',
            };

            const result = validateCheckoutRequest(missingFieldsRequest);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('requestId is required');
            expect(result.errors).toContain('merchantId is required');
            expect(result.errors).toContain('agentId is required');
        });

        it('should reject requests with invalid currency codes', () => {
            const invalidCurrencyRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                currency: 'US', // Should be 3 letters
            };

            const result = validateCheckoutRequest(invalidCurrencyRequest);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('currency must be a valid 3-letter ISO 4217 code'))).toBe(true);
        });

        it('should reject requests with empty line items', () => {
            const emptyItemsRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                lineItems: [],
            };

            const result = validateCheckoutRequest(emptyItemsRequest);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('At least one line item is required');
        });

        it('should validate individual line item fields', () => {
            const invalidLineItemsRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                lineItems: [
                    { description: '', amountCents: -100, quantity: 0 },
                ],
            };

            const result = validateCheckoutRequest(invalidLineItemsRequest);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Line item 0: description is required');
            expect(result.errors).toContain('Line item 0: amountCents must be greater than zero');
            expect(result.errors).toContain('Line item 0: quantity must be greater than zero');
        });
    });

    describe('StripeCheckoutClient.createCheckout', () => {
        let client: StripeCheckoutClient;
        let fetchMock: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            client = new StripeCheckoutClient(mockConfig);

            // Mock the global fetch function
            fetchMock = vi.fn();
            global.fetch = fetchMock;
        });

        it('should successfully create a checkout and return secure URL', async () => {
            // Mock successful Stripe API response
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessfulCheckoutResponse,
            });

            const response = await client.createCheckout(validCheckoutRequest);

            expect(response.success).toBe(true);
            expect(response.checkoutUrl).toBe('https://checkout.stripe.com/c/pay/cs_test_mock_checkout_session_123#fidkdWxOYHw...');
            expect(response.amountCents).toBe(100000);
            expect(response.currency).toBe('USD');
            expect(response.checkoutSessionId).toBe('cs_test_mock_checkout_session_123');
        });

        it('CRITICAL TEST: should return valid checkout URL with $1000 limit enforced', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    ...mockSuccessfulCheckoutResponse,
                    url: 'https://checkout.stripe.com/c/pay/cs_test_1000_limit#fidkdWxOYHw...',
                    amount_total: MAX_AUTONOMOUS_PURCHASE_CENTS,
                }),
            });

            const maxLimitRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                lineItems: [
                    {
                        description: 'Maximum Autonomous Purchase',
                        amountCents: MAX_AUTONOMOUS_PURCHASE_CENTS,
                        quantity: 1,
                    },
                ],
            };

            const response = await client.createCheckout(maxLimitRequest);

            expect(response.success).toBe(true);
            expect(response.checkoutUrl).toBeTruthy();
            expect(response.amountCents).toBe(MAX_AUTONOMOUS_PURCHASE_CENTS);

            // Verify the session was created for exactly $1000
            expect(response.amountCents).toBe(100000);
        });

        it('should include correct headers in Stripe API call', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessfulCheckoutResponse,
            });

            await client.createCheckout(validCheckoutRequest);

            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/v1/checkout/sessions'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${mockConfig.secretKey}`,
                        'Content-Type': 'application/json',
                        'Stripe-Version': expect.any(String),
                    }),
                })
            );
        });

        it('should include line_items and metadata in API payload', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessfulCheckoutResponse,
            });

            await client.createCheckout(validCheckoutRequest);

            const callPayload = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(callPayload.mode).toBe('payment');
            expect(callPayload.line_items).toBeDefined();
            expect(callPayload.line_items.length).toBe(2);
            expect(callPayload.metadata.merchant_id).toBe(validCheckoutRequest.merchantId);
            expect(callPayload.metadata.agent_id).toBe('aegis-surgical-agent-v1');
        });

        it('should fail validation before making API call for over-limit requests', async () => {
            const overLimitRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                lineItems: [
                    {
                        description: 'Too Expensive',
                        amountCents: 200000, // $2000
                        quantity: 1,
                    },
                ],
            };

            const response = await client.createCheckout(overLimitRequest);

            expect(response.success).toBe(false);
            expect(response.errorCode).toBe('VALIDATION_FAILED');
            expect(response.error).toContain('exceeds autonomous purchase limit');

            // Verify fetch was NEVER called (validation stopped it)
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('should handle Stripe API errors gracefully', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 402,
                text: async () => 'Insufficient funds in network account',
            });

            const response = await client.createCheckout(validCheckoutRequest);

            expect(response.success).toBe(false);
            expect(response.errorCode).toBe('STRIPE_API_ERROR');
            expect(response.error).toContain('Stripe API error: 402');
        });

        it('should handle network errors', async () => {
            fetchMock.mockRejectedValueOnce(new Error('Network connection failed'));

            const response = await client.createCheckout(validCheckoutRequest);

            expect(response.success).toBe(false);
            expect(response.errorCode).toBe('STRIPE_API_ERROR');
            expect(response.error).toContain('Network connection failed');
        });

        it('FAILSAFE: should never include credentials in request payload', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessfulCheckoutResponse,
            });

            await client.createCheckout(validCheckoutRequest);

            const callPayload = JSON.parse(fetchMock.mock.calls[0][1].body);
            const payloadString = JSON.stringify(callPayload).toLowerCase();

            // Verify no credential fields are present
            expect(payloadString).not.toContain('cardnumber');
            expect(payloadString).not.toContain('cvv');
            expect(payloadString).not.toContain('accountnumber');
            expect(payloadString).not.toContain('routingnumber');
        });
    });

    describe('StripeCheckoutClient.completeCheckout', () => {
        let client: StripeCheckoutClient;
        let fetchMock: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            client = new StripeCheckoutClient(mockConfig);
            fetchMock = vi.fn();
            global.fetch = fetchMock;
        });

        it('should successfully retrieve a completed checkout session', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessfulCompleteResponse,
            });

            const response = await client.completeCheckout({
                checkoutSessionId: 'cs_test_mock_checkout_session_123',
                merchantConfirmation: 'cloud_compute_provisioned',
            });

            expect(response.success).toBe(true);
            expect(response.paymentIntentId).toBe('pi_test_mock_payment_intent_456');
            expect(response.capturedAmountCents).toBe(100000);
            expect(response.status).toBe('succeeded');
        });

        it('should require checkoutSessionId', async () => {
            const response = await client.completeCheckout({
                checkoutSessionId: '',
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('checkoutSessionId is required');
        });

        it('should handle completion errors gracefully', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: async () => 'Invalid or expired session',
            });

            const response = await client.completeCheckout({
                checkoutSessionId: 'cs_test_expired_session',
            });

            expect(response.success).toBe(false);
            expect(response.error).toContain('Stripe API error: 400');
        });
    });

    describe('Integration: Full Checkout Flow', () => {
        it('should complete full autonomous purchase workflow with Checkout Sessions', async () => {
            const client = new StripeCheckoutClient(mockConfig);
            const fetchMock = vi.fn();
            global.fetch = fetchMock;

            // Step 1: Create checkout session
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessfulCheckoutResponse,
            });

            const createResponse = await client.createCheckout({
                requestId: 'req_integration_test_001',
                lineItems: [
                    {
                        description: 'Crusoe Cloud GPU Cluster - 2 hours',
                        amountCents: 75000, // $750
                        quantity: 1,
                        sku: 'CRUSOE-GPU-H100',
                    },
                ],
                merchantId: 'merchant_crusoe_cloud',
                currency: 'USD',
                agentId: 'aegis-surgical-agent-v1',
            });

            expect(createResponse.success).toBe(true);
            expect(createResponse.checkoutUrl).toBeTruthy();
            expect(createResponse.amountCents).toBeLessThanOrEqual(MAX_AUTONOMOUS_PURCHASE_CENTS);

            // Step 2: Retrieve completed session
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessfulCompleteResponse,
            });

            const completeResponse = await client.completeCheckout({
                checkoutSessionId: createResponse.checkoutSessionId!,
                merchantConfirmation: 'gpu_cluster_allocated',
            });

            expect(completeResponse.success).toBe(true);
            expect(completeResponse.status).toBe('succeeded');
        });

        it('should handle idempotent retry with same requestId', async () => {
            const client = new StripeCheckoutClient(mockConfig);
            const fetchMock = vi.fn();
            global.fetch = fetchMock;

            const idempotentRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                requestId: 'req_idempotent_retry_001',
            };

            // First call succeeds
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessfulCheckoutResponse,
            });

            const firstResponse = await client.createCheckout(idempotentRequest);
            expect(firstResponse.success).toBe(true);

            // Second call with same requestId also succeeds (Stripe handles idempotency)
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessfulCheckoutResponse,
            });

            const secondResponse = await client.createCheckout(idempotentRequest);
            expect(secondResponse.success).toBe(true);
            expect(secondResponse.checkoutSessionId).toBe(firstResponse.checkoutSessionId);
        });

        it('FAILSAFE: should enforce limit even with maximum integer quantity', async () => {
            const highQuantityRequest: CreateCheckoutRequest = {
                ...validCheckoutRequest,
                lineItems: [
                    {
                        description: 'Cheap item with high quantity',
                        amountCents: 1, // $0.01
                        quantity: 10_000_001, // Total = $100,000.01 — exceeds limit
                    },
                ],
            };

            const result = validateCheckoutRequest(highQuantityRequest);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('exceeds autonomous purchase limit'))).toBe(true);
        });

        it('should handle HTTP 429 rate limit response gracefully', async () => {
            const client = new StripeCheckoutClient(mockConfig);
            const fetchMock = vi.fn();
            global.fetch = fetchMock;

            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 429,
                text: async () => 'Rate limit exceeded. Retry after 1 second.',
            });

            const response = await client.createCheckout(validCheckoutRequest);

            expect(response.success).toBe(false);
            expect(response.errorCode).toBe('STRIPE_API_ERROR');
            expect(response.error).toContain('429');
        });

        it('should handle HTTP 500 internal server error gracefully', async () => {
            const client = new StripeCheckoutClient(mockConfig);
            const fetchMock = vi.fn();
            global.fetch = fetchMock;

            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            });

            const response = await client.createCheckout(validCheckoutRequest);

            expect(response.success).toBe(false);
            expect(response.errorCode).toBe('STRIPE_API_ERROR');
        });

        it('FAILSAFE: should reject metadata containing nested credential-like values', () => {
            const nestedCredentialRequest = {
                ...validCheckoutRequest,
                metadata: {
                    note: 'Please charge cardNumber 4242424242424242',
                },
            };

            const result = validateCheckoutRequest(nestedCredentialRequest as CreateCheckoutRequest);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('cardNumber') || e.includes('SECURITY VIOLATION'))).toBe(true);
        });
    });
});
