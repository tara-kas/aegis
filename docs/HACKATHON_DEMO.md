# Stripe Checkout Sessions - Hackathon Demo Mode

## 🎯 Overview

This implementation uses Stripe's standard **Checkout Sessions API** instead of the Agentic Commerce Protocol (ACP) to demonstrate autonomous payment gateway provisioning during the hackathon. The AI agent autonomously generates secure payment URLs restricted to a $1000 limit without exposing credentials.

---

## ✅ What Changed from Production Plan

| Feature | Production (ACP) | Hackathon Demo |
|---------|-----------------|----------------|
| **API** | Agentic Commerce Protocol | Standard Checkout Sessions |
| **Token** | Shared Payment Token (SPT) | Checkout Session URL |
| **Network ID** | Required (`net_...`) | Not required |
| **Demo Value** | Agent provisioning with SPT | Agent generates secure payment gateway |
| **Access** | Private Preview only | Available in Test Mode |

---

## 🔐 Security Features (Unchanged)

✅ **FAILSAFE CHECK 1**: Payment credentials never exposed in payloads  
✅ **FAILSAFE CHECK 2**: Hard-coded $1000 autonomous purchase limit  
✅ **Validation**: All requests validated before API calls  
✅ **Credential Scanning**: Detects prohibited fields (cardNumber, cvv, etc.)

---

## 🚀 Quick Start

### 1. Environment Setup

Your `.env` file is already configured with test keys:

```bash
# Stripe Test Mode Keys (already in .env)
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY"
STRIPE_SECRET_KEY="sk_test_YOUR_SECRET_KEY"
```

### 2. Run Tests to Verify

```bash
npm test -- src/api/__tests__/stripe.test.ts
```

**Expected Output**:
```
✓ 23 tests passed
✓ CRITICAL TEST: should return valid checkout URL with $1000 limit enforced
✓ FAILSAFE: should never include credentials in request payload
```

### 3. Usage Example

```typescript
import { StripeCheckoutClient } from './api/stripe';

// Initialize client
const stripeClient = new StripeCheckoutClient({
  publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY,
  secretKey: process.env.STRIPE_SECRET_KEY,
});

// AI agent autonomously creates checkout session
const response = await stripeClient.createCheckout({
  requestId: 'req_hackathon_demo_001',
  lineItems: [
    {
      description: 'Crusoe Cloud GPU - 4 hours',
      amountCents: 80000, // $800
      quantity: 1,
      sku: 'CRUSOE-GPU-H100',
    },
  ],
  merchantId: 'merchant_crusoe_cloud',
  currency: 'USD',
  agentId: 'aegis-surgical-agent-v1',
  metadata: {
    hospitalId: 'hosp_beth_israel',
    procedureType: 'robotic_surgery_planning',
  },
});

if (response.success) {
  console.log('✅ Agent autonomously generated payment gateway!');
  console.log('Checkout URL:', response.checkoutUrl);
  console.log('Amount:', `$${response.amountCents! / 100}`);
  console.log('Session ID:', response.checkoutSessionId);
  
  // Agent presents this URL, proving autonomous negotiation
  // Human can complete payment at this secure Stripe-hosted URL
} else {
  console.error('❌ Failed:', response.error);
}
```

---

## 🎬 Hackathon Demo Script

### Demo Narrative

> **"Our Aegis surgical robot needs to lease additional GPU compute for a complex pre-operative planning session. Instead of requiring manual procurement, the AI agent autonomously negotiates and generates a secure Stripe payment gateway."**

### Live Demo Steps

1. **Show the Agent Request**
   ```typescript
   // Agent identifies need for GPU resources
   const procurementRequest = {
     lineItems: [
       {
         description: 'AWS GPU Cluster - Pre-op Planning',
         amountCents: 75000, // $750
         quantity: 1,
       },
     ],
     merchantId: 'merchant_aws_surgical',
     currency: 'USD',
     agentId: 'aegis-surgical-agent-v1',
   };
   ```

2. **Execute Autonomous Checkout**
   ```typescript
   const checkout = await stripeClient.createCheckout(procurementRequest);
   ```

3. **Highlight Security Checks**
   ```typescript
   // ✅ FAILSAFE: No credentials in payload
   // ✅ FAILSAFE: $750 under $1000 limit
   // ✅ Validation passed
   ```

4. **Show Generated Payment Gateway**
   ```typescript
   console.log('Agent-generated checkout URL:');
   console.log(checkout.checkoutUrl);
   // https://checkout.stripe.com/c/pay/cs_test_...
   ```

5. **Explain the Value**
   > "The agent autonomously provisioned this payment gateway without ever accessing or exposing the hospital's payment credentials. The session is locked to exactly $750 for AWS GPU services. A human can now complete payment at this secure URL."

---

## 🧪 Test Coverage

All 23 tests verify:

### Validation Tests (11 tests)
- ✅ Accepts valid requests
- ✅ Rejects requests exceeding $1000 limit
- ✅ Accepts exactly $1000
- ✅ Correctly calculates multi-item totals
- ✅ Detects prohibited credential fields
- ✅ Detects multiple prohibited fields
- ✅ Rejects zero/negative amounts
- ✅ Validates required fields
- ✅ Validates currency codes
- ✅ Validates line items
- ✅ Validates individual line item fields

### Integration Tests (12 tests)
- ✅ Creates checkout and returns secure URL
- ✅ **CRITICAL**: Returns valid URL with $1000 limit enforced
- ✅ Includes correct API headers
- ✅ Includes line items and metadata in payload
- ✅ Fails validation before API call for over-limit requests
- ✅ Handles Stripe API errors gracefully
- ✅ Handles network errors
- ✅ **FAILSAFE**: Never includes credentials in payload
- ✅ Retrieves completed checkout session
- ✅ Requires checkoutSessionId
- ✅ Handles completion errors gracefully
- ✅ Completes full autonomous workflow

---

## 📊 Key Metrics for Judges

| Metric | Value |
|--------|-------|
| **Test Coverage** | 23/23 tests passing (100%) |
| **Security Validations** | 2 critical failsafes |
| **Autonomous Limit** | $1000 hard-coded |
| **API Response Time** | ~200ms (mocked) |
| **Credential Exposure** | 0 instances (validated) |

---

## 🎓 Technical Architecture

```
┌─────────────────────────────────────────┐
│   AEGIS AI AGENT (Autonomous)           │
│   "I need GPU for surgery planning"     │
└───────────────┬─────────────────────────┘
                │
                │ createCheckout()
                ▼
┌─────────────────────────────────────────┐
│   VALIDATION LAYER                      │
│   1. Credential scan (FAILSAFE 1)       │
│   2. $1000 limit check (FAILSAFE 2)     │
│   3. Field validation                   │
└───────────────┬─────────────────────────┘
                │ ✅ Passed
                ▼
┌─────────────────────────────────────────┐
│   STRIPE CHECKOUT SESSIONS API          │
│   POST /v1/checkout/sessions            │
│   {                                     │
│     mode: 'payment',                    │
│     line_items: [...],                  │
│     metadata: { agent_id: '...' }       │
│   }                                     │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│   SECURE CHECKOUT URL RETURNED          │
│   https://checkout.stripe.com/c/pay/... │
│                                         │
│   ✅ Agent provisioned gateway          │
│   ✅ No credentials exposed             │
│   ✅ Amount locked to request           │
└─────────────────────────────────────────┘
```

---

## 🔄 Migration Path to Production ACP

When Stripe's ACP becomes available:

1. **Update environment variables**:
   ```bash
   VITE_STRIPE_NETWORK_ID="net_your_network_id"
   ```

2. **Switch to `StripeACPClient`**:
   - Endpoint: `/v1/checkout/sessions` → `/v1/acp/checkout_sessions`
   - Response: `url` → `shared_payment_token`
   - Add: `network_id` to payload

3. **Same security validations apply** (no code changes needed)

---

## 🐛 Troubleshooting

### Test Keys Not Working?

**Issue**: `Invalid API Key`  
**Solution**: Verify environment variables are loaded:
```bash
echo $STRIPE_SECRET_KEY  # Should show sk_test_...
```

If not loaded, restart your terminal or run:
```bash
source .env
```

### $1000 Limit Validation Failing?

**Issue**: Request accepted when it should fail  
**Solution**: Check line item calculation:
```typescript
const total = lineItems.reduce((sum, item) => 
  sum + (item.amountCents * item.quantity), 0
);

if (total > 100000) { // $1000.00 in cents
  throw new Error('Exceeds limit');
}
```

### Credential Detection False Positive?

**Issue**: Valid request flagged as containing credentials  
**Solution**: Avoid using field names like:
- `cardNumber`, `cvv`, `accountNumber`, `routingNumber`
- `password`, `apiKey`, `secretKey`

Use metadata or SKU fields for reference IDs instead.

---

## 📝 Hackathon Checklist

Before presenting:

- [x] All 23 tests passing (`npm test -- src/api/__tests__/stripe.test.ts`)
- [x] `.env` file configured with valid test keys
- [x] `.gitignore` updated to protect `.env`
- [x] Demo script prepared (5-minute narrative)
- [x] Live demo ready (paste code snippet into console)
- [ ] Slides prepared highlighting autonomous procurement value
- [ ] Backup: Screenshots of successful test runs

---

## 🏆 Demo Success Criteria

Your demo is successful if you can show:

1. ✅ **Agent autonomously generates checkout URL** (no human intervention)
2. ✅ **$1000 limit enforced** (show validation rejection for $1500 request)
3. ✅ **No credentials in payload** (show request logs proving FAILSAFE 1)
4. ✅ **Secure Stripe-hosted URL** (generated URL starts with `https://checkout.stripe.com`)
5. ✅ **Full test coverage** (23/23 tests passing)

---

## 🎉 Next Steps

After the hackathon:

1. **Production Integration**: Migrate to Stripe ACP when available
2. **Real Merchants**: Integrate with Crusoe Cloud, ElevenLabs APIs
3. **Audit Trail**: Send transaction metadata to Supabase for HIPAA compliance
4. **Monitoring**: Add Paid.ai telemetry to track autonomous purchases
5. **Alert System**: Notify hospital finance when agent makes purchases

---

**Good luck with your hackathon demo! 🚀**

For questions during demo:
- Implementation: See `src/api/stripe.ts`
- Tests: See `src/api/__tests__/stripe.test.ts`
- Environment: See `.env`
